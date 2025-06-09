import messaging from '@react-native-firebase/messaging';
import {db} from '../../config/firebaseConfig';
import {doc, getDoc} from 'firebase/firestore';
import PushNotification from 'react-native-push-notification';

export class ChatNotificationService {
  static async sendMessageNotification({
    recipientId,
    senderName,
    messageContent,
    chatId,
    senderId,
  }) {
    try {
      // Get recipient's FCM token for logging purposes
      const recipientDoc = await getDoc(doc(db, 'Users', recipientId));

      if (!recipientDoc.exists()) {
        console.log('Recipient not found');
        return {success: false, error: 'Recipient not found'};
      }

      const recipientData = recipientDoc.data();
      const fcmToken = recipientData.fcmToken;

      if (!fcmToken) {
        console.log('Recipient FCM token not found');
        return {success: false, error: 'FCM token not found'};
      }

      // ✅ Cloud Function will automatically handle this when message is created
      console.log('=== CHAT NOTIFICATION INFO ===');
      console.log('To:', recipientData.fullName);
      console.log('From:', senderName);
      console.log('Message:', messageContent);
      console.log('Chat ID:', chatId);
      console.log('Cloud Function will handle notification automatically');
      console.log('==============================');

      return {
        success: true,
        message: 'Cloud Function will handle notification automatically',
      };
    } catch (error) {
      console.error('Error in chat notification service:', error);
      return {success: false, error: error.message};
    }
  }

  // Initialize chat notifications listener
  static async initializeChatNotifications() {
    try {
      console.log('Initializing chat notification listeners...');

      // Handle foreground chat notifications
      messaging().onMessage(async remoteMessage => {
        console.log('Chat notification received in foreground:', remoteMessage);

        if (remoteMessage.data?.type === 'chat_message') {
          this.handleChatNotification(remoteMessage);
        }
      });

      // Handle notification opened app
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Chat notification opened app:', remoteMessage);

        if (remoteMessage.data?.type === 'chat_message') {
          this.navigateToChat(remoteMessage.data);
        }
      });

      // Check if app was opened from chat notification
      const initialNotification = await messaging().getInitialNotification();
      if (
        initialNotification &&
        initialNotification.data?.type === 'chat_message'
      ) {
        console.log('App opened from chat notification:', initialNotification);
        this.navigateToChat(initialNotification.data);
      }

      console.log('Chat notification listeners initialized successfully');
    } catch (error) {
      console.error('Error initializing chat notifications:', error);
    }
  }

  // Handle chat notification in foreground
  static handleChatNotification(remoteMessage) {
    try {
      // Show local notification for better UX
      PushNotification.localNotification({
        channelId: 'servenest_default_channel',
        title: remoteMessage.notification?.title || 'New Message',
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
      console.error('Error showing chat notification:', error);

      // Fallback to Alert
      const {Alert} = require('react-native');

      Alert.alert(
        remoteMessage.notification?.title || 'New Message',
        remoteMessage.notification?.body || 'You have a new message',
        [
          {text: 'Dismiss', style: 'cancel'},
          {
            text: 'Open Chat',
            onPress: () => this.navigateToChat(remoteMessage.data),
          },
        ],
      );
    }
  }

  // Navigate to specific chat
  static navigateToChat(data) {
    console.log('Navigate to chat:', data);

    if (!data || !data.chatId) {
      console.error('Invalid chat data for navigation:', data);
      return;
    }

    // TODO: Implement navigation logic based on your navigation structure
    console.log('Navigation data:', {
      chatId: data.chatId,
      senderName: data.senderName,
      senderId: data.senderId,
    });

    // Example navigation (uncomment and adjust based on your navigation structure):
    //
    // import { navigationRef } from '../navigation/NavigationService';
    //
    // navigationRef.current?.navigate('Chat', {
    //   chatId: data.chatId,
    //   name: data.senderName,
    //   recipientId: data.senderId
    // });
  }

  // ✅ Helper method to get current chat participants
  static async getChatParticipants(chatId) {
    try {
      // Extract user IDs from chat ID (assuming format like "user1_user2")
      const userIds = chatId.split('_');

      if (userIds.length !== 2) {
        console.error('Invalid chat ID format:', chatId);
        return null;
      }

      const [user1Doc, user2Doc] = await Promise.all([
        getDoc(doc(db, 'Users', userIds[0])),
        getDoc(doc(db, 'Users', userIds[1])),
      ]);

      return {
        user1: user1Doc.exists() ? {id: userIds[0], ...user1Doc.data()} : null,
        user2: user2Doc.exists() ? {id: userIds[1], ...user2Doc.data()} : null,
      };
    } catch (error) {
      console.error('Error getting chat participants:', error);
      return null;
    }
  }

  // ✅ Helper method to check if user is in chat
  static isUserInChat(chatId, userId) {
    return chatId.includes(userId);
  }

  // ✅ Helper method to get other participant ID
  static getOtherParticipantId(chatId, currentUserId) {
    const userIds = chatId.split('_');
    return userIds.find(id => id !== currentUserId);
  }
}
