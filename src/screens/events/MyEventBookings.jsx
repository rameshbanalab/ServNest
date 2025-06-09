import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {db} from '../../config/firebaseConfig';
import {collection, getDocs, query, where, orderBy} from 'firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function MyEventBookings() {
  const navigation = useNavigation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user's bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const currentUser = auth().currentUser;

      if (!currentUser) {
        Alert.alert('Error', 'Please login to view your bookings');
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
          bookingDate: doc.data().bookingDate?.toDate?.() || new Date(),
        }));
        setBookings(bookingsData);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  // Refresh bookings
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Format date
  const formatDate = date => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get status color
  const getStatusColor = status => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Get payment status color
  const getPaymentStatusColor = status => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // ✅ FIXED: Navigate to booking details
  const viewBookingDetails = booking => {
    navigation.navigate('BookingDetails', {booking});
  };

  // Render booking card
  const renderBookingCard = booking => (
    <TouchableOpacity
      key={booking.id}
      className="bg-white rounded-2xl shadow-lg mb-4 mx-4 overflow-hidden"
      onPress={() => viewBookingDetails(booking)}>
      {/* Header */}
      <View className="p-4 border-b border-gray-100">
        <View className="flex-row justify-between items-start mb-2">
          <Text
            className="text-lg font-bold text-gray-800 flex-1 mr-2"
            numberOfLines={2}>
            {booking.eventDetails?.title || 'Event'}
          </Text>
          <View
            className="px-3 py-1 rounded-full"
            style={{backgroundColor: getStatusColor(booking.status) + '20'}}>
            <Text
              className="text-xs font-medium capitalize"
              style={{color: getStatusColor(booking.status)}}>
              {booking.status}
            </Text>
          </View>
        </View>

        <Text className="text-gray-600 text-sm mb-2">
          Booking ID: {booking.bookingId}
        </Text>

        {/* Event Details */}
        <View className="space-y-2">
          <View className="flex-row items-center">
            <Icon name="event" size={16} color="#8BC34A" />
            <Text className="text-gray-700 text-sm ml-2">
              {booking.eventDetails?.date
                ? formatDate(new Date(booking.eventDetails.date))
                : 'TBD'}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Icon name="schedule" size={16} color="#8BC34A" />
            <Text className="text-gray-700 text-sm ml-2">
              {booking.eventDetails?.startTime} -{' '}
              {booking.eventDetails?.endTime}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Icon name="location-on" size={16} color="#8BC34A" />
            <Text
              className="text-gray-700 text-sm ml-2 flex-1"
              numberOfLines={1}>
              {booking.eventDetails?.venue}
            </Text>
          </View>
        </View>
      </View>

      {/* Tickets Summary */}
      <View className="px-4 py-3 bg-gray-50">
        <Text className="text-gray-700 font-medium text-sm mb-2">Tickets:</Text>
        <View className="flex-row flex-wrap">
          {booking.tickets?.map((ticket, index) => (
            <View key={index} className="mr-4 mb-1">
              <Text className="text-xs text-gray-600 capitalize">
                {ticket.type}: {ticket.quantity}x ₹{ticket.price}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Payment & Booking Info */}
      <View className="flex-row p-4 justify-between items-center">
        <View>
          <Text className="text-gray-600 text-sm">Total Amount</Text>
          <Text className="text-primary font-bold text-lg">
            ₹{booking.totalAmount}
          </Text>
        </View>

        <View className="items-end">
          <View
            className="px-3 py-1 rounded-full mb-1"
            style={{
              backgroundColor:
                getPaymentStatusColor(booking.paymentStatus) + '20',
            }}>
            <Text
              className="text-xs font-medium capitalize"
              style={{color: getPaymentStatusColor(booking.paymentStatus)}}>
              {booking.paymentStatus}
            </Text>
          </View>
          <Text className="text-gray-500 text-xs">
            {formatDate(booking.bookingDate)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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

          <Text className="text-gray-800 text-xl font-bold">My Bookings</Text>

          <TouchableOpacity onPress={onRefresh}>
            <Icon name="refresh" size={24} color="#8BC34A" />
          </TouchableOpacity>
        </View>

        <Text className="text-gray-500 text-sm mt-2">
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Bookings List */}
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
        {bookings.length > 0 ? (
          <View className="py-4">{bookings.map(renderBookingCard)}</View>
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Icon name="event-busy" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              No Bookings Found
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              You haven't booked any events yet. Start exploring events to make
              your first booking!
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-xl px-6 py-3 mt-6"
              onPress={() => navigation.navigate('Events')}>
              <Text className="text-white font-bold">Browse Events</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
