import React, {useEffect, useState, useRef} from 'react';
import {KeyboardAvoidingView, View, Platform} from 'react-native';
import './src/global.css';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import {PermissionsAndroid} from 'react-native';
import PushNotification from 'react-native-push-notification';
import RootNavigation from './src/navigation/RootNavigation';
import 'react-native-gesture-handler';
import {DirectNotificationService} from './src/screens/services/directNotificationService';
import {ChatNotificationService} from './src/screens/services/chatNotificationService';
import './src/i18n';
import LanguageSwitcher from './src/components/LanguageSwitcher';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  if (remoteMessage.data?.type === 'chat_message') {
    console.log('Background chat notification:', remoteMessage);
  }
});

function App(): React.JSX.Element {
  const [permissionChecked, setPermissionChecked] = useState(false);
  const navigationRef = useRef(null);
  // Create notification channel using react-native-push-notification
  const createNotificationChannel = () => {
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'default-channel-id',
          channelName: 'Default Channel',
          channelDescription: 'A default channel for notifications',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        created => console.log(`Notification channel created: ${created}`),
      );
    }
  };

  // Check if notification permissions are already granted
  const checkNotificationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().hasPermission();
        return (
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
      } else if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          return await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  };

  // Request notification permissions directly
  const requestNotificationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission({
          alert: true,
          badge: true,
          sound: true,
          provisional: false,
        });

        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        console.log('iOS notification permission result:', enabled);
        return enabled;
      } else if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );

          const granted = result === PermissionsAndroid.RESULTS.GRANTED;
          console.log('Android 13+ notification permission result:', granted);
          return granted;
        } else {
          console.log('Android <13, permission granted by default');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  // Initialize notification services
  const initializeServices = async () => {
    try {
      console.log('🚀 Initializing notification services...');

      await Promise.all([
        DirectNotificationService.initializeReceiver(),
        ChatNotificationService.initializeChatNotifications(),
      ]);

      console.log('✅ All notification services initialized successfully');
    } catch (error) {
      console.error('❌ Service initialization error:', error);
    }
  };

  // Initialize push notifications
  const initializePushNotifications = () => {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: false, // We handle permissions manually
    });
  };

  // Main permission flow - no alerts, direct request
  const handlePermissionFlow = async () => {
    if (permissionChecked) return;

    try {
      setPermissionChecked(true);

      // Create notification channel first (required for Android)
      createNotificationChannel();

      // Initialize push notifications
      initializePushNotifications();

      // Check if permissions are already granted
      const hasPermission = await checkNotificationPermission();

      if (!hasPermission) {
        console.log(
          '❌ Notification permissions not granted, requesting directly...',
        );
        // Request permission directly without any alert
        const granted = await requestNotificationPermission();
        if (granted) {
          console.log('🔔 Notification permissions granted');
        } else {
          console.log('❌ Notification permissions denied');
        }
      } else {
        console.log('✅ Notification permissions already granted');
      }

      // Initialize services regardless of permission status
      await initializeServices();
    } catch (error) {
      console.error('❌ Permission flow error:', error);
      await initializeServices();
    }
  };

  useEffect(() => {
    // Start permission flow immediately when app loads
    const timer = setTimeout(() => {
      handlePermissionFlow();
    }, 500); // Small delay to ensure app is ready

    return () => {
      clearTimeout(timer);
      try {
        DirectNotificationService.cleanup();
        ChatNotificationService.cleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    };
  }, []);

  return (
    <SafeAreaProvider className="flex-1">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View className="flex-1 bg-white">
            <RootNavigation />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
