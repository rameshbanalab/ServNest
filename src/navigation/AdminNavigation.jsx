/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {View, Text, ActivityIndicator, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ FIXED: Import React Native Firebase auth directly
import auth from '@react-native-firebase/auth';

import AdminCategoriesScreen from '../screens/admin/Categories';
import AdminPricingScreen from '../screens/admin/Pricing';
import AdminSubcategoriesManager from '../screens/admin/SubCategories';
import AdminBusinessScreen from '../screens/admin/Business';

const Drawer = createDrawerNavigator();

// ✅ FIXED: Admin Logout Component with correct React Native Firebase syntax
function AdminLogoutComponent() {
  const navigation = useNavigation();

  const performLogout = async () => {
    try {
      console.log('Starting admin logout process...');

      // ✅ FIXED: Use React Native Firebase auth syntax
      await auth().signOut();

      // Clear AsyncStorage
      await AsyncStorage.multiRemove(['authToken', 'userRole']);

      console.log('Admin logout successful');

      // Navigate to landing page
      navigation.reset({
        index: 0,
        routes: [{name: 'Landing'}],
      });
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
      <ActivityIndicator size="large" color="#8BC34A" />
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
          backgroundColor: '#8BC34A',
          elevation: 0,
          shadowOpacity: 0,
        },
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
          width: 260,
        },
        drawerItemStyle: {
          marginVertical: 5,
          paddingVertical: 10,
          borderRadius: 8,
        },
        drawerActiveBackgroundColor: '#e8f5e9',
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

      <Drawer.Screen
        name="Manage Subcategories"
        component={AdminSubcategoriesManager}
        options={{
          title: 'Subcategories',
          drawerIcon: ({color, size}) => (
            <Icon name="subdirectory-arrow-right" size={size} color={color} />
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
