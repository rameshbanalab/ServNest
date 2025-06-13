/* eslint-disable react/no-unstable-nested-components */
import React, {useState, useEffect, useCallback, useRef} from 'react';
// ✅ REMOVED: NavigationContainer import - not needed here anymore
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {View, ActivityIndicator, Text, Alert, AppState} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import Firebase Web SDK for Firestore
import {db} from '../config/firebaseConfig';
import {doc, getDoc} from 'firebase/firestore';

// Import all your screens
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
import Contacts from '../screens/Contacts';
import JobsScreen from '../screens/UserJobs';
import EventPaymentSuccess from '../screens/events/EventPaymentSuccess';
import EventPaymentFailure from '../screens/events/EventPaymentFailure';
import MyEventBookings from '../screens/events/MyEventBookings';
import DonationsPage from '../screens/donations/DonationsPage';
import DonationPaymentSuccess from '../screens/donations/DonationPaymentSuccess';
import DonationBookingScreen from '../screens/donations/DonationBookingScreen';
import DonationPaymentFailure from '../screens/donations/DonationPaymentFailure';
import MyDonationsScreen from '../screens/donations/MyDonationsScreen';
import DonationDetailsScreen from '../screens/donations/DonationDetailsScreen';
import AdminDonationDetails from '../screens/admin/DonationDetails';
import EventsManagement from '../screens/events/EventsManagement';
import EventBookingFlow from '../screens/events/EventBookingFlow';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
import '../i18n';
import Dashboard from '../screens/Dashboard';

// ✅ FIXED: Global authentication event emitter
class AuthEventEmitter {
  constructor() {
    this.listeners = [];
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  emit() {
    this.listeners.forEach(callback => callback());
  }
}

const authEventEmitter = new AuthEventEmitter();

// ✅ EXPORT: Function to trigger auth check from Login component
export const triggerAuthCheck = () => {
  console.log('🔄 Triggering authentication check from login');
  authEventEmitter.emit();
};

// ✅ FIXED: User Stack Navigator
function UserStack() {
  const LogoutComponent = () => {
    const performLogout = async () => {
      try {
        console.log('Starting logout process...');
        await AsyncStorage.multiRemove(['authToken', 'userRole', 'userInfo']);
        console.log('Logout successful');
        // Trigger auth check to update UI
        triggerAuthCheck();
      } catch (error) {
        console.error('Error during logout:', error);
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
  };

  function UserDrawerNavigator() {
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
            headerRight: () => <LanguageSwitcher />,
          }}
        />

        <Drawer.Screen
          name="Chats"
          component={Contacts}
          options={{
            headerShown: false,
            title: 'Chats',
            drawerIcon: ({color, size}) => (
              <Icon name="chat" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="Events"
          component={EventsManagement}
          options={{
            headerShown: false,
            title: 'Events',
            drawerIcon: ({color, size}) => (
              <Icon name="event" size={size} color={color} />
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
          name="Jobs"
          component={JobsScreen}
          options={{
            title: 'Jobs',
            drawerIcon: ({color, size}) => (
              <Icon name="work" size={size} color={color} />
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
          name="Donations"
          component={DonationsPage}
          options={{
            title: 'Donations',
            drawerIcon: ({color, size}) => (
              <Icon name="volunteer-activism" size={size} color={color} />
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

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Dashboard" component={Dashboard}/>
      <Stack.Screen name="Main" component={UserDrawerNavigator} />
      <Stack.Screen name="SubCategory" component={SubcategoriesScreen} />
      <Stack.Screen name="Services" component={ServicesScreen} />
      <Stack.Screen name="Details" component={ServiceShowcase} />
      <Stack.Screen
        name="UserChat"
        component={Chat}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen name="EditBusiness" component={EditBusiness} />
      <Stack.Screen name="RegisterBusiness" component={RegisterBusiness} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
      <Stack.Screen name="PaymentFailure" component={PaymentFailure} />
      <Stack.Screen name="MyEventBookings" component={MyEventBookings} />
      <Stack.Screen
        name="EventPaymentSuccess"
        component={EventPaymentSuccess}
      />
      <Stack.Screen
        name="EventPaymentFailure"
        component={EventPaymentFailure}
      />
      <Stack.Screen name="EventsManagement" component={EventsManagement} />
      <Stack.Screen name="EventBookingFlow" component={EventBookingFlow} />
      <Stack.Screen name="DonationBooking" component={DonationBookingScreen} />
      <Stack.Screen
        name="DonationPaymentSuccess"
        component={DonationPaymentSuccess}
      />
      <Stack.Screen
        name="DonationPaymentFailure"
        component={DonationPaymentFailure}
      />
      <Stack.Screen name="MyDonations" component={MyDonationsScreen} />
      <Stack.Screen name="DonationDetails" component={DonationDetailsScreen} />
      <Stack.Screen name="Jobs" component={JobsScreen}/>
    </Stack.Navigator>
  );
}

// ✅ FIXED: Admin Stack Navigator
function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="AdminMain" component={AdminNavigation} />
      <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} />
      <Stack.Screen
        name="AdminSubcategories"
        component={AdminSubcategoriesManager}
      />
      <Stack.Screen
        name="AdminDonationDetails"
        component={AdminDonationDetails}
      />
      <Stack.Screen
        name="UserChat"
        component={Chat}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
}

// ✅ FIXED: Unauthenticated Stack Navigator
function UnauthenticatedStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Landing" component={LandingPage} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
    </Stack.Navigator>
  );
}

// ✅ FIXED: Loading Screen Component
function LoadingScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <ActivityIndicator size="large" color="#8BC34A" />
      <Text className="text-gray-700 text-base mt-4">
        Initializing ServeNest...
      </Text>
      <Text className="text-gray-500 text-sm mt-2">
        Please wait while we set up your experience
      </Text>
    </View>
  );
}

export default function RootNavigation() {
  // ✅ FIXED: Enhanced state management
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const checkInProgressRef = useRef(false);

  // ✅ FIXED: Enhanced authentication check
  const checkAuthenticationStatus = useCallback(async (skipLoading = false) => {
    // Prevent multiple simultaneous checks
    if (checkInProgressRef.current) {
      console.log('🔄 Auth check already in progress, skipping...');
      return;
    }

    checkInProgressRef.current = true;

    try {
      if (!skipLoading) {
        setIsLoading(true);
      }

      console.log('🔍 Checking authentication status...');

      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('authToken');

      if (!token) {
        console.log('❌ No token found - user not authenticated');
        setIsAuthenticated(false);
        setIsAdmin(false);
        return;
      }

      console.log('✅ Token found:', token.substring(0, 10) + '...');

      // ✅ ENHANCED: Verify token validity by checking user document
      try {
        const userDocRef = doc(db, 'Users', token);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.log('❌ User document not found - invalid token');
          // Clear invalid token
          await AsyncStorage.multiRemove(['authToken', 'userRole', 'userInfo']);
          setIsAuthenticated(false);
          setIsAdmin(false);
          return;
        }

        const userData = userDoc.data();
        console.log('👤 User document found:', {
          uid: token.substring(0, 10) + '...',
          isAdmin: userData.isAdmin,
          isActive: userData.isActive,
        });

        // Check if user is active
        if (userData.isActive === false) {
          console.log('❌ User account is inactive');
          await AsyncStorage.multiRemove(['authToken', 'userRole', 'userInfo']);
          setIsAuthenticated(false);
          setIsAdmin(false);
          Alert.alert(
            'Account Inactive',
            'Your account has been deactivated. Please contact support.',
          );
          return;
        }

        // Set authentication status
        setIsAuthenticated(true);

        // ✅ CRITICAL: Check admin status from Firestore
        if (userData.isAdmin === true) {
          console.log('👑 Admin user detected');
          await AsyncStorage.setItem('userRole', 'admin');
          setIsAdmin(true);
        } else {
          console.log('👤 Regular user detected');
          await AsyncStorage.removeItem('userRole');
          setIsAdmin(false);
        }
      } catch (firestoreError) {
        console.error('❌ Error checking user document:', firestoreError);
        // If Firestore check fails, still allow authentication but assume regular user
        setIsAuthenticated(true);
        setIsAdmin(false);
        await AsyncStorage.removeItem('userRole');
      }
    } catch (error) {
      console.error('❌ Error checking authentication:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      // Clear potentially corrupted data
      await AsyncStorage.multiRemove(['authToken', 'userRole', 'userInfo']);
    } finally {
      if (!skipLoading) {
        setIsLoading(false);
      }
      checkInProgressRef.current = false;
    }
  }, []);

  // ✅ FIXED: Listen for auth events from login
  useEffect(() => {
    const unsubscribe = authEventEmitter.addListener(() => {
      console.log('🔔 Auth event received, checking authentication...');
      checkAuthenticationStatus(true); // Skip loading for immediate check
    });

    return unsubscribe;
  }, [checkAuthenticationStatus]);

  // ✅ FIXED: Initial authentication check
  useEffect(() => {
    checkAuthenticationStatus();
  }, [checkAuthenticationStatus]);

  // ✅ FIXED: App state change handler
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active') {
        console.log('📱 App became active, checking auth...');
        checkAuthenticationStatus(true);
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [checkAuthenticationStatus]);

  // ✅ FIXED: Periodic token validation (reduced interval)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('⏰ Periodic auth check...');
      checkAuthenticationStatus(true);
    }, 30 * 1000); // Check every 30 seconds instead of 5 minutes

    return () => clearInterval(interval);
  }, [checkAuthenticationStatus]);

  // ✅ FIXED: Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  console.log('🎯 Navigation decision:', {
    isAuthenticated,
    isAdmin,
    stack: isAuthenticated
      ? isAdmin
        ? 'AdminStack'
        : 'UserStack'
      : 'UnauthenticatedStack',
  });

  // ✅ REMOVED: NavigationContainer wrapper - now handled in App.tsx
  return (
    <>
      {isAuthenticated ? (
        // ✅ User is authenticated - check if admin or regular user
        isAdmin ? (
          // ✅ Admin user - show admin stack
          <AdminStack />
        ) : (
          // ✅ Regular user - show user stack
          <UserStack />
        )
      ) : (
        // ✅ User is not authenticated - show unauthenticated stack
        <UnauthenticatedStack />
      )}
    </>
  );
}
