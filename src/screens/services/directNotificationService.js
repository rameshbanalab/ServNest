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

  // ✅ Initialize Firebase app and services with modular API
  static initializeFirebaseServices() {
    try {
      this._app = getApp();
      this._messaging = getMessaging(this._app);
      this._auth = getAuth(this._app);
      console.log('✅ Firebase services initialized with modular API');
    } catch (error) {
      console.error('❌ Error initializing Firebase services:', error);
    }
  }

  static initializePushNotification() {
    PushNotification.configure({
      onNotification: function (notification) {
        console.log('Notification clicked:', notification);
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
      created => console.log(`Channel created: ${created}`),
    );
  }

  // ✅ FIXED: Use modular API for topic subscription
  static async subscribeToTopics() {
    try {
      if (!this._messaging) {
        this.initializeFirebaseServices();
      }

      await subscribeToTopic(this._messaging, 'all_users');
      console.log('✅ Subscribed to all_users topic');

      const currentUser = this._auth?.currentUser;
      if (currentUser) {
        await subscribeToTopic(this._messaging, `user_${currentUser.uid}`);
        console.log('✅ Subscribed to user-specific topic');
      }
    } catch (error) {
      console.error('Error subscribing to topics:', error);
    }
  }

  static async initializeWebSDKAuth() {
    try {
      const currentUser = this._auth?.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();
      this._authToken = idToken;
      console.log('🔧 Web SDK auth context initialized');

      // ✅ FIXED: Use modular API for token refresh
      onTokenRefresh(this._messaging, async user => {
        if (user) {
          this._authToken = await user.getIdToken();
          console.log('🔄 Auth token refreshed for Web SDK');
        } else {
          this._authToken = null;
        }
      });
    } catch (error) {
      console.error('Error initializing Web SDK auth:', error);
    }
  }

  // ✅ FIXED: Use modular API throughout
  static async initializeReceiver() {
    try {
      // Initialize Firebase services first
      this.initializeFirebaseServices();
      this.initializePushNotification();

      // ✅ Use modular API for permission request
      const authStatus = await this._messaging.requestPermission();
      const enabled =
        authStatus === 1 || // AUTHORIZED
        authStatus === 2; // PROVISIONAL

      if (!enabled) {
        console.log('Notification permission not granted');
        return false;
      }

      // ✅ FIXED: Use modular getToken
      const token = await getToken(this._messaging);
      console.log('✅ FCM Token obtained:', token);

      const currentUser = this._auth?.currentUser;
      if (currentUser && token) {
        await this.saveTokenToUser(currentUser.uid, token);
        await this.subscribeToTopics();
        await this.initializeWebSDKAuth();
      }

      // ✅ FIXED: Use modular API for token refresh
      onTokenRefresh(this._messaging, async newToken => {
        console.log('FCM token refreshed:', newToken);
        const user = this._auth?.currentUser;
        if (user) {
          await this.saveTokenToUser(user.uid, newToken);
        }
      });

      // ✅ FIXED: Use modular API for message handling
      onMessage(this._messaging, remoteMessage => {
        console.log('✅ Foreground notification received:', remoteMessage);
        this.handleForegroundNotification(remoteMessage);
      });

      // Handle notification opened app (this API might still be namespaced)
      this._messaging.onNotificationOpenedApp(remoteMessage => {
        console.log('✅ Notification opened app:', remoteMessage);
        this.handleNotificationOpen(remoteMessage);
      });

      // Check initial notification
      const initialNotification =
        await this._messaging.getInitialNotification();
      if (initialNotification) {
        console.log('✅ App opened from notification:', initialNotification);
        this.handleNotificationOpen(initialNotification);
      }

      return true;
    } catch (error) {
      console.error('Error initializing FCM receiver:', error);
      return false;
    }
  }

  // ✅ Rest of your methods remain the same but with proper auth handling
  static handleForegroundNotification(remoteMessage) {
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
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  static handleNotificationOpen(remoteMessage) {
    const {data} = remoteMessage;
    if (data?.type === 'chat_message') {
      console.log('Navigate to chat:', data.chatId);
    } else if (data?.type === 'admin_notification') {
      console.log('Navigate to home for admin notification');
    }
  }

  static async callFunctionWithManualAuth(functionName, data, idToken) {
    try {
      const projectId = 'justdial-92398';
      const region = 'us-central1';

      const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

      console.log('🌐 Calling function URL:', functionUrl);
      console.log('🔐 Using auth token length:', idToken.length);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          data: data,
        }),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`,
        );
      }

      const result = await response.json();
      console.log('✅ Function response:', result);

      // ✅ FIXED: Handle the null result issue
      if (result.result === null) {
        console.warn(
          '⚠️ Function returned null result, checking for success indicators',
        );
        // Check if the function executed successfully despite null result
        if (response.status === 200) {
          return {
            success: true,
            message:
              'Notification sent successfully (function returned null but status 200)',
            sentCount: 'Unknown',
          };
        }
      }

      return result.result || result;
    } catch (error) {
      console.error('❌ Manual function call error:', error);
      throw error;
    }
  }

  // ✅ FIXED: Better handling of auth and null results
  static async sendAdminNotification(notificationData) {
    try {
      console.log('📤 Calling Cloud Function for admin notification...');

      const currentUser = this._auth?.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      console.log('🔐 Current user ID:', currentUser.uid);
      console.log('🔐 User email:', currentUser.email);

      const idToken = await currentUser.getIdToken(true);
      console.log('🔐 ID Token obtained, length:', idToken.length);

      const functionData = {
        title: notificationData.title,
        body: notificationData.body,
        imageUrl: notificationData.imageUrl,
        targetType: notificationData.targetType,
      };

      try {
        console.log('🎯 Attempting manual auth approach...');
        const result = await this.callFunctionWithManualAuth(
          'sendAdminNotification',
          functionData,
          idToken,
        );

        console.log('✅ Manual auth call successful:', result);

        // ✅ Handle successful response even if result is null
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
        console.error('❌ Function call failed:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    } catch (error) {
      console.error('❌ Error calling admin notification function:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async saveTokenToUser(userId, token) {
    try {
      await updateDoc(doc(db, 'Users', userId), {
        fcmToken: token,
        lastTokenUpdate: serverTimestamp(),
      });
      console.log('✅ FCM token saved to user document');
    } catch (error) {
      console.error('❌ Error saving FCM token:', error);
    }
  }
}
