import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  subscribeToTopic,
} from '@react-native-firebase/messaging';
import {getApp} from '@react-native-firebase/app';
import {db} from '../../config/firebaseConfig';
import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  getDocs,
} from 'firebase/firestore';
import {getAuth} from '@react-native-firebase/auth';
import PushNotification from 'react-native-push-notification';
import {Platform, AppState} from 'react-native';

// ✅ FIXED: Navigation reference for deep linking
let navigationRef = null;

export class DirectNotificationService {
  static _authToken = null;
  static _app = null;
  static _messaging = null;
  static _auth = null;
  static _messageListener = null;
  static _tokenRefreshListener = null;
  static _notificationOpenedListener = null;
  static _appStateListener = null;

  // ✅ FIXED: Set navigation reference
  static setNavigationRef(ref) {
    navigationRef = ref;
    console.log('✅ Navigation reference set for DirectNotificationService');
  }

  // ✅ FIXED: Correct navigation mapping based on your actual screens
  static NAVIGATION_ROUTES = {
    home: {screen: 'Main', params: {screen: 'Home'}},
    events: {screen: 'Main', params: {screen: 'Events'}},
    event_details: {screen: 'EventsManagement'},
    business: {screen: 'Main', params: {screen: 'My Businesses'}},
    business_details: {screen: 'Details'},
    donations: {screen: 'Main', params: {screen: 'Donations'}},
    donation_details: {screen: 'DonationDetails'},
    profile: {screen: 'Main', params: {screen: 'Profile'}},
    jobs: {screen: 'Main', params: {screen: 'Jobs'}},
    help: {screen: 'Main', params: {screen: 'Help & Support'}},
    chat: {screen: 'UserChat'},
  };

  // ✅ FIXED: Build deep link from notification data
  static buildDeepLinkFromNotificationData(data) {
    const navigationType = data?.navigationType || 'home';
    const itemId = data?.itemId;

    console.log('🔗 Building deep link:', {navigationType, itemId});

    // Get navigation config
    const navConfig = this.NAVIGATION_ROUTES[navigationType];
    if (!navConfig) {
      console.warn('❌ Invalid navigation type:', navigationType);
      return this.NAVIGATION_ROUTES['home'];
    }

    // Add item ID as parameter if provided
    if (itemId && navConfig.screen) {
      return {
        screen: navConfig.screen,
        params: {
          ...(navConfig.params || {}),
          id: itemId,
          eventId: itemId, // For events
          serviceId: itemId, // For business details
          donationId: itemId, // For donations
          fromNotification: true,
        },
      };
    }

    return navConfig;
  }

  // ✅ FIXED: Navigate to specific screen
  static navigateToScreen(navigationData) {
    if (!navigationRef) {
      console.warn('❌ Navigation reference not set');
      return;
    }

    try {
      console.log('🧭 Navigating to:', navigationData);

      if (navigationData.screen && navigationData.params) {
        // Complex navigation with nested params
        navigationRef.navigate(navigationData.screen, navigationData.params);
      } else if (navigationData.screen) {
        // Simple navigation
        navigationRef.navigate(navigationData.screen);
      } else {
        // Fallback to home
        navigationRef.navigate('Main', {screen: 'Home'});
      }

      console.log('✅ Navigation successful');
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback to home
      try {
        navigationRef.navigate('Main', {screen: 'Home'});
      } catch (fallbackError) {
        console.error('❌ Fallback navigation failed:', fallbackError);
      }
    }
  }

  // ✅ FIXED: Initialize Firebase services
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

  // ✅ FIXED: Initialize push notification with proper foreground handling
  static initializePushNotification() {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('📱 Push notification token registered:', token);
      },
      onNotification: function (notification) {
        if (notification.userInteraction) {
          const navType =
            notification.userInfo?.navigationType ||
            notification.navigationType;
          const itemId = notification.userInfo?.itemId || notification.itemId;
          const navigationData =
            DirectNotificationService.buildDeepLinkFromNotificationData({
              navigationType: navType,
              itemId: itemId,
            });
          setTimeout(() => {
            DirectNotificationService.navigateToScreen(navigationData);
          }, 500);
        }
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels
    this.createNotificationChannels();
  }

  // ✅ FIXED: Create notification channels
  static createNotificationChannels() {
    if (Platform.OS === 'android') {
      // Admin notifications channel with high priority
      PushNotification.createChannel(
        {
          channelId: 'servenest_admin_channel',
          channelName: 'ServeNest Admin Notifications',
          channelDescription: 'Important notifications from ServeNest admin',
          soundName: 'default',
          importance: 4, // High importance
          vibrate: true,
          playSound: true,
        },
        created =>
          console.log(`✅ Admin notification channel created: ${created}`),
      );

      // Events notifications channel
      PushNotification.createChannel(
        {
          channelId: 'servenest_events_channel',
          channelName: 'ServeNest Events',
          channelDescription: 'Event notifications and updates',
          soundName: 'default',
          importance: 4,
          vibrate: true,
          playSound: true,
        },
        created =>
          console.log(`✅ Events notification channel created: ${created}`),
      );
    }
  }

  // ✅ FIXED: Initialize receiver with proper foreground handling
  static async initializeReceiver() {
    try {
      this.cleanup();
      this.initializeFirebaseServices();
      this.initializePushNotification();

      const authStatus = await this._messaging.requestPermission();
      const enabled = authStatus === 1 || authStatus === 2;

      if (!enabled) {
        console.log(
          '❌ DirectNotificationService - Notification permission not granted',
        );
        return false;
      }

      const token = await getToken(this._messaging);
      console.log('✅ DirectNotificationService - FCM Token obtained');

      const currentUser = this._auth?.currentUser;
      if (currentUser && token) {
        await this.saveTokenToUser(currentUser.uid, token);
        await this.subscribeToTopics();
        await this.initializeWebSDKAuth();
      }

      // ✅ CRITICAL: Handle foreground notifications - ALWAYS show local notification
      if (this._messageListener) {
        this._messageListener();
      }

      this._messageListener = onMessage(this._messaging, remoteMessage => {
        console.log(
          '🔔 DirectNotificationService - Foreground notification received:',
          remoteMessage,
        );

        // ✅ ALWAYS show local notification for foreground messages
        const data = remoteMessage.data || {};
        PushNotification.localNotification({
          channelId: 'servenest_admin_channel',
          title:
            remoteMessage.notification?.title || data.title || 'Notification',
          message: remoteMessage.notification?.body || data.body || 'Message',
          userInfo: {...data, type: data.type || 'admin_notification'},
          // Pass navigationType and itemId for routing
          navigationType: data.navigationType,
          itemId: data.itemId,
          playSound: true,
          soundName: 'default',
          importance: 'high',
          priority: 'high',
          autoCancel: true,
        });
      });

      // ✅ FIXED: Handle notification opened app
      if (this._notificationOpenedListener) {
        this._notificationOpenedListener();
      }

      this._notificationOpenedListener =
        this._messaging.onNotificationOpenedApp(remoteMessage => {
          console.log(
            '✅ DirectNotificationService - Notification opened app:',
            remoteMessage,
          );

          const data = remoteMessage.data || {};
          const navigationData = this.buildDeepLinkFromNotificationData({
            navigationType: data.navigationType,
            itemId: data.itemId,
          });
          setTimeout(() => {
            this.navigateToScreen(navigationData);
          }, 1000);
        });

      // ✅ FIXED: Handle initial notification (app opened from notification)
      const initialNotification =
        await this._messaging.getInitialNotification();
      if (initialNotification && initialNotification.data?.navigationType) {
        const navigationData = this.buildDeepLinkFromNotificationData({
          navigationType: initialNotification.data.navigationType,
          itemId: initialNotification.data.itemId,
        });
        setTimeout(() => {
          this.navigateToScreen(navigationData);
        }, 2000);
      }
      // App state listener
      this._appStateListener = AppState.addEventListener(
        'change',
        nextAppState => {
          if (nextAppState === 'active') {
            PushNotification.setApplicationIconBadgeNumber(0);
          }
        },
      );

      return true;
    } catch (error) {
      console.error(
        '❌ DirectNotificationService - Error initializing FCM receiver:',
        error,
      );
      return false;
    }
  }

  // ✅ FIXED: Show foreground admin notification with proper channel
  static showForegroundAdminNotification(remoteMessage) {
    try {
      const notificationData = remoteMessage.data || {};
      const notification = remoteMessage.notification || {};

      console.log('🔔 Showing foreground admin notification:', {
        title: notification.title,
        body: notification.body,
        navigationType: notificationData.navigationType,
        itemId: notificationData.itemId,
      });

      // Determine channel based on navigation type
      const channelId = notificationData.navigationType?.includes('event')
        ? 'servenest_events_channel'
        : 'servenest_admin_channel';

      PushNotification.localNotification({
        channelId: channelId,
        title: notification.title || 'New Notification',
        message: notification.body || 'You have a new message',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        color: '#FF4500',
        vibrate: true,
        playSound: true,
        soundName: 'default',
        userInfo: {
          ...notificationData,
          type: 'admin_notification',
        },
        tag: `admin_notification_${Date.now()}`,
        id: Date.now(),
        importance: 'high',
        priority: 'high',
        autoCancel: true,
        ongoing: false,
        // ✅ CRITICAL: Ensure notification shows in foreground
        ignoreInForeground: false,
      });

      // Update app badge
      PushNotification.setApplicationIconBadgeNumber(1);

      console.log('✅ Foreground notification displayed');
    } catch (error) {
      console.error('❌ Error showing foreground admin notification:', error);
    }
  }

  // ✅ FIXED: Show foreground general notification
  static showForegroundGeneralNotification(remoteMessage) {
    try {
      const notificationData = remoteMessage.data || {};
      const notification = remoteMessage.notification || {};

      PushNotification.localNotification({
        channelId: 'servenest_admin_channel',
        title: notification.title || 'New Notification',
        message: notification.body || 'You have a new message',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        color: '#FF4500',
        vibrate: true,
        playSound: true,
        soundName: 'default',
        userInfo: {
          ...notificationData,
          type: 'general_notification',
        },
        tag: `general_notification_${Date.now()}`,
        id: Date.now(),
        autoCancel: true,
        ignoreInForeground: false,
      });
    } catch (error) {
      console.error('❌ Error showing foreground general notification:', error);
    }
  }

  // ✅ FIXED: Send admin notification with proper navigation data
  static async sendAdminNotification(notificationData) {
    try {
      console.log(
        '📤 DirectNotificationService - Sending admin notification:',
        notificationData,
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
        // ✅ CRITICAL: Navigation data
        navigationType: notificationData.navigationType || 'home',
        itemId: notificationData.itemId || null,
      };

      console.log('📤 Sending with data:', functionData);

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

  // ✅ Rest of the methods remain the same...
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

    if (this._appStateListener) {
      this._appStateListener.remove();
      this._appStateListener = null;
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
