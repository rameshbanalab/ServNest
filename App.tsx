import React from 'react';
import {
  Text,
  View,
} from 'react-native';
import './src/global.css';
import HomePage from './src/screens/Home';
function App(): React.JSX.Element {

  return (
    <View className='flex-1 bg-white'>
      <HomePage/>
    </View>
  );
}
export default App;
