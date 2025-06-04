import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {NavigationContainer} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
import AdminNavigation from './AdminNavigation';
import AdminPricingScreen from '../screens/admin/Pricing';
import AdminCategoriesScreen from '../screens/admin/Categories';
import AdminSubcategoriesManager from '../screens/admin/SubCategories';
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
        drawerType: 'front',
        drawerStyle: {
          backgroundColor: '#f5f5f5',
          width: 240,
        },
        drawerItemStyle: {
          marginVertical: 5,
          paddingVertical:10,
          borderRadius: 8,
        },
        drawerActiveBackgroundColor: '#e8f5e9',
      }}>
      <Drawer.Screen
        name="Home"
        component={Home}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Rated"
        component={Rated}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="star" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Profile"
        component={Profile}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Register Business"
        component={RegisterBusiness}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="add-business" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Need Help?"
        component={Help}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="help-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Need?"
        component={AdminPricingScreen}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="help-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Need"
        component={AdminCategoriesScreen}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="help-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="sub"
        component={
          AdminSubcategoriesManager
        }
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="help-outline" size={size} color={color} />
          ),
        }}
      />
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
        <Stack.Screen name="Admin" component={AdminNavigation}/>
        <Stack.Screen name="category" component={AdminCategoriesScreen}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
