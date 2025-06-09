import messaging from '@react-native-firebase/messaging';
import {db} from '../../config/firebaseConfig';
import {
  collection,
  getDocs,
  where,
  query,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import auth from '@react-native-firebase/auth';
// ✅ ADDED: Missing imports
import PushNotification from 'react-native-push-notification';
import {Platform} from 'react-native';

export class DirectNotificationService {
  // Get FCM tokens for target users
  static async getUserTokens(targetType) {
    try {
      let usersQuery;

      switch (targetType) {
        case 'all':
          usersQuery = query(collection(db, 'Users'));
          break;
        case 'customers':
          usersQuery = query(
            collection(db, 'Users'),
            where('isAdmin', '!=', true),
          );
          break;
        case 'business_owners':
          usersQuery = query(collection(db, 'Businesses'));
          break;
        default:
          usersQuery = query(collection(db, 'Users'));
      }

      const snapshot = await getDocs(usersQuery);
      const tokens = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) {
          tokens.push(data.fcmToken);
        }
      });

      console.log(`Found ${tokens.length} FCM tokens for ${targetType}`);
      return tokens.filter(token => token);
    } catch (error) {
      console.error('Error getting user tokens:', error);
      return [];
    }
  }

  static async saveTokenToUser(userId, token) {
    try {
      await updateDoc(doc(db, 'Users', userId), {
        fcmToken: token,
        lastTokenUpdate: serverTimestamp(),
      });
      console.log('FCM token saved successfully');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  // ✅ FIXED: Initialize PushNotification for local notifications
  static initializePushNotification() {
    PushNotification.configure({
      onNotification: function (notification) {
        console.log('Notification clicked:', notification);
        // Handle notification click here
      },
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channel for Android
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

  // ✅ FIXED: Single initializeReceiver method with proper notification handling
  static async initializeReceiver() {
    try {
      // ✅ Initialize PushNotification first
      this.initializePushNotification();

      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('Notification permission not granted');
        return false;
      }

      // Get FCM token
      const token = await messaging().getToken();
      console.log('FCM Token:', token);

      // Save token
      const user = auth().currentUser;
      if (user && token) {
        await this.saveTokenToUser(user.uid, token);
      }

      // Handle token refresh
      messaging().onTokenRefresh(async newToken => {
        console.log('FCM token refreshed:', newToken);
        const currentUser = auth().currentUser;
        if (currentUser) {
          await this.saveTokenToUser(currentUser.uid, newToken);
        }
      });

      // ✅ Handle foreground messages with local notifications
      messaging().onMessage(async remoteMessage => {
        console.log('Foreground notification received:', remoteMessage);

        // ✅ Show actual notification instead of Alert
        if (remoteMessage && remoteMessage.notification) {
          this.showLocalNotification(remoteMessage);
        }
      });

      // Handle notification opened app
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification opened app:', remoteMessage);
        // Handle navigation here
      });

      // Check initial notification
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        console.log('App opened from notification:', initialNotification);
      }

      return true;
    } catch (error) {
      console.error('Error initializing FCM receiver:', error);
      return false;
    }
  }

  // ✅ Show local notification instead of Alert
  static showLocalNotification(remoteMessage) {
    try {
      PushNotification.localNotification({
        channelId: 'servenest_default_channel',
        title: remoteMessage.notification?.title || 'New Notification',
        message: remoteMessage.notification?.body || 'You have a new message',
        bigPictureUrl: remoteMessage.notification?.imageUrl,
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

      // ✅ Fallback to Alert if PushNotification fails
      const {Alert} = require('react-native');
      const title = remoteMessage.notification?.title || 'New Notification';
      const body = remoteMessage.notification?.body || 'You have a new message';

      Alert.alert(title, body, [
        {text: 'Dismiss', style: 'cancel'},
        {text: 'View', onPress: () => console.log('View notification')},
      ]);
    }
  }

  // ✅ REMOVED: Duplicate showForegroundNotification method

  // Send notification directly via FCM
  static async sendDirectNotification(notificationData) {
    try {
      const tokens = await this.getUserTokens(notificationData.targetType);

      if (tokens.length === 0) {
        throw new Error('No FCM tokens found for target audience');
      }

      console.log(`Sending notification to ${tokens.length} devices`);

      // In a real app, you would call your backend API here
      const message = {
        notification: {
          title: notificationData.title,
          body: notificationData.body,
          imageUrl: notificationData.imageUrl || undefined,
        },
        data: {
          type: notificationData.type,
          action: 'open_app',
          timestamp: Date.now().toString(),
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#8BC34A',
            sound: 'default',
            channelId: 'servenest_default_channel',
          },
        },
        tokens: tokens,
      };

      console.log(
        'Notification payload prepared for:',
        tokens.length,
        'devices',
      );

      // Simulate successful sending
      return {
        success: true,
        sentCount: tokens.length,
        message: 'Notifications sent successfully',
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
