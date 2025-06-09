// ✅ FIXED: Import modular APIs
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  subscribeToTopic,
} from '@react-native-firebase/messaging';
import {getApp} from '@react-native-firebase/app';
import {db, functions} from '../../config/firebaseConfig';
import {doc, updateDoc, serverTimestamp} from 'firebase/firestore';
import {getAuth} from '@react-native-firebase/auth';
import PushNotification from 'react-native-push-notification';
import {Platform} from 'react-native';
import {httpsCallable} from 'firebase/functions';

export class DirectNotificationService {
  static _authToken = null;
  static _app = null;
  static _messaging = null;
  static _auth = null;
  static _messageListener = null; // ✅ Track listener for cleanup
  static _tokenRefreshListener = null;
  static _notificationOpenedListener = null;

  // ✅ Initialize Firebase app and services with modular API
  static initializeFirebaseServices() {
    try {
      this._app = getApp();
      this._messaging = getMessaging(this._app);
      this._auth = getAuth(this._app);
      console.log(
        '✅ DirectNotificationService - Firebase services initialized',
      );
    } catch (error) {
      console.error(
        '❌ DirectNotificationService - Error initializing Firebase services:',
        error,
      );
    }
  }

  static initializePushNotification() {
    PushNotification.configure({
      onNotification: function (notification) {
        console.log(
          'DirectNotificationService - Notification clicked:',
          notification,
        );
        // ✅ Only handle admin notifications
        if (notification.userInfo?.type === 'admin_notification') {
          console.log('Admin notification clicked');
        }
      },
      requestPermissions: Platform.OS === 'ios',
    });

    PushNotification.createChannel(
      {
        channelId: 'servenest_default_channel',
        channelName: 'ServeNest Notifications',
        channelDescription: 'Default notification channel for ServeNest',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      created =>
        console.log(`DirectNotificationService - Channel created: ${created}`),
    );
  }

  static async subscribeToTopics() {
    try {
      if (!this._messaging) {
        this.initializeFirebaseServices();
      }

      await subscribeToTopic(this._messaging, 'all_users');
      console.log(
        '✅ DirectNotificationService - Subscribed to all_users topic',
      );

      const currentUser = this._auth?.currentUser;
      if (currentUser) {
        await subscribeToTopic(this._messaging, `user_${currentUser.uid}`);
        console.log(
          '✅ DirectNotificationService - Subscribed to user-specific topic',
        );
      }
    } catch (error) {
      console.error(
        'DirectNotificationService - Error subscribing to topics:',
        error,
      );
    }
  }

  static async initializeWebSDKAuth() {
    try {
      const currentUser = this._auth?.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();
      this._authToken = idToken;
      console.log(
        '🔧 DirectNotificationService - Web SDK auth context initialized',
      );

      if (this._tokenRefreshListener) {
        this._tokenRefreshListener();
      }

      this._tokenRefreshListener = onTokenRefresh(
        this._messaging,
        async newToken => {
          if (newToken) {
            const user = this._auth?.currentUser;
            if (user) {
              this._authToken = await user.getIdToken();
              console.log(
                '🔄 DirectNotificationService - Auth token refreshed',
              );
            }
          } else {
            this._authToken = null;
          }
        },
      );
    } catch (error) {
      console.error(
        'DirectNotificationService - Error initializing Web SDK auth:',
        error,
      );
    }
  }

  // ✅ FIXED: Only handle admin notifications, cleanup existing listeners
  static async initializeReceiver() {
    try {
      // ✅ Cleanup existing listeners first
      this.cleanup();

      this.initializeFirebaseServices();
      this.initializePushNotification();

      const authStatus = await this._messaging.requestPermission();
      const enabled = authStatus === 1 || authStatus === 2;

      if (!enabled) {
        console.log(
          'DirectNotificationService - Notification permission not granted',
        );
        return false;
      }

      const token = await getToken(this._messaging);
      console.log('✅ DirectNotificationService - FCM Token obtained:', token);

      const currentUser = this._auth?.currentUser;
      if (currentUser && token) {
        await this.saveTokenToUser(currentUser.uid, token);
        await this.subscribeToTopics();
        await this.initializeWebSDKAuth();
      }

      // ✅ FIXED: Only handle admin notifications
      if (this._messageListener) {
        this._messageListener();
      }

      this._messageListener = onMessage(this._messaging, remoteMessage => {
        console.log(
          '✅ DirectNotificationService - Foreground notification received:',
          remoteMessage,
        );

        // ✅ ONLY handle admin notifications, ignore chat messages
        if (remoteMessage.data?.type === 'admin_notification') {
          this.handleAdminNotification(remoteMessage);
        } else if (remoteMessage.data?.type === 'chat_message') {
          console.log(
            '🔄 DirectNotificationService - Skipping chat notification - handled by ChatNotificationService',
          );
        } else {
          // Handle other notification types (non-chat, non-admin)
          this.handleForegroundNotification(remoteMessage);
        }
      });

      // ✅ Only handle admin notifications when app opened
      if (this._notificationOpenedListener) {
        this._notificationOpenedListener();
      }

      this._notificationOpenedListener =
        this._messaging.onNotificationOpenedApp(remoteMessage => {
          console.log(
            '✅ DirectNotificationService - Notification opened app:',
            remoteMessage,
          );
          if (remoteMessage.data?.type === 'admin_notification') {
            this.handleNotificationOpen(remoteMessage);
          }
          // ✅ Don't handle chat notifications here
        });

      const initialNotification =
        await this._messaging.getInitialNotification();
      if (
        initialNotification &&
        initialNotification.data?.type === 'admin_notification'
      ) {
        console.log(
          '✅ DirectNotificationService - App opened from admin notification:',
          initialNotification,
        );
        this.handleNotificationOpen(initialNotification);
      }

      return true;
    } catch (error) {
      console.error(
        'DirectNotificationService - Error initializing FCM receiver:',
        error,
      );
      return false;
    }
  }

  // ✅ Cleanup method
  static cleanup() {
    console.log('🧹 DirectNotificationService - Cleaning up listeners...');

    if (this._messageListener) {
      this._messageListener();
      this._messageListener = null;
    }

    if (this._tokenRefreshListener) {
      this._tokenRefreshListener();
      this._tokenRefreshListener = null;
    }

    if (this._notificationOpenedListener) {
      this._notificationOpenedListener();
      this._notificationOpenedListener = null;
    }
  }

  // ✅ Handle admin notifications only
  static handleAdminNotification(remoteMessage) {
    try {
      PushNotification.localNotification({
        channelId: 'servenest_default_channel',
        title: remoteMessage.notification?.title || 'New Notification',
        message: remoteMessage.notification?.body || 'You have a new message',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        color: '#8BC34A',
        vibrate: true,
        playSound: true,
        soundName: 'default',
        userInfo: remoteMessage.data || {},
        tag: 'admin_notification',
        id: 'admin',
      });
    } catch (error) {
      console.error(
        'DirectNotificationService - Error showing admin notification:',
        error,
      );
    }
  }

  static handleForegroundNotification(remoteMessage) {
    try {
      const notificationType = remoteMessage.data?.type || 'general';

      // ✅ Skip chat notifications completely
      if (notificationType === 'chat_message') {
        console.log(
          '🔄 DirectNotificationService - Skipping chat notification',
        );
        return;
      }

      PushNotification.localNotification({
        channelId: 'servenest_default_channel',
        title: remoteMessage.notification?.title || 'New Notification',
        message: remoteMessage.notification?.body || 'You have a new message',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        color: '#8BC34A',
        vibrate: true,
        playSound: true,
        soundName: 'default',
        userInfo: remoteMessage.data || {},
        tag: `${notificationType}_${Date.now()}`,
        id: notificationType,
      });
    } catch (error) {
      console.error(
        'DirectNotificationService - Error showing local notification:',
        error,
      );
    }
  }

  static handleNotificationOpen(remoteMessage) {
    const {data} = remoteMessage;

    // ✅ Only handle admin notifications
    if (data?.type === 'admin_notification') {
      console.log(
        'DirectNotificationService - Navigate to home for admin notification',
      );
    }
    // ✅ Don't handle chat notifications
  }

  static async sendAdminNotification(notificationData) {
    try {
      console.log(
        '📤 DirectNotificationService - Calling Cloud Function for admin notification...',
      );

      const currentUser = this._auth?.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const idToken = await currentUser.getIdToken(true);
      const functionData = {
        title: notificationData.title,
        body: notificationData.body,
        imageUrl: notificationData.imageUrl,
        targetType: notificationData.targetType,
      };

      const result = await this.callFunctionWithManualAuth(
        'sendAdminNotification',
        functionData,
        idToken,
      );

      if (result && result.success !== false) {
        return {
          success: true,
          message: result.message || 'Notification sent successfully',
          sentCount: result.sentCount || 'All users',
        };
      } else {
        return result || {success: false, error: 'Unknown error'};
      }
    } catch (error) {
      console.error(
        '❌ DirectNotificationService - Error calling admin notification function:',
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async callFunctionWithManualAuth(functionName, data, idToken) {
    try {
      const projectId = 'justdial-92398';
      const region = 'us-central1';
      const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({data: data}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`,
        );
      }

      const result = await response.json();
      return result.result || result;
    } catch (error) {
      console.error(
        '❌ DirectNotificationService - Manual function call error:',
        error,
      );
      throw error;
    }
  }

  static async saveTokenToUser(userId, token) {
    try {
      await updateDoc(doc(db, 'Users', userId), {
        fcmToken: token,
        lastTokenUpdate: serverTimestamp(),
      });
      console.log(
        '✅ DirectNotificationService - FCM token saved to user document',
      );
    } catch (error) {
      console.error(
        '❌ DirectNotificationService - Error saving FCM token:',
        error,
      );
    }
  }
}
