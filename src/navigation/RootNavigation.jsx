import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {NavigationContainer} from '@react-navigation/native';
import Home from '../screens/Home';
import Rated from '../screens/Rated';
import Profile from '../screens/Profile';
import Help from '../screens/Help';
import SubcategoriesScreen from '../screens/SubCategory';
import ServicesScreen from '../screens/Services';
import ServiceShowcase from '../screens/Details';
import LandingPage from '../screens/LandingPage';
import Login from '../screens/Login';
import Signup from '../screens/Signup';
import RegisterBusiness from '../screens/RegisterBusiness';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: '#8BC34A',
        drawerLabelStyle: {fontWeight: 'bold'},
      }}>
      <Drawer.Screen name="Home" component={Home} />
      <Drawer.Screen name="Rated" component={Rated} />
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="Register Business" component={RegisterBusiness} />
      <Drawer.Screen name="Need Help?" component={Help} />
    </Drawer.Navigator>
  );
}

export default function RootNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Landing" component={LandingPage} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="Main" component={DrawerNavigator} />
        <Stack.Screen name="SubCategory" component={SubcategoriesScreen} />
        <Stack.Screen name="Services" component={ServicesScreen} />
        <Stack.Screen name="Details" component={ServiceShowcase} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
