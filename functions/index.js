/* eslint-disable max-len */
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getMessaging} = require("firebase-admin/messaging");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");

// Initialize Firebase Admin
initializeApp();

// ✅ FUNCTION 1: Enhanced Send Admin Notification with Individual User Support
exports.sendAdminNotification = onCall(async (request) => {
  try {
    const {data, auth} = request;

    console.log("🔍 Function called with context:", {
      auth: !!auth,
      uid: auth?.uid,
      email: auth?.token?.email,
    });

    // ✅ Enhanced authentication check with manual token support
    let authenticatedUid = null;

    if (auth) {
      // Standard authentication context
      authenticatedUid = auth.uid;
      console.log("✅ Standard auth context found:", authenticatedUid);
    } else {
      // ✅ Check for manual authorization header
      const authHeader = request.rawRequest?.headers?.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1];
        try {
          const decodedToken = await getAuth().verifyIdToken(idToken);
          authenticatedUid = decodedToken.uid;
          console.log(
              "✅ Manual token verification successful:",
              authenticatedUid,
          );
        } catch (tokenError) {
          console.error("❌ Manual token verification failed:", tokenError);
          throw new HttpsError(
              "unauthenticated",
              "Invalid authentication token",
          );
        }
      }
    }

    if (!authenticatedUid) {
      console.error("❌ No authentication context found");
      console.log("📋 Available context keys:", Object.keys(request));
      throw new HttpsError(
          "unauthenticated",
          "User must be authenticated to send notifications. Please ensure you are logged in.",
      );
    }

    console.log("✅ Authenticated user:", authenticatedUid);

    // ✅ Get admin user data to verify admin role
    const db = getFirestore();
    const adminDoc = await db.collection("Users").doc(authenticatedUid).get();

    console.log("📄 Admin document exists:", adminDoc.exists);

    if (!adminDoc.exists) {
      console.error("❌ User document not found for:", authenticatedUid);
      throw new HttpsError(
          "not-found",
          "User document not found. Please ensure your profile is set up correctly.",
      );
    }

    const adminData = adminDoc.data();
    console.log("📄 Admin data:", {
      isAdmin: adminData.isAdmin,
      email: adminData.email,
      fullName: adminData.fullName,
    });

    if (!adminData.isAdmin) {
      console.error("❌ User is not an admin:", authenticatedUid);
      throw new HttpsError(
          "permission-denied",
          "Only admins can send notifications. Current user is not an admin.",
      );
    }

    console.log("✅ Admin verification successful");

    // ✅ ENHANCED: Extract all notification data including navigation
    const {
      title,
      body,
      imageUrl,
      targetType,
      targetUsers,
      navigationType = "home",
      itemId = null,
    } = data;

    // Validate input
    if (!title || !body) {
      throw new HttpsError("invalid-argument", "Title and body are required");
    }

    console.log("📤 Preparing to send notification:", {
      title,
      targetType,
      targetUsers: targetUsers?.length || "all",
      navigationType,
      itemId,
      bodyLength: body.length,
    });

    let tokens = [];
    let result;

    // ✅ ENHANCED: Handle individual user targeting
    if (targetType === "individual" && targetUsers && targetUsers.length > 0) {
      console.log("🎯 Getting tokens for individual users:", targetUsers);

      const userDocs = await Promise.all(
          targetUsers.map((userId) => db.collection("Users").doc(userId).get()),
      );

      tokens = userDocs
          .filter((doc) => doc.exists && doc.data().fcmToken)
          .map((doc) => doc.data().fcmToken);

      console.log("📱 Found tokens for individual users:", tokens.length);

      if (tokens.length === 0) {
        throw new HttpsError(
            "not-found",
            "No valid FCM tokens found for selected users",
        );
      }

      // ✅ FIXED: Use proper FCM multicast for batch sending
      const messaging = getMessaging();
      let totalSuccess = 0;
      let totalFailure = 0;
      const batchSize = 500; // FCM limit

      // Process tokens in batches
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batchTokens = tokens.slice(i, i + batchSize);

        const message = {
          notification: {
            title: title,
            body: body,
            ...(imageUrl && {image: imageUrl}),
          },
          data: {
            type: "admin_notification",
            navigationType: navigationType,
            ...(itemId && {itemId: itemId.toString()}),
            title: title,
            body: body,
            action: "open_app",
            timestamp: Date.now().toString(),
            adminId: authenticatedUid,
            targetType: "individual",
          },
          android: {
            priority: "high",
            notification: {
              icon: "ic_notification",
              color: "#E53E3E",
              sound: "default",
              channelId: "servenest_admin_channel",
              priority: "high",
            },
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: title,
                  body: body,
                },
                sound: "default",
                badge: 1,
              },
            },
          },
          tokens: batchTokens,
        };

        try {
          const response = await messaging.sendEachForMulticast(message);
          totalSuccess += response.successCount;
          totalFailure += response.failureCount;

          console.log(
              `✅ Batch ${Math.floor(i / batchSize) + 1}: ${
                response.successCount
              } success, ${response.failureCount} failures`,
          );

          // Handle failed tokens (optional cleanup)
          if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                failedTokens.push(batchTokens[idx]);
                console.log(
                    "❌ Failed token:",
                    batchTokens[idx],
                    resp.error?.code,
                );
              }
            });

            // Optional: Remove invalid tokens from database
            await cleanupInvalidTokens(failedTokens);
          }
        } catch (batchError) {
          console.error("❌ Batch send error:", batchError);
          totalFailure += batchTokens.length;
        }
      }

      result = {
        success: true,
        sentCount: totalSuccess,
        failedCount: totalFailure,
        totalTokens: tokens.length,
        message: `Notification sent to ${totalSuccess} selected users successfully`,
        targetType: "individual",
        timestamp: new Date().toISOString(),
      };
    } else if (targetType === "all") {
      // ✅ Send to topic for all users
      const messaging = getMessaging();
      const message = {
        notification: {
          title: title,
          body: body,
          ...(imageUrl && {image: imageUrl}),
        },
        data: {
          type: "admin_notification",
          navigationType: navigationType,
          ...(itemId && {itemId: itemId.toString()}),
          title: title,
          body: body,
          action: "open_app",
          timestamp: Date.now().toString(),
          adminId: authenticatedUid,
        },
        android: {
          priority: "high",
          notification: {
            icon: "ic_notification",
            color: "#E53E3E",
            sound: "default",
            channelId: "servenest_admin_channel",
            priority: "high",
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: title,
                body: body,
              },
              sound: "default",
              badge: 1,
            },
          },
        },
        topic: "all_users",
      };

      const response = await messaging.send(message);
      console.log("✅ Admin notification sent to all users:", response);

      result = {
        success: true,
        messageId: response,
        sentTo: "all_users",
        message: "Notification sent to all users successfully",
        timestamp: new Date().toISOString(),
      };
    } else {
      // ✅ Send to specific user groups (customers, business_owners)
      let usersQuery;

      if (targetType === "customers") {
        usersQuery = db
            .collection("Users")
            .where("isAdmin", "!=", true)
            .where("fcmToken", "!=", null);
      } else if (targetType === "business_owners") {
        usersQuery = db
            .collection("Users")
            .where("businessOwner", "==", true)
            .where("fcmToken", "!=", null);
      } else {
        usersQuery = db.collection("Users").where("fcmToken", "!=", null);
      }

      const usersSnapshot = await usersQuery.get();
      tokens = [];

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();
        if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
        }
      });

      if (tokens.length === 0) {
        console.warn("⚠️ No FCM tokens found for target audience:", targetType);
        throw new HttpsError(
            "not-found",
            `No FCM tokens found for target audience: ${targetType}`,
        );
      }

      console.log(`📱 Found ${tokens.length} FCM tokens for ${targetType}`);

      // Process in batches for large token arrays
      const messaging = getMessaging();
      const batchSize = 500;
      let totalSuccess = 0;
      let totalFailure = 0;

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batchTokens = tokens.slice(i, i + batchSize);

        const message = {
          notification: {
            title: title,
            body: body,
            ...(imageUrl && {image: imageUrl}),
          },
          data: {
            type: "admin_notification",
            navigationType: navigationType,
            ...(itemId && {itemId: itemId.toString()}),
            title: title,
            body: body,
            action: "open_app",
            timestamp: Date.now().toString(),
            adminId: authenticatedUid,
            targetType: targetType,
          },
          android: {
            priority: "high",
            notification: {
              icon: "ic_notification",
              color: "#E53E3E",
              sound: "default",
              channelId: "servenest_admin_channel",
              priority: "high",
            },
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: title,
                  body: body,
                },
                sound: "default",
                badge: 1,
              },
            },
          },
          tokens: batchTokens,
        };

        const response = await messaging.sendEachForMulticast(message);
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        console.log(
            `✅ Batch ${Math.floor(i / batchSize) + 1}: ${
              response.successCount
            } successful, ${response.failureCount} failed`,
        );

        // Handle failed tokens
        if (response.failureCount > 0) {
          await cleanupFailedTokens(response.responses, batchTokens);
        }
      }

      result = {
        success: true,
        sentCount: totalSuccess,
        failedCount: totalFailure,
        totalTokens: tokens.length,
        message: `Notification sent to ${totalSuccess} users successfully`,
        targetType: targetType,
        timestamp: new Date().toISOString(),
      };
    }

    // ✅ Log the final result
    console.log("🎉 Function completed successfully:", result);

    return result;
  } catch (error) {
    console.error("❌ Error in sendAdminNotification:", error);

    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError(
          "internal",
          `Internal server error: ${error.message}`,
      );
    }
  }
});

// ✅ FUNCTION 2: Enhanced Chat Message Notifications
exports.sendChatNotification = onDocumentCreated(
    "Chats/{chatId}/messages/{messageId}",
    async (event) => {
      try {
        const messageData = event.data.data();
        const {chatId} = event.params;

        console.log("💬 New message in chat:", chatId, {
          sender: messageData.sender,
          recipient: messageData.recipientId,
          type: messageData.type,
        });

        // Skip if no recipient ID
        if (!messageData.recipientId) {
          console.log("No recipient ID found, skipping notification");
          return null;
        }

        // Skip if sender is the same as recipient
        if (messageData.sender === messageData.recipientId) {
          console.log("Sender and recipient are the same, skipping notification");
          return null;
        }

        const db = getFirestore();

        // Get recipient's data and FCM token
        const recipientDoc = await db
            .collection("Users")
            .doc(messageData.recipientId)
            .get();

        if (!recipientDoc.exists) {
          console.log("Recipient not found:", messageData.recipientId);
          return null;
        }

        const recipientData = recipientDoc.data();
        const fcmToken = recipientData.fcmToken;

        if (!fcmToken) {
          console.log("Recipient FCM token not found");
          return null;
        }

        // Get sender's data
        const senderDoc = await db
            .collection("Users")
            .doc(messageData.sender)
            .get();
        const senderData = senderDoc.exists ? senderDoc.data() : null;
        const senderName = senderData?.fullName || senderData?.name || "Someone";

        // Prepare notification content
        let notificationBody;
        if (messageData.type === "image") {
          notificationBody = "📷 Image";
        } else {
          notificationBody =
          messageData.content && messageData.content.length > 50 ?
            messageData.content.substring(0, 50) + "..." :
            messageData.content || "New message";
        }

        // Send notification
        const messaging = getMessaging();
        const message = {
          notification: {
            title: `New message from ${senderName}`,
            body: notificationBody,
          },
          data: {
            type: "chat_message",
            chatId: chatId,
            senderId: messageData.sender,
            senderName: senderName,
            action: "open_chat",
            timestamp: Date.now().toString(),
          },
          android: {
            priority: "high",
            notification: {
              icon: "ic_notification",
              color: "#E53E3E",
              sound: "default",
              channelId: "servenest_chat_channel",
              priority: "high",
            },
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: `New message from ${senderName}`,
                  body: notificationBody,
                },
                sound: "default",
                badge: 1,
              },
            },
          },
          token: fcmToken,
        };

        const response = await messaging.send(message);
        console.log("✅ Chat notification sent successfully:", response);

        return response;
      } catch (error) {
        console.error("❌ Error sending chat notification:", error);
        return null;
      }
    },
);

// ✅ FUNCTION 3: Clean up invalid FCM tokens
exports.cleanupTokens = onCall(async (request) => {
  try {
    const {auth} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    console.log("🧹 Starting token cleanup process");

    const db = getFirestore();

    // Get all users with FCM tokens
    const usersSnapshot = await db
        .collection("Users")
        .where("fcmToken", "!=", null)
        .get();

    const tokens = [];
    const userTokenMap = {};

    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data();
      if (userData.fcmToken) {
        tokens.push(userData.fcmToken);
        userTokenMap[userData.fcmToken] = doc.id;
      }
    });

    console.log(`📱 Found ${tokens.length} tokens to validate`);

    if (tokens.length === 0) {
      return {success: true, message: "No tokens to cleanup"};
    }

    // Test tokens by sending a dry-run message
    const messaging = getMessaging();
    const testMessage = {
      data: {
        test: "token_validation",
      },
      tokens: tokens,
      dryRun: true,
    };

    const response = await messaging.sendEachForMulticast(testMessage);
    let cleanedCount = 0;

    // Remove invalid tokens
    const batch = db.batch();

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errorCode = resp.error.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          const invalidToken = tokens[idx];
          const userId = userTokenMap[invalidToken];
          if (userId) {
            const userRef = db.collection("Users").doc(userId);
            batch.update(userRef, {fcmToken: FieldValue.delete()});
            cleanedCount++;
          }
        }
      }
    });

    if (cleanedCount > 0) {
      await batch.commit();
      console.log(`🧹 Cleaned up ${cleanedCount} invalid tokens`);
    }

    return {
      success: true,
      message: `Token cleanup completed. Removed ${cleanedCount} invalid tokens.`,
      totalTokens: tokens.length,
      cleanedTokens: cleanedCount,
    };
  } catch (error) {
    console.error("❌ Error cleaning up tokens:", error);
    throw new HttpsError("internal", error.message);
  }
});

// ✅ FUNCTION 4: Subscribe user to topics
exports.subscribeToTopic = onCall(async (request) => {
  try {
    const {data, auth} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {token, topic} = data;

    if (!token || !topic) {
      throw new HttpsError("invalid-argument", "Token and topic are required");
    }

    const messaging = getMessaging();
    await messaging.subscribeToTopic([token], topic);
    console.log(`✅ Subscribed token to topic: ${topic}`);

    return {success: true, message: `Subscribed to ${topic} successfully`};
  } catch (error) {
    console.error("❌ Error subscribing to topic:", error);
    throw new HttpsError("internal", error.message);
  }
});

// ✅ Helper function to cleanup invalid tokens
/**
 * Cleans up invalid FCM tokens by removing them from Firestore.
 * @param {string[]} failedTokens - List of failed token strings
 */
async function cleanupInvalidTokens(failedTokens) {
  if (failedTokens.length === 0) return;

  const db = getFirestore();
  const batch = db.batch();

  try {
    // Find users with these tokens and remove them
    const usersSnapshot = await db
        .collection("Users")
        .where("fcmToken", "in", failedTokens.slice(0, 10)) // Firestore 'in' limit
        .get();

    usersSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {fcmToken: null});
    });

    await batch.commit();
    console.log(`🧹 Cleaned up ${usersSnapshot.size} invalid tokens`);
  } catch (cleanupError) {
    console.error("❌ Token cleanup error:", cleanupError);
  }
}
/**
 * Cleans up failed FCM tokens by checking responses and deleting them from Firestore.
 * @param {object[]} responses - FCM response objects
 * @param {string[]} tokens - Corresponding token list
 */
async function cleanupFailedTokens(responses, tokens) {
  const db = getFirestore();
  const batch = db.batch();
  let cleanedCount = 0;

  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    if (!response.success && response.error) {
      const errorCode = response.error.code;
      if (
        errorCode === "messaging/invalid-registration-token" ||
        errorCode === "messaging/registration-token-not-registered"
      ) {
        const invalidToken = tokens[i];

        // Find user with this token and remove it
        const usersSnapshot = await db
            .collection("Users")
            .where("fcmToken", "==", invalidToken)
            .limit(1)
            .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          batch.update(userDoc.ref, {
            fcmToken: FieldValue.delete(),
          });
          cleanedCount++;
        }
      }
    }
  }

  if (cleanedCount > 0) {
    await batch.commit();
    console.log(`🧹 Cleaned up ${cleanedCount} failed tokens`);
  }
}
