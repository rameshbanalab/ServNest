/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unstable-nested-components */
import React, {useState, useEffect, useCallback} from 'react';
import {
  NavigationContainer,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {View, ActivityIndicator, Text} from 'react-native';
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
import {auth} from '../config/firebaseConfig';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Simplified Logout component - directly logs out without confirmation
function LogoutComponent({setIsLoggedIn}) {
  const performLogout = async () => {
    try {
      await auth.signOut();
      await AsyncStorage.removeItem('authToken');
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Automatically logout when component mounts
  useFocusEffect(
    useCallback(() => {
      performLogout();
    }, []),
  );

  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <ActivityIndicator size="large" color="#8BC34A" />
      <Text className="text-gray-700 text-base mt-4">Logging out...</Text>
    </View>
  );
}

function DrawerNavigator({setIsLoggedIn}) {
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
          paddingVertical: 10,
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
        name="Admin"
        component={AdminNavigation}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="admin-panel-settings" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Need"
        component={AdminCategoriesScreen}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="category" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="sub"
        component={AdminSubcategoriesManager}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="subdirectory-arrow-right" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Logout"
        component={() => <LogoutComponent setIsLoggedIn={setIsLoggedIn} />}
        options={{
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

// Custom hook to update login state from Login component
export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = async token => {
    await AsyncStorage.setItem('authToken', token);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('authToken');
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('authToken');
      setIsLoggedIn(!!token);
    };
    checkToken();
  }, []);

  return {isLoggedIn, login, logout};
};

export default function RootNavigation() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
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
      <Stack.Navigator
        screenOptions={{headerShown: false}}
        key={isLoggedIn ? 'authenticated' : 'unauthenticated'}>
        {isLoggedIn ? (
          <>
            <Stack.Screen
              name="Main"
              component={() => (
                <DrawerNavigator setIsLoggedIn={setIsLoggedIn} />
              )}
            />
            <Stack.Screen name="SubCategory" component={SubcategoriesScreen} />
            <Stack.Screen name="Services" component={ServicesScreen} />
            <Stack.Screen name="Details" component={ServiceShowcase} />
            <Stack.Screen name="Admin" component={AdminNavigation} />
            <Stack.Screen name="category" component={AdminCategoriesScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Landing" component={LandingPage} />
            <Stack.Screen
              name="Login"
              component={Login}
              initialParams={{setIsLoggedIn}}
            />
            <Stack.Screen name="Signup" component={Signup} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
