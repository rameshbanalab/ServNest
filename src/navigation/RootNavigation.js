/* eslint-disable react/no-unstable-nested-components */
import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {View, ActivityIndicator, Text} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {auth} from '../config/firebaseConfig';

// Import screens
import Home from '../screens/Home';
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
import AdminCategoriesScreen from '../screens/admin/Categories';
import AdminSubcategoriesManager from '../screens/admin/SubCategories';
import MyBusinesses from '../screens/MyBusinesses';
import EditBusiness from '../screens/EditBusiness';
import PaymentSuccess from '../screens/PaymentSuccess';
import PaymentFailure from '../screens/PaymentFailure';
import Chat from '../screens/Chat';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// User Drawer Navigator
function UserDrawerNavigator() {
  const navigation = useNavigation();
  const LogoutComponent = () => {
    const performLogout = async () => {
      try {
        await auth().signOut();
        await AsyncStorage.removeItem('authToken');
        // Navigate back to Landing page
        navigation.replace('Landing');
      } catch (error) {
        console.error('Error during logout:', error);
      }
    };

    React.useEffect(() => {
      performLogout();
    }, []);

    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="text-gray-700 text-base mt-4">Logging out...</Text>
      </View>
    );
  };

  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#8BC34A',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerStatusBarHeight: 0,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        drawerActiveTintColor: '#8BC34A',
        drawerLabelStyle: {fontWeight: 'bold'},
        drawerType: 'front',
        drawerStyle: {
          backgroundColor: '#f5f5f5',
          width: 240,
        },
        drawerItemStyle: {
          marginVertical: 5,
          paddingVertical: 10,
          borderRadius: 8,
        },
        drawerActiveBackgroundColor: '#e8f5e9',
      }}>
      <Drawer.Screen
        name="Home"
        component={Home}
        options={{
          title: 'ServeNest',
          drawerIcon: ({color, size}) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Profile"
        component={Profile}
        options={{
          title: 'My Profile',
          drawerIcon: ({color, size}) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Register Business"
        component={RegisterBusiness}
        options={{
          title: 'Register Business',
          drawerIcon: ({color, size}) => (
            <Icon name="add-business" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Help & Support"
        component={Help}
        options={{
          title: 'Help & Support',
          drawerIcon: ({color, size}) => (
            <Icon name="help-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="My Businesses"
        component={MyBusinesses}
        options={{
          title: 'My Businesses',
          drawerIcon: ({color, size}) => (
            <Icon name="store" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Logout"
        component={LogoutComponent}
        options={{
          title: 'Logout',
          drawerIcon: ({color, size}) => (
            <Icon name="logout" size={size} color="#D32F2F" />
          ),
          drawerItemStyle: {
            marginTop: 'auto',
          },
          drawerLabelStyle: {
            fontWeight: 'bold',
            color: '#D32F2F',
          },
          drawerActiveTintColor: '#D32F2F',
          drawerActiveBackgroundColor: '#ffebee',
        }}
      />
    </Drawer.Navigator>
  );
}

export default function RootNavigation() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        setIsLoggedIn(!!token);
      } catch (error) {
        console.error('Error checking token:', error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="text-gray-700 text-base mt-4">Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {isLoggedIn ? (
          // User is logged in - show main app screens
          <>
            <Stack.Screen name="Main" component={UserDrawerNavigator} />
            <Stack.Screen name="SubCategory" component={SubcategoriesScreen} />
            <Stack.Screen name="Services" component={ServicesScreen} />
            <Stack.Screen name="Details" component={ServiceShowcase} />
            <Stack.Screen name="Admin" component={AdminNavigation} />
            <Stack.Screen name="EditBusiness" component={EditBusiness} />
            <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
            <Stack.Screen name="PaymentFailure" component={PaymentFailure} />
            <Stack.Screen name="Chat" component={Chat} />
            <Stack.Screen
              name="AdminCategories"
              component={AdminCategoriesScreen}
            />
            <Stack.Screen
              name="AdminSubcategories"
              component={AdminSubcategoriesManager}
            />

            {/* Authentication screens available for logout navigation */}
            <Stack.Screen name="Landing" component={LandingPage} />
            <Stack.Screen
              name="Login"
              component={Login}
              initialParams={{setIsLoggedIn}}
            />
            <Stack.Screen name="Signup" component={Signup} />
          </>
        ) : (
          // User is not logged in - show authentication screens
          <>
            <Stack.Screen name="Landing" component={LandingPage} />
            <Stack.Screen
              name="Login"
              component={Login}
              initialParams={{setIsLoggedIn}}
            />
            <Stack.Screen name="Signup" component={Signup} />

            {/* Main app screens available after login */}
            <Stack.Screen name="Main" component={UserDrawerNavigator} />
            <Stack.Screen name="SubCategory" component={SubcategoriesScreen} />
            <Stack.Screen name="Services" component={ServicesScreen} />
            <Stack.Screen name="Details" component={ServiceShowcase} />
            <Stack.Screen name="Admin" component={AdminNavigation} />
            <Stack.Screen
              name="AdminCategories"
              component={AdminCategoriesScreen}
            />
            <Stack.Screen
              name="AdminSubcategories"
              component={AdminSubcategoriesManager}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
