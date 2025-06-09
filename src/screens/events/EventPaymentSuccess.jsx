import React, {useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StatusBar,
  ScrollView,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function EventPaymentSuccess() {
  const navigation = useNavigation();
  const route = useRoute();
  const {paymentData, bookingData, eventData} = route.params || {};

  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Animation for success icon
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const goToMyBookings = () => {
    navigation.replace('MyEventBookings');
  };

  const goToEvents = () => {
    navigation.replace('Events');
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <ScrollView className="flex-1">
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#16A34A" />

        {/* Header */}
        <View className="bg-green-500 px-6 py-8">
          <View className="items-center">
            <Animated.View
              style={{
                transform: [{scale: scaleAnim}],
              }}
              className="bg-white rounded-full p-4 mb-4">
              <Icon name="check-circle" size={48} color="#16A34A" />
            </Animated.View>
            <Text className="text-white font-bold text-2xl mb-2">
              Booking Confirmed!
            </Text>
            <Text className="text-green-100 text-center">
              Your event booking has been processed successfully
            </Text>
          </View>
        </View>

        <Animated.View style={{opacity: fadeAnim}} className="flex-1 px-6 py-8">
          {/* Booking Details Card */}
          <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Booking Details
            </Text>

            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Booking ID</Text>
                <Text className="text-gray-800 font-medium">
                  {bookingData?.bookingId || 'N/A'}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Payment ID</Text>
                <Text className="text-gray-800 font-medium">
                  {paymentData?.paymentId || 'N/A'}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Amount Paid</Text>
                <Text className="text-green-600 font-bold text-lg">
                  ₹{paymentData?.amount || bookingData?.totalAmount || '0'}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Booking Date</Text>
                <Text className="text-gray-800 font-medium">
                  {new Date().toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Status</Text>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-700 font-semibold text-sm">
                    Confirmed
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Event Details Card */}
          <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Event Details
            </Text>

            <View className="space-y-3">
              <View>
                <Text className="text-gray-600 text-sm">Event Name</Text>
                <Text className="text-gray-800 font-medium">
                  {eventData?.title || 'Event'}
                </Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm">Date & Time</Text>
                <Text className="text-gray-800 font-medium">
                  {eventData?.date ? formatDate(eventData.date) : 'TBD'}
                </Text>
                <Text className="text-gray-600 text-sm">
                  {eventData?.startTime} - {eventData?.endTime}
                </Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm">Venue</Text>
                <Text className="text-gray-800 font-medium">
                  {eventData?.location?.venue || 'TBD'}
                </Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm">Attendee</Text>
                <Text className="text-gray-800 font-medium">
                  {bookingData?.userName || 'Guest'}
                </Text>
              </View>
            </View>
          </View>

          {/* Ticket Information */}
          <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Ticket Information
            </Text>

            <View className="space-y-3">
              {bookingData?.tickets?.map((ticket, index) => (
                <View
                  key={index}
                  className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-gray-800 font-medium capitalize">
                      {ticket.type} Ticket x {ticket.quantity}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      ₹{ticket.price} each
                    </Text>
                  </View>
                  <Text className="text-gray-800 font-bold">
                    ₹{ticket.totalPrice}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* QR Code Section */}
          <View className="bg-blue-50 rounded-2xl p-6 border border-blue-200 mb-6">
            <View className="flex-row items-center mb-3">
              <Icon name="qr-code" size={20} color="#2563EB" />
              <Text className="text-blue-800 font-bold text-base ml-2">
                Your E-Ticket
              </Text>
            </View>
            <Text className="text-blue-700 text-sm mb-3">
              QR Code: {bookingData?.qrCode || 'Generated'}
            </Text>
            <Text className="text-blue-600 text-xs">
              Show this QR code at the venue for entry. A confirmation email has
              been sent to {bookingData?.userEmail}.
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="space-y-4 mt-auto">
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 shadow-lg"
              style={{
                shadowColor: '#8BC34A',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
              onPress={goToMyBookings}>
              <Text className="text-white font-bold text-center text-base">
                View My Bookings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-100 rounded-2xl py-4"
              onPress={goToEvents}>
              <Text className="text-gray-700 font-bold text-center text-base">
                Browse More Events
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
