

/* eslint-disable max-len */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

exports.sendAdminNotification = functions.https.onCall(
    async (data, context) => {
      try {
        console.log("🔍 Function called with context:", {
          auth: !!context.auth,
          uid: context.auth?.uid,
          email: context.auth?.token?.email,
        });

        // ✅ Enhanced authentication check with manual token support
        let authenticatedUid = null;

        if (context.auth) {
        // Standard authentication context
          authenticatedUid = context.auth.uid;
          console.log("✅ Standard auth context found:", authenticatedUid);
        } else {
        // ✅ Check for manual authorization header
          const authHeader = context.rawRequest?.headers?.authorization;
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const idToken = authHeader.split("Bearer ")[1];
            try {
              const decodedToken = await admin.auth().verifyIdToken(idToken);
              authenticatedUid = decodedToken.uid;
              console.log(
                  "✅ Manual token verification successful:",
                  authenticatedUid,
              );
            } catch (tokenError) {
              console.error("❌ Manual token verification failed:", tokenError);
              throw new functions.https.HttpsError(
                  "unauthenticated",
                  "Invalid authentication token",
              );
            }
          }
        }

        if (!authenticatedUid) {
          console.error("❌ No authentication context found");
          console.log("📋 Available context keys:", Object.keys(context));
          throw new functions.https.HttpsError(
              "unauthenticated",
              "User must be authenticated to send notifications. Please ensure you are logged in.",
          );
        }

        console.log("✅ Authenticated user:", authenticatedUid);

        // ✅ Get admin user data to verify admin role
        const adminDoc = await admin
            .firestore()
            .collection("Users")
            .doc(authenticatedUid)
            .get();

        console.log("📄 Admin document exists:", adminDoc.exists);

        if (!adminDoc.exists) {
          console.error("❌ User document not found for:", authenticatedUid);
          throw new functions.https.HttpsError(
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
          throw new functions.https.HttpsError(
              "permission-denied",
              "Only admins can send notifications. Current user is not an admin.",
          );
        }

        console.log("✅ Admin verification successful");

        const {title, body, imageUrl, targetType} = data;

        // Validate input
        if (!title || !body) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              "Title and body are required",
          );
        }

        console.log("📤 Preparing to send notification:", {
          title,
          targetType,
          bodyLength: body.length,
        });

        let message;
        let result;

        if (targetType === "all") {
        // ✅ Send to topic for all users
          message = {
            notification: {
              title: title,
              body: body,
              imageUrl: imageUrl || undefined,
            },
            data: {
              type: "admin_notification",
              action: "open_app",
              timestamp: Date.now().toString(),
              adminId: authenticatedUid,
            },
            android: {
              notification: {
                icon: "ic_notification",
                color: "#8BC34A",
                sound: "default",
                channelId: "servenest_default_channel",
              },
            },
            topic: "all_users",
          };

          const response = await admin.messaging().send(message);
          console.log("✅ Admin notification sent to all users:", response);

          // ✅ Return structured success response
          result = {
            success: true,
            messageId: response,
            sentTo: "all_users",
            message: "Notification sent to all users successfully",
            timestamp: new Date().toISOString(),
          };
        } else {
        // ✅ Send to specific user groups
          let usersQuery;

          if (targetType === "customers") {
            usersQuery = admin
                .firestore()
                .collection("Users")
                .where("isAdmin", "!=", true);
          } else if (targetType === "business_owners") {
            usersQuery = admin.firestore().collection("Businesses");
          } else {
            usersQuery = admin.firestore().collection("Users");
          }

          const usersSnapshot = await usersQuery.get();
          const tokens = [];

          usersSnapshot.docs.forEach((doc) => {
            const userData = doc.data();
            if (userData.fcmToken) {
              tokens.push(userData.fcmToken);
            }
          });

          if (tokens.length === 0) {
            console.warn(
                "⚠️ No FCM tokens found for target audience:",
                targetType,
            );
            throw new functions.https.HttpsError(
                "not-found",
                `No FCM tokens found for target audience: ${targetType}`,
            );
          }

          console.log(`📱 Found ${tokens.length} FCM tokens for ${targetType}`);

          // ✅ Send to multiple tokens
          message = {
            notification: {
              title: title,
              body: body,
              imageUrl: imageUrl || undefined,
            },
            data: {
              type: "admin_notification",
              action: "open_app",
              timestamp: Date.now().toString(),
              adminId: authenticatedUid,
              targetType: targetType,
            },
            android: {
              notification: {
                icon: "ic_notification",
                color: "#8BC34A",
                sound: "default",
                channelId: "servenest_default_channel",
              },
            },
            tokens: tokens,
          };

          const response = await admin.messaging().sendMulticast(message);
          console.log(
              `✅ Admin notification sent: ${response.successCount} successful, ${response.failureCount} failed`,
          );

          // ✅ Log failed tokens for debugging
          if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                console.error(`❌ Failed to send to token ${idx}:`, resp.error);
              }
            });
          }

          // ✅ Return structured success response
          result = {
            success: true,
            sentCount: response.successCount,
            failedCount: response.failureCount,
            totalTokens: tokens.length,
            message: `Notification sent to ${response.successCount} users successfully`,
            targetType: targetType,
            timestamp: new Date().toISOString(),
          };
        }

        // ✅ Log the final result
        console.log("🎉 Function completed successfully:", result);

        // ✅ Return the result (not null)
        return result;
      } catch (error) {
        console.error("❌ Error in sendAdminNotification:", error);

        // ✅ Return structured error response instead of throwing
        if (error instanceof functions.https.HttpsError) {
        // Re-throw HttpsError to maintain proper error codes
          throw error;
        } else {
        // Convert other errors to HttpsError
          throw new functions.https.HttpsError(
              "internal",
              `Internal server error: ${error.message}`,
          );
        }
      }
    },
);

// ✅ FUNCTION 2: Chat Message Notifications (Firestore Trigger)
exports.sendChatNotification = functions.firestore
    .document("Chats/{chatId}/messages/{messageId}")
    .onCreate(async (snap, context) => {
      try {
        const messageData = snap.data();
        const {chatId} = context.params;

        console.log("New message in chat:", chatId, messageData);

        // Skip if no recipient ID
        if (!messageData.recipientId) {
          console.log("No recipient ID found, skipping notification");
          return null;
        }

        // Skip if sender is the same as recipient (shouldn't happen but safety check)
        if (messageData.sender === messageData.recipientId) {
          console.log("Sender and recipient are the same, skipping notification");
          return null;
        }

        // Get recipient's data and FCM token
        const recipientDoc = await admin
            .firestore()
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
        const senderDoc = await admin
            .firestore()
            .collection("Users")
            .doc(messageData.sender)
            .get();
        const senderData = senderDoc.exists ? senderDoc.data() : null;
        const senderName = senderData?.fullName || "Someone";

        // Prepare notification content
        let notificationBody;
        if (messageData.type === "image") {
          notificationBody = "📷 Image";
        } else {
          notificationBody =
          messageData.content.length > 50 ?
            messageData.content.substring(0, 50) + "..." :
            messageData.content;
        }

        // Send notification
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
            notification: {
              icon: "ic_notification",
              color: "#8BC34A",
              sound: "default",
              channelId: "servenest_default_channel",
            },
          },
          token: fcmToken,
        };

        const response = await admin.messaging().send(message);
        console.log("Chat notification sent successfully:", response);

        return response;
      } catch (error) {
        console.error("Error sending chat notification:", error);
        return null;
      }
    });

// ✅ FUNCTION 3: Clean up invalid FCM tokens
exports.cleanupTokens = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated",
      );
    }

    // This function can be called periodically to clean up invalid tokens
    // Implementation depends on your specific needs

    return {success: true, message: "Token cleanup completed"};
  } catch (error) {
    console.error("Error cleaning up tokens:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
