import React, {useEffect} from 'react';
import {View} from 'react-native';
import './src/global.css';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import RootNavigation from './src/navigation/RootNavigation';
import 'react-native-gesture-handler';
import {DirectNotificationService} from './src/screens/services/directNotificationService';
import {ChatNotificationService} from './src/screens/services/chatNotificationService';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  // Don't do any UI operations here
  if (remoteMessage.data?.type === 'chat_message') {
    console.log('Background chat notification:', remoteMessage);
  }
});

function App(): React.JSX.Element {
  useEffect(() => {
    const initializeFCM = async () => {
      try {
        console.log('🚀 Initializing notification services...');

        // ✅ Initialize both services with proper separation
        await Promise.all([
          DirectNotificationService.initializeReceiver(),
          ChatNotificationService.initializeChatNotifications(),
        ]);

        console.log('✅ All notification services initialized successfully');
      } catch (error) {
        console.error('❌ FCM initialization error:', error);
      }
    };

    initializeFCM();

    // ✅ Cleanup on unmount
    return () => {
      DirectNotificationService.cleanup();
      ChatNotificationService.cleanup();
    };
  }, []);
  return (
    <SafeAreaProvider className="flex-1">
      <SafeAreaView className="flex-1">
        <View className="flex-1 bg-white">
          <RootNavigation />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
