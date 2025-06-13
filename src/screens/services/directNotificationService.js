// ✅ ENHANCED: Import navigation utilities
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  subscribeToTopic,
} from '@react-native-firebase/messaging';
import {getApp} from '@react-native-firebase/app';
import {db, functions} from '../../config/firebaseConfig';
import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import {getAuth} from '@react-native-firebase/auth';
import PushNotification from 'react-native-push-notification';
import {Platform, Linking} from 'react-native';
import {httpsCallable} from 'firebase/functions';

// ✅ NEW: Navigation reference for deep linking
let navigationRef = null;

export class DirectNotificationService {
  static _authToken = null;
  static _app = null;
  static _messaging = null;
  static _auth = null;
  static _messageListener = null;
  static _tokenRefreshListener = null;
  static _notificationOpenedListener = null;

  // ✅ NEW: Set navigation reference
  static setNavigationRef(ref) {
    navigationRef = ref;
    console.log('✅ Navigation reference set for DirectNotificationService');
  }

  // ✅ NEW: Deep link navigation mapping
  static NAVIGATION_ROUTES = {
    events: 'Events',
    event_details: 'EventsManagement',
    business: 'My Businesses',
    business_details: 'Details',
    donations: 'Donations',
    donation_details: 'DonationDetails',
    profile: 'Profile',
    home: 'Home',
    jobs: 'Jobs',
    help: 'Help & Support',
  };

  // ✅ NEW: Build deep link from notification data
  static buildDeepLinkFromNotificationData(data) {
    const navigationType = data?.navigationType;
    const itemId = data?.itemId;

    if (!navigationType) {
      console.log('No navigation type provided, opening home');
      return 'home';
    }

    // Validate navigation type
    if (!this.NAVIGATION_ROUTES[navigationType]) {
      console.warn('Invalid navigation type:', navigationType);
      return 'home';
    }

    return {
      route: this.NAVIGATION_ROUTES[navigationType],
      params: itemId
        ? {id: itemId, fromNotification: true}
        : {fromNotification: true},
    };
  }

  // ✅ NEW: Navigate to specific screen
  static navigateToScreen(navigationData) {
    if (!navigationRef) {
      console.warn('Navigation reference not set');
      return;
    }

    try {
      if (typeof navigationData === 'string') {
        // Simple route navigation
        if (navigationData === 'home') {
          navigationRef.navigate('Main', {screen: 'Home'});
        } else {
          navigationRef.navigate(navigationData);
        }
      } else {
        // Complex navigation with params
        const {route, params} = navigationData;

        // Handle drawer navigation
        if (
          [
            'Events',
            'Profile',
            'Jobs',
            'My Businesses',
            'Donations',
            'Help & Support',
          ].includes(route)
        ) {
          navigationRef.navigate('Main', {
            screen: route,
            params: params,
          });
        } else {
          // Handle stack navigation
          navigationRef.navigate(route, params);
        }
      }

      console.log('✅ Navigation successful:', navigationData);
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback to home
      navigationRef.navigate('Main', {screen: 'Home'});
    }
  }

  // ✅ ENHANCED: Initialize Firebase services
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

  static getProjectId() {
    try {
      if (!this._app) {
        this.initializeFirebaseServices();
      }
      return this._app?.options?.projectId || null;
    } catch (error) {
      console.error('❌ Error getting project ID:', error);
      return null;
    }
  }

  static initializePushNotification() {
    PushNotification.configure({
      onNotification: function (notification) {
        console.log(
          'DirectNotificationService - Notification clicked:',
          notification,
        );

        // ✅ ENHANCED: Handle notification tap with deep linking
        if (
          notification.userInteraction &&
          notification.userInfo?.type === 'admin_notification'
        ) {
          const navigationData =
            DirectNotificationService.buildDeepLinkFromNotificationData(
              notification.userInfo,
            );

          // Add delay to ensure navigation is ready
          setTimeout(() => {
            DirectNotificationService.navigateToScreen(navigationData);
          }, 1000);
        }
      },
      requestPermissions: Platform.OS === 'ios',
    });

    PushNotification.createChannel(
      {
        channelId: 'servenest_admin_channel',
        channelName: 'ServeNest Admin Notifications',
        channelDescription: 'Admin notifications for ServeNest users',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      created =>
        console.log(
          `DirectNotificationService - Admin channel created: ${created}`,
        ),
    );
  }

  // ✅ ENHANCED: Initialize receiver with deep linking
  static async initializeReceiver() {
    try {
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

      // ✅ ENHANCED: Handle foreground notifications with deep linking
      if (this._messageListener) {
        this._messageListener();
      }

      this._messageListener = onMessage(this._messaging, remoteMessage => {
        console.log(
          '✅ DirectNotificationService - Foreground notification received:',
          remoteMessage,
        );

        if (remoteMessage.data?.type === 'admin_notification') {
          this.handleAdminNotification(remoteMessage);
        } else if (remoteMessage.data?.type === 'chat_message') {
          console.log(
            '🔄 DirectNotificationService - Skipping chat notification',
          );
        } else {
          this.handleForegroundNotification(remoteMessage);
        }
      });

      // ✅ ENHANCED: Handle notification opened app with deep linking
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
            const navigationData = this.buildDeepLinkFromNotificationData(
              remoteMessage.data,
            );

            // Add delay to ensure app is fully loaded
            setTimeout(() => {
              this.navigateToScreen(navigationData);
            }, 2000);
          }
        });

      // ✅ ENHANCED: Handle initial notification with deep linking
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

        const navigationData = this.buildDeepLinkFromNotificationData(
          initialNotification.data,
        );

        // Add longer delay for cold start
        setTimeout(() => {
          this.navigateToScreen(navigationData);
        }, 3000);
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

  // ✅ ENHANCED: Handle admin notifications with navigation data
  static handleAdminNotification(remoteMessage) {
    try {
      const notificationData = remoteMessage.data || {};

      PushNotification.localNotification({
        channelId: 'servenest_admin_channel',
        title: remoteMessage.notification?.title || 'New Notification',
        message: remoteMessage.notification?.body || 'You have a new message',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        color: '#8BC34A',
        vibrate: true,
        playSound: true,
        soundName: 'default',
        userInfo: {
          ...notificationData,
          type: 'admin_notification',
        },
        tag: 'admin_notification',
        id: Date.now(),
      });
    } catch (error) {
      console.error(
        'DirectNotificationService - Error showing admin notification:',
        error,
      );
    }
  }

  // ✅ ENHANCED: Send admin notification with navigation support
  static async sendAdminNotification(notificationData) {
    try {
      console.log(
        '📤 DirectNotificationService - Sending admin notification with navigation...',
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
        targetUsers: notificationData.targetUsers || null,
        // ✅ NEW: Navigation data
        navigationType: notificationData.navigationType || 'home',
        itemId: notificationData.itemId || null,
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
        '❌ DirectNotificationService - Error sending admin notification:',
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ✅ NEW: Get user list for individual targeting
  static async getUserList() {
    try {
      const usersQuery = query(collection(db, 'Users'));
      const snapshot = await getDocs(usersQuery);

      const users = [];
      snapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmToken && userData.isActive !== false) {
          users.push({
            id: doc.id,
            name: userData.fullName || userData.name || 'Unknown User',
            email: userData.email || 'No email',
            isAdmin: userData.isAdmin || false,
          });
        }
      });

      return users;
    } catch (error) {
      console.error('Error fetching user list:', error);
      return [];
    }
  }

  // ... (rest of the existing methods remain the same)
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

  static handleForegroundNotification(remoteMessage) {
    try {
      const notificationType = remoteMessage.data?.type || 'general';

      if (notificationType === 'chat_message') {
        console.log(
          '🔄 DirectNotificationService - Skipping chat notification',
        );
        return;
      }

      PushNotification.localNotification({
        channelId: 'servenest_admin_channel',
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

  static async callFunctionWithManualAuth(functionName, data, idToken) {
    try {
      const projectId = this.getProjectId();
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
