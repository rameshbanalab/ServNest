import React, {useEffect, useState, useRef} from 'react';
import {
  KeyboardAvoidingView,
  View,
  Platform,
  AppState,
  Linking,
} from 'react-native';
import './src/global.css';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import {PermissionsAndroid} from 'react-native';
import PushNotification from 'react-native-push-notification';
import {NavigationContainer} from '@react-navigation/native';
import RootNavigation from './src/navigation/RootNavigation';
import 'react-native-gesture-handler';
import {DirectNotificationService} from './src/screens/services/directNotificationService';
import {ChatNotificationService} from './src/screens/services/chatNotificationService';
import './src/i18n';

// ✅ FIXED: Background message handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📱 Background message received:', remoteMessage);

  // Store notification for when app opens
  if (remoteMessage.data?.type === 'admin_notification') {
    console.log('🔔 Background admin notification:', {
      navigationType: remoteMessage.data?.navigationType,
      itemId: remoteMessage.data?.itemId,
    });
  }
});

function App(): React.JSX.Element {
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const navigationRef = useRef(null);

  // ✅ FIXED: Create notification channels with proper priority
  const createNotificationChannels = () => {
    if (Platform.OS === 'android') {
      // Default channel
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
        created => console.log(`✅ Default channel created: ${created}`),
      );

      // Admin notifications channel - HIGH PRIORITY
      PushNotification.createChannel(
        {
          channelId: 'servenest_admin_channel',
          channelName: 'ServeNest Admin Notifications',
          channelDescription: 'Important notifications from ServeNest admin',
          playSound: true,
          soundName: 'default',
          importance: 4, // IMPORTANCE_HIGH
          vibrate: true,
        },
        created => console.log(`✅ Admin channel created: ${created}`),
      );

      // Events notifications channel
      PushNotification.createChannel(
        {
          channelId: 'servenest_events_channel',
          channelName: 'ServeNest Events',
          channelDescription: 'Event notifications and updates',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        created => console.log(`✅ Events channel created: ${created}`),
      );
    }
  };

  // Check notification permissions
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

  // Request notification permissions
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

  // ✅ FIXED: Initialize services with proper navigation reference
  const initializeServices = async () => {
    try {
      console.log('🚀 Initializing notification services...');

      // ✅ CRITICAL: Set navigation reference BEFORE initializing services
      if (navigationRef.current) {
        DirectNotificationService.setNavigationRef(navigationRef.current);
        console.log(
          '✅ Navigation reference set for DirectNotificationService',
        );
      }

      await Promise.all([
        DirectNotificationService.initializeReceiver(),
        ChatNotificationService.initializeChatNotifications(),
      ]);

      console.log('✅ All notification services initialized successfully');
    } catch (error) {
      console.error('❌ Service initialization error:', error);
    }
  };

  // ✅ FIXED: Initialize push notifications with proper handling
  const initializePushNotifications = () => {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('📱 Push notification token registered');
      },
      onNotification: function (notification) {
        console.log('🔔 App.tsx - Push notification received:', notification);

        // ✅ CRITICAL: Handle notification tap
        if (notification.userInteraction) {
          console.log(
            '👆 User tapped notification in App.tsx:',
            notification.userInfo,
          );

          // Handle admin notifications
          if (notification.userInfo?.type === 'admin_notification') {
            const navigationData =
              DirectNotificationService.buildDeepLinkFromNotificationData(
                notification.userInfo,
              );

            console.log('🔗 App.tsx - Navigation data:', navigationData);

            // Navigate immediately
            setTimeout(() => {
              DirectNotificationService.navigateToScreen(navigationData);
            }, 500);
          }
        }
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: false,
    });
  };

  // ✅ FIXED: Handle deep links
  const handleDeepLink = (url: string) => {
    console.log('🔗 Deep link received:', url);

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      if (!navigationRef.current) {
        console.warn('Navigation reference not available for deep link');
        return;
      }

      // Handle different deep link patterns
      if (path.includes('/event/')) {
        const eventId = path.split('/event/')[1];
        navigationRef.current.navigate('EventsManagement', {
          eventId,
          fromDeepLink: true,
        });
      } else if (path.includes('/business/')) {
        const businessId = path.split('/business/')[1];
        navigationRef.current.navigate('Details', {
          serviceId: businessId,
          fromDeepLink: true,
        });
      } else {
        navigationRef.current.navigate('Main', {screen: 'Home'});
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      if (navigationRef.current) {
        navigationRef.current.navigate('Main', {screen: 'Home'});
      }
    }
  };

  // ✅ FIXED: Main permission flow
  const handlePermissionFlow = async () => {
    if (permissionChecked) return;

    try {
      setPermissionChecked(true);

      // Create notification channels first
      createNotificationChannels();

      // Initialize push notifications
      initializePushNotifications();

      // Check permissions
      const hasPermission = await checkNotificationPermission();

      if (!hasPermission) {
        console.log('❌ Requesting notification permissions...');
        const granted = await requestNotificationPermission();
        if (granted) {
          console.log('✅ Notification permissions granted');
        } else {
          console.log('❌ Notification permissions denied');
        }
      } else {
        console.log('✅ Notification permissions already granted');
      }

      // Mark app as ready
      setIsAppReady(true);

      // Initialize services
      await initializeServices();
    } catch (error) {
      console.error('❌ Permission flow error:', error);
      setIsAppReady(true);
      await initializeServices();
    }
  };

  // ✅ FIXED: Handle app state changes
  const handleAppStateChange = (nextAppState: string) => {
    console.log('📱 App state changed:', appState, '->', nextAppState);

    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('🔄 App came to foreground');

      // Clear notification badge
      PushNotification.setApplicationIconBadgeNumber(0);

      // Re-set navigation reference
      if (isAppReady && navigationRef.current) {
        setTimeout(() => {
          DirectNotificationService.setNavigationRef(navigationRef.current);
        }, 500);
      }
    }

    setAppState(nextAppState);
  };

  // ✅ FIXED: Navigation ready handler
  const onNavigationReady = () => {
    console.log('🧭 Navigation container ready');

    // Set navigation reference immediately
    if (navigationRef.current) {
      DirectNotificationService.setNavigationRef(navigationRef.current);
      console.log('✅ Navigation reference set on ready');
    }
  };

  // ✅ FIXED: Initialize app
  useEffect(() => {
    console.log('🚀 App initialization started');

    // Handle initial URL
    const handleInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('🔗 Initial URL:', initialUrl);
          setTimeout(() => handleDeepLink(initialUrl), 2000);
        }
      } catch (error) {
        console.error('Error getting initial URL:', error);
      }
    };

    // Set up listeners
    const urlListener = Linking.addEventListener('url', ({url}) => {
      handleDeepLink(url);
    });

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    // Start permission flow
    const timer = setTimeout(() => {
      handlePermissionFlow();
      handleInitialURL();
    }, 500);

    return () => {
      clearTimeout(timer);
      urlListener?.remove();
      appStateSubscription?.remove();

      try {
        DirectNotificationService.cleanup();
        ChatNotificationService.cleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    };
  }, []);

  // ✅ FIXED: Update navigation reference when ready
  useEffect(() => {
    if (isAppReady && navigationRef.current) {
      const timer = setTimeout(() => {
        DirectNotificationService.setNavigationRef(navigationRef.current);
        console.log('✅ Navigation reference updated after app ready');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isAppReady]);

  return (
    <SafeAreaProvider className="flex-1">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View className="flex-1 bg-white">
            <NavigationContainer
              ref={navigationRef}
              onReady={onNavigationReady}
              linking={{
                prefixes: ['servenest://', 'https://servenest.com'],
                config: {
                  screens: {
                    Main: {
                      screens: {
                        Home: 'home',
                        Events: 'events',
                        Profile: 'profile',
                        Chats: 'chats',
                        Jobs: 'jobs',
                        'My Businesses': 'businesses',
                        Donations: 'donations',
                        'Help & Support': 'help',
                      },
                    },
                    Details: 'business/:serviceId',
                    EventsManagement: 'event/:eventId',
                    DonationDetails: 'donation/:donationId',
                    UserChat: 'chat/:chatId',
                    SubCategory: 'category/:categoryId',
                    Services: 'services',
                  },
                },
              }}>
              <RootNavigation />
            </NavigationContainer>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
