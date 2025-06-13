import messaging from '@react-native-firebase/messaging';
import {db} from '../config/firebaseConfig';
import {doc, getDoc} from 'firebase/firestore';
import PushNotification from 'react-native-push-notification';
import {navigate} from './navigationService';
import auth from '@react-native-firebase/auth';

export class ChatNotificationService {
  static _messageListener = null;
  static _notificationOpenedListener = null;

  static async sendMessageNotification({
    recipientId,
    senderName,
    messageContent,
    chatId,
    senderId,
  }) {
    try {
      const recipientDoc = await getDoc(doc(db, 'Users', recipientId));

      if (!recipientDoc.exists()) {
        console.log('ChatNotificationService - Recipient not found');
        return {success: false, error: 'Recipient not found'};
      }

      const recipientData = recipientDoc.data();
      const fcmToken = recipientData.fcmToken;

      if (!fcmToken) {
        console.log('ChatNotificationService - Recipient FCM token not found');
        return {success: false, error: 'FCM token not found'};
      }

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
      console.error(
        'ChatNotificationService - Error in chat notification service:',
        error,
      );
      return {success: false, error: error.message};
    }
  }

  // ✅ FIXED: Only handle chat notifications with proper cleanup
  static async initializeChatNotifications() {
    try {
      console.log(
        'ChatNotificationService - Initializing chat notification listeners...',
      );

      // ✅ Cleanup existing listeners first
      this.cleanup();

      // ✅ Only handle chat notifications in foreground
      this._messageListener = messaging().onMessage(async remoteMessage => {
        console.log(
          'ChatNotificationService - Chat notification received in foreground:',
          remoteMessage,
        );

        // ✅ ONLY handle chat messages, ignore admin notifications
        if (remoteMessage.data?.type === 'chat_message') {
          this.handleChatNotification(remoteMessage);
        } else {
          console.log(
            '🔄 ChatNotificationService - Skipping non-chat notification',
          );
        }
      });

      // ✅ Only handle chat notifications when app opened
      this._notificationOpenedListener = messaging().onNotificationOpenedApp(
        remoteMessage => {
          console.log(
            'ChatNotificationService - Chat notification opened app:',
            remoteMessage,
          );

          if (remoteMessage.data?.type === 'chat_message') {
            this.navigateToChat(remoteMessage.data);
          }
        },
      );

      // ✅ Check initial notification for chat only
      const initialNotification = await messaging().getInitialNotification();
      if (
        initialNotification &&
        initialNotification.data?.type === 'chat_message'
      ) {
        console.log(
          'ChatNotificationService - App opened from chat notification:',
          initialNotification,
        );
        setTimeout(() => {
          this.navigateToChat(initialNotification.data);
        }, 2000);
      }

      console.log(
        'ChatNotificationService - Chat notification listeners initialized successfully',
      );
    } catch (error) {
      console.error(
        'ChatNotificationService - Error initializing chat notifications:',
        error,
      );
    }
  }

  // ✅ Handle chat notification in foreground
  static handleChatNotification(remoteMessage) {
    try {
      PushNotification.localNotification({
        channelId: 'servenest_default_channel',
        title: remoteMessage.notification?.title || 'New Message',
        message: remoteMessage.notification?.body || 'You have a new message',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        color: '#FF4500',
        vibrate: true,
        playSound: true,
        soundName: 'default',
        userInfo: remoteMessage.data || {},
        tag: 'chat_notification',
        id: 'chat',
      });
    } catch (error) {
      console.error(
        'ChatNotificationService - Error showing chat notification:',
        error,
      );

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

  // ✅ Navigate to specific chat
  static async navigateToChat(data) {
    try {
      console.log('🔔 ChatNotificationService - Navigating to chat:', data);

      if (!data || !data.chatId) {
        console.error(
          '❌ ChatNotificationService - Invalid chat data for navigation:',
          data,
        );
        return;
      }

      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.error(
          '❌ ChatNotificationService - No authenticated user for chat navigation',
        );
        return;
      }

      const chatId = data.chatId;
      const senderId = data.senderId;
      const senderName = data.senderName || 'Unknown';

      const isUserInChat = this.isUserInChat(chatId, currentUser.uid);
      if (!isUserInChat) {
        console.error(
          '❌ ChatNotificationService - Current user is not part of this chat',
        );
        return;
      }

      const recipientId = this.getOtherParticipantId(chatId, currentUser.uid);

      console.log('📱 ChatNotificationService - Navigation params:', {
        chatId: chatId,
        name: senderName,
        recipientId: recipientId,
      });

      // ✅ Navigate to Chat screen
      navigate('Chat', {
        chatId: chatId,
        name: senderName,
        recipientId: recipientId,
      });

      console.log(
        '✅ ChatNotificationService - Successfully navigated to chat',
      );
    } catch (error) {
      console.error(
        '❌ ChatNotificationService - Error navigating to chat:',
        error,
      );
    }
  }

  // ✅ Cleanup method
  static cleanup() {
    console.log('🧹 ChatNotificationService - Cleaning up listeners...');

    if (this._messageListener) {
      this._messageListener();
      this._messageListener = null;
    }

    if (this._notificationOpenedListener) {
      this._notificationOpenedListener();
      this._notificationOpenedListener = null;
    }
  }

  // Helper methods
  static async getChatParticipants(chatId) {
    try {
      const userIds = chatId.split('_');

      if (userIds.length !== 2) {
        console.error(
          'ChatNotificationService - Invalid chat ID format:',
          chatId,
        );
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
      console.error(
        'ChatNotificationService - Error getting chat participants:',
        error,
      );
      return null;
    }
  }

  static isUserInChat(chatId, userId) {
    return chatId.includes(userId);
  }

  static getOtherParticipantId(chatId, currentUserId) {
    const userIds = chatId.split('_');
    return userIds.find(id => id !== currentUserId);
  }
}
