/* eslint-disable react/no-unstable-nested-components */
import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {View, ActivityIndicator, Text, Alert} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import BookingDetailsScreen from '../screens/events/BookingDetailsScreen';
import ErrorBoundary from '../components/ErrorBoundary';
import auth from '@react-native-firebase/auth';
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
import Contacts from '../screens/Contacts';
import JobsScreen from '../screens/UserJobs';
import EventsScreen from '../screens/events/EventsScreen';
import EventDetailsScreen from '../screens/events/EventDetailsScreen';
import EventBookingScreen from '../screens/events/EventBookingScreen';
import EventPaymentSuccess from '../screens/events/EventPaymentSuccess';
import EventPaymentFailure from '../screens/events/EventPaymentFailure';
import MyEventBookings from '../screens/events/MyEventBookings';
import DonationsPage from '../screens/donations/DonationsPage';
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
import '../i18n'; // Import i18n configuration
import DonationPaymentSuccess from '../screens/donations/DonationPaymentSuccess';
import DonationBookingScreen from '../screens/donations/DonationBookingScreen';
import DonationPaymentFailure from '../screens/donations/DonationPaymentFailure';
import MyDonationsScreen from '../screens/donations/MyDonationsScreen';
import DonationDetailsScreen from '../screens/donations/DonationDetailsScreen';
import AdminDonationDetails from '../screens/admin/DonationDetails';
// User Drawer Navigator
function UserDrawerNavigator() {
  const navigation = useNavigation();
  const ChatStack = createNativeStackNavigator();
  function ChatStackNavigator() {
    return (
      <ChatStack.Navigator options={{headerShown: false}}>
        <ChatStack.Screen
          name="Contacts"
          component={Contacts}
          options={{headerShown: false, title: 'Chats'}}
        />
        <ChatStack.Screen
          name="Chat"
          component={Chat}
          options={{
            title: 'Chat',
            headerShown: false,
          }}
        />
      </ChatStack.Navigator>
    );
  }
  const EventsStack = createNativeStackNavigator();
  function EventsStackNavigator() {
    return (
      <EventsStack.Navigator screenOptions={{headerShown: false}}>
        <EventsStack.Screen
          name="EventsList"
          options={{headerShown: false, title: 'Events'}}>
          {() => (
            <ErrorBoundary>
              <EventsScreen />
            </ErrorBoundary>
          )}
        </EventsStack.Screen>

        <EventsStack.Screen
          name="EventDetails"
          options={{headerShown: false, title: 'Event Details'}}>
          {() => (
            <ErrorBoundary>
              <EventDetailsScreen />
            </ErrorBoundary>
          )}
        </EventsStack.Screen>

        <EventsStack.Screen
          name="EventBooking"
          options={{headerShown: false, title: 'Book Tickets'}}>
          {() => (
            <ErrorBoundary>
              <EventBookingScreen />
            </ErrorBoundary>
          )}
        </EventsStack.Screen>

        <EventsStack.Screen
          name="EventPaymentSuccess"
          options={{headerShown: false}}>
          {() => (
            <ErrorBoundary>
              <EventPaymentSuccess />
            </ErrorBoundary>
          )}
        </EventsStack.Screen>

        <EventsStack.Screen
          name="EventPaymentFailure"
          options={{headerShown: false}}>
          {() => (
            <ErrorBoundary>
              <EventPaymentFailure />
            </ErrorBoundary>
          )}
        </EventsStack.Screen>

        <EventsStack.Screen
          name="MyEventBookings"
          options={{headerShown: false}}>
          {() => (
            <ErrorBoundary>
              <MyEventBookings />
            </ErrorBoundary>
          )}
        </EventsStack.Screen>
      </EventsStack.Navigator>
    );
  }
  const LogoutComponent = () => {
    // ✅ UPDATED: Use React Native Firebase auth syntax
    const performLogout = async () => {
      try {
        console.log('Starting logout process...');

        // ✅ Use React Native Firebase auth syntax
        await auth().signOut();

        // Clear AsyncStorage
        await AsyncStorage.multiRemove(['authToken', 'userRole']);

        console.log('Logout successful');

        // Navigate to landing
        navigation.reset({
          index: 0,
          routes: [{name: 'Landing'}],
        });
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
        name="Chats"
        component={ChatStackNavigator}
        options={{
          headerShown: false, // Hide Drawer header for this stack
          title: 'Chats',
          drawerIcon: ({color, size}) => (
            <Icon name="chat" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Events"
        component={EventsStackNavigator}
        options={{
          headerShown: false, // Let the stack handle headers
          title: 'Events',
          drawerIcon: ({color, size}) => (
            <Icon name="event" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="My Event Bookings"
        component={MyEventBookings}
        options={{
          title: 'My Bookings',
          drawerIcon: ({color, size}) => (
            <Icon name="confirmation-number" size={size} color={color} />
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
        name="My Donations"
        component={MyDonationsScreen}
        options={{
          title: 'My Donations',
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

export default function RootNavigation() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ✅ UPDATED: Enhanced authentication check with React Native Firebase
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Check AsyncStorage token
        const token = await AsyncStorage.getItem('authToken');

        // ✅ Check React Native Firebase auth state
        const currentUser = auth().currentUser;

        // User is logged in if both token and Firebase user exist
        const isAuthenticated = !!(token && currentUser);

        console.log(
          'Auth check - Token:',
          !!token,
          'Firebase User:',
          !!currentUser,
        );
        setIsLoggedIn(isAuthenticated);
      } catch (error) {
        console.error('Error checking auth state:', error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    // ✅ Listen to React Native Firebase auth state changes
    const unsubscribe = auth().onAuthStateChanged(user => {
      console.log('Auth state changed:', !!user);
      if (!isLoading) {
        checkAuthState();
      }
    });

    checkAuthState();

    return () => unsubscribe();
  }, [isLoading]);

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
            <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
            <Stack.Screen name="EventBooking" component={EventBookingScreen} />

            <Stack.Screen
              name="DonationBooking"
              component={DonationBookingScreen}
            />
            <Stack.Screen
              name="DonationPaymentSuccess"
              component={DonationPaymentSuccess}
            />
            <Stack.Screen
              name="DonationPaymentFailure"
              component={DonationPaymentFailure}
            />
            <Stack.Screen name="MyDonations" component={MyDonationsScreen} />
            <Stack.Screen
              name="DonationDetails"
              component={DonationDetailsScreen}
            />

            <Stack.Screen
              name="BookingDetails"
              component={BookingDetailsScreen}
            />
            <Stack.Screen
              name="AdminCategories"
              component={AdminCategoriesScreen}
            />

            {/* ✅ FIXED: Removed duplicate Notifications screen from Stack */}
            {/* Admin notifications are handled within AdminNavigation */}

            <Stack.Screen
              name="AdminSubcategories"
              component={AdminSubcategoriesManager}
            />
            <Stack.Screen
              name="AdminDonationDetails"
              component={AdminDonationDetails}
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
