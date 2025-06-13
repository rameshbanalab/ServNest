/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, Text, ActivityIndicator, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapComponent from '../components/MapComponent';
import {triggerAuthCheck, clearAllAppCache} from './RootNavigation';
import auth from '@react-native-firebase/auth';

import AdminCategoriesScreen from '../screens/admin/Categories';
import AdminPricingScreen from '../screens/admin/Pricing';
import AdminSubcategoriesManager from '../screens/admin/SubCategories';
import AdminBusinessScreen from '../screens/admin/Business';
import NotificationManager from '../screens/admin/NotificationManager';
import AdminJobsScreen from '../screens/admin/Jobs';
import Contacts from '../screens/Contacts';
import Chat from '../screens/Chat'; // ✅ ADD: Import Chat screen
import AdminEventManager from '../screens/admin/AdminEventManager';
import Donations from '../screens/admin/Donations';
import DonationDetails from '../screens/admin/DonationDetails';

const Drawer = createDrawerNavigator();
const ChatStack = createNativeStackNavigator();
const DonationStack = createNativeStackNavigator();
function AdminDonationStackNavigator() {
  return (
    <DonationStack.Navigator screenOptions={{headerShown: false}}>
      <DonationStack.Screen
        name="Donations"
        component={Donations}
        options={{headerShown: false, title: 'Donations'}}
      />
      <DonationStack.Screen
        name="DonationDetails"
        component={DonationDetails} // Replace with actual DonationDetails component
        options={{
          title: 'Donation Details',
          headerShown: false,
        }}
      />
    </DonationStack.Navigator>
  );
}
function AdminLogoutComponent() {
  const navigation = useNavigation();

  const performLogout = async () => {
    try {
      console.log('Starting admin logout process...');
      // ✅ Only clear AsyncStorage - no Firebase auth signOut
      await AsyncStorage.multiRemove(['authToken', 'userRole']);
      await clearAllAppCache();
      console.log('Admin logout successful');
      triggerAuthCheck();
      // ✅ REMOVED: Manual navigation - let RootNavigation handle it
    } catch (error) {
      console.error('Error during admin logout:', error);
      Alert.alert('Logout Error', 'Failed to logout. Please try again.');
    }
  };

  React.useEffect(() => {
    performLogout();
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <ActivityIndicator size="large" color="#FF4500" />
      <Text className="text-gray-700 text-base mt-4">Logging out...</Text>
    </View>
  );
}

export default function AdminNavigation() {
  return (
    <Drawer.Navigator
      initialRouteName="Admin Dashboard"
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: '#FF4500',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        drawerActiveTintColor: '#FF4500',
        drawerLabelStyle: {fontWeight: 'bold'},
        drawerType: 'front',
        drawerStyle: {
          backgroundColor: '#f5f5f5',
          width: 260,
        },
        drawerItemStyle: {
          marginVertical: 5,
          paddingVertical: 10,
          borderRadius: 8,
        },
        drawerActiveBackgroundColor: '#FFECE5',
      }}>
      <Drawer.Screen
        name="Admin Dashboard"
        component={AdminBusinessScreen}
        options={{
          title: 'Dashboard',
          drawerIcon: ({color, size}) => (
            <Icon name="dashboard" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Manage Categories"
        component={AdminCategoriesScreen}
        options={{
          title: 'Categories',
          drawerIcon: ({color, size}) => (
            <Icon name="category" size={size} color={color} />
          ),
        }}
      />

      {/* <Drawer.Screen
        name="Manage Subcategories"
        component={AdminSubcategoriesManager}
        options={{
          title: 'Subcategories',
          drawerIcon: ({color, size}) => (
            <Icon name="subdirectory-arrow-right" size={size} color={color} />
          ),
        }}
      /> */}
      <Drawer.Screen
        name="Event Management"
        component={AdminEventManager}
        options={{
          title: 'Events',
          drawerIcon: ({color, size}) => (
            <Icon name="event-note" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Pricing Management"
        component={AdminPricingScreen}
        options={{
          title: 'Pricing',
          drawerIcon: ({color, size}) => (
            <Icon name="attach-money" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Map"
        component={MapComponent}
        options={{
          title: 'Map',
          drawerIcon: ({color, size}) => (
            <Icon name="map" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Manage Notifications"
        component={NotificationManager}
        options={{
          title: 'Notifications',
          drawerIcon: ({color, size}) => (
            <Icon name="notifications" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Jobs"
        component={AdminJobsScreen}
        options={{
          title: 'Manage Jobs',
          drawerIcon: ({color, size}) => (
            <Icon name="work" size={size} color={color} />
          ),
        }}
      />

      {/* ✅ UPDATED: Use ChatStack instead of just Contacts */}
      <Drawer.Screen
        name="Chats"
        component={Contacts}
        options={{
          headerShown: false,
          title: 'Admin Chats',
          drawerIcon: ({color, size}) => (
            <Icon name="chat" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Donations"
        component={AdminDonationStackNavigator}
        options={{
          title: 'Donations',
          drawerIcon: ({color, size}) => (
            <Icon name="volunteer-activism" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Logout"
        component={AdminLogoutComponent}
        options={{
          title: 'Logout',
          drawerIcon: ({color, size}) => (
            <Icon name="logout" size={size} color="#D32F2F" />
          ),
          drawerItemStyle: {
            marginTop: 'auto',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            paddingTop: 15,
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
