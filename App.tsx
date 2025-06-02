import React from 'react';
import { View} from 'react-native';
import './src/global.css';
import HomePage from './src/screens/Home';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
function App(): React.JSX.Element {
  return (
    <SafeAreaProvider className='flex-1'>
      <SafeAreaView className="flex-1">

        <View className="flex-1 bg-white">
          <HomePage />
        </View>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}
export default App;
