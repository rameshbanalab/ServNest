import React, {useEffect} from 'react';
import {View} from 'react-native';
import './src/global.css';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import RootNavigation from './src/navigation/RootNavigation';
import 'react-native-gesture-handler';
import {DirectNotificationService} from './src/screens/services/directNotificationService';
function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize notifications when app starts
    DirectNotificationService.initializeReceiver();
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
