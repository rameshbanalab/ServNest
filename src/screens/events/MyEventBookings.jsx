import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {db} from '../../config/firebaseConfig';
import {collection, query, where, getDocs, orderBy} from 'firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function MyEventBookings() {
  const navigation = useNavigation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's event bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = auth().currentUser;
      if (!currentUser) {
        navigation.navigate('Login');
        return;
      }

      const bookingsQuery = query(
        collection(db, 'EventBookings'),
        where('userId', '==', currentUser.uid),
        orderBy('bookingDate', 'desc'),
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);

      if (!bookingsSnapshot.empty) {
        const bookingsData = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBookings(bookingsData);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  // Load bookings on component mount
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings]),
  );

  // Format date utility
  const formatDate = dateString => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      return 'Date TBD';
    }
  };

  // Format booking date
  const formatBookingDate = timestamp => {
    try {
      if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return new Date(timestamp).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Date TBD';
    }
  };

  // Get status color
  const getStatusColor = status => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Render booking card
  const renderBookingCard = booking => (
    <View
      key={booking.id}
      className="bg-white rounded-2xl p-4 shadow-sm mb-4 mx-4">
      {/* Header with status */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-gray-800 font-bold text-lg" numberOfLines={1}>
          {booking.eventDetails?.title || 'Event Booking'}
        </Text>
        <View
          className={`px-3 py-1 rounded-full ${getStatusColor(
            booking.status,
          )}`}>
          <Text className="text-xs font-semibold capitalize">
            {booking.status || 'Unknown'}
          </Text>
        </View>
      </View>

      {/* Event details */}
      <View className="space-y-2 mb-4">
        <View className="flex-row items-center">
          <Icon name="event" size={16} color="#8BC34A" />
          <Text className="text-gray-600 ml-2">
            {formatDate(booking.eventDetails?.date)}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Icon name="schedule" size={16} color="#8BC34A" />
          <Text className="text-gray-600 ml-2">
            {booking.eventDetails?.startTime} - {booking.eventDetails?.endTime}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Icon name="location-on" size={16} color="#8BC34A" />
          <Text className="text-gray-600 ml-2" numberOfLines={1}>
            {booking.eventDetails?.venue || 'Venue TBD'}
          </Text>
        </View>
      </View>

      {/* Booking info */}
      <View className="border-t border-gray-200 pt-3 space-y-2">
        <View className="flex-row justify-between">
          <Text className="text-gray-600 text-sm">Booking ID:</Text>
          <Text className="text-gray-800 text-sm font-medium">
            {booking.bookingId}
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-gray-600 text-sm">Booked on:</Text>
          <Text className="text-gray-800 text-sm font-medium">
            {formatBookingDate(booking.bookingDate)}
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-gray-600 text-sm">Amount:</Text>
          <Text className="text-primary text-sm font-bold">
            {booking.totalAmount > 0 ? `₹${booking.totalAmount}` : 'Free'}
          </Text>
        </View>

        {/* Tickets info */}
        {booking.tickets && booking.tickets.length > 0 && (
          <View className="mt-2">
            <Text className="text-gray-600 text-sm mb-1">Tickets:</Text>
            {booking.tickets.map((ticket, index) => (
              <Text key={index} className="text-gray-800 text-sm">
                • {ticket.quantity}x {ticket.type} ticket(s)
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View className="flex-row justify-between mt-4">
        <TouchableOpacity
          className="bg-primary/10 rounded-lg px-4 py-2 flex-1 mr-2"
          onPress={() => {
            Alert.alert(
              'QR Code',
              'Your QR code will be displayed here for entry.',
              [{text: 'OK'}],
            );
          }}>
          <Text className="text-primary font-medium text-center">
            View QR Code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-gray-100 rounded-lg px-4 py-2 flex-1 ml-2"
          onPress={() => {
            Alert.alert(
              'Booking Details',
              `Booking ID: ${booking.bookingId}\nEvent: ${booking.eventDetails?.title}\nStatus: ${booking.status}`,
              [{text: 'OK'}],
            );
          }}>
          <Text className="text-gray-700 font-medium text-center">Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="mt-4 text-gray-600">Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 text-xl font-bold">
            My Event Bookings
          </Text>
          <TouchableOpacity onPress={onRefresh}>
            <Icon name="refresh" size={24} color="#8BC34A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8BC34A']}
            tintColor="#8BC34A"
          />
        }>
        {error ? (
          <View className="flex-1 justify-center items-center py-12">
            <Icon name="error-outline" size={64} color="#EF4444" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              {error}
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-xl px-6 py-3 mt-4"
              onPress={fetchBookings}>
              <Text className="text-white font-bold">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : bookings.length === 0 ? (
          <View className="flex-1 justify-center items-center py-12">
            <Icon name="event-busy" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              No bookings found
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              You haven't booked any events yet. Explore events and make your
              first booking!
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-xl px-6 py-3 mt-6"
              onPress={() => navigation.navigate('EventsManagement')}>
              <Text className="text-white font-bold">Browse Events</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="py-4">{bookings.map(renderBookingCard)}</View>
        )}
      </ScrollView>
    </View>
  );
}
