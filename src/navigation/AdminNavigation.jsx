/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {View, Text, ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {auth} from '../config/firebaseConfig';
import AdminCategoriesScreen from '../screens/admin/Categories';
import AdminPricingScreen from '../screens/admin/Pricing';
import AdminSubcategoriesManager from '../screens/admin/SubCategories';

const Drawer = createDrawerNavigator();

// Admin Logout Component
function AdminLogoutComponent() {
  const navigation = useNavigation();

  const performLogout = async () => {
    try {
      await auth.signOut();
      await AsyncStorage.removeItem('authToken');
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
}

export default function AdminNavigation() {
  return (
    <Drawer.Navigator
      initialRouteName="Admin Dashboard"
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
        name="Admin Dashboard"
        component={AdminCategoriesScreen}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="dashboard" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Manage Categories"
        component={AdminCategoriesScreen}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="category" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Manage Subcategories"
        component={AdminSubcategoriesManager}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="subdirectory-arrow-right" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Pricing Management"
        component={AdminPricingScreen}
        options={{
          drawerIcon: ({color, size}) => (
            <Icon name="attach-money" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Logout"
        component={AdminLogoutComponent}
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
