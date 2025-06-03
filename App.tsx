import React from 'react';
import {View} from 'react-native';
import './src/global.css';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import RootNavigation from './src/navigation/RootNavigation';
import 'react-native-gesture-handler';

function App(): React.JSX.Element {
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
