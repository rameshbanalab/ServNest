import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useRoute} from '@react-navigation/native';

export default function BookingDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {booking} = route.params || {};

  if (!booking) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Icon name="error" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4">
          Booking details not found
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-xl px-6 py-3 mt-4"
          onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Format date
  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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

  // Open maps for directions
  const openMaps = () => {
    const address = booking.eventDetails?.address || '';
    const venue = booking.eventDetails?.venue || '';
    const query = encodeURIComponent(`${venue}, ${address}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open maps');
    });
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-gray-800 text-lg font-bold">
            Booking Details
          </Text>

          <View style={{width: 24}} />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4 space-y-6">
          {/* Status Card */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-800 font-bold text-lg">
                Booking Status
              </Text>
              <View
                className="px-3 py-1 rounded-full"
                style={{
                  backgroundColor: getStatusColor(booking.status) + '20',
                }}>
                <Text
                  className="text-sm font-medium capitalize"
                  style={{color: getStatusColor(booking.status)}}>
                  {booking.status}
                </Text>
              </View>
            </View>

            <View className="space-y-2">
              <Text className="text-gray-600 text-sm">
                Booking ID: {booking.bookingId}
              </Text>
              <Text className="text-gray-600 text-sm">
                Booked on:{' '}
                {new Date(booking.bookingDate).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Event Details */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Event Details
            </Text>

            <View className="space-y-3">
              <Text className="text-gray-800 font-medium text-lg">
                {booking.eventDetails?.title}
              </Text>

              <View className="flex-row items-center">
                <Icon name="event" size={16} color="#8BC34A" />
                <Text className="text-gray-600 ml-2">
                  {booking.eventDetails?.date
                    ? formatDate(booking.eventDetails.date)
                    : 'TBD'}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Icon name="schedule" size={16} color="#8BC34A" />
                <Text className="text-gray-600 ml-2">
                  {booking.eventDetails?.startTime} -{' '}
                  {booking.eventDetails?.endTime}
                </Text>
              </View>

              <TouchableOpacity
                className="flex-row items-center"
                onPress={openMaps}>
                <Icon name="location-on" size={16} color="#8BC34A" />
                <Text className="text-gray-600 ml-2 flex-1">
                  {booking.eventDetails?.venue}
                </Text>
                <Icon name="open-in-new" size={16} color="#8BC34A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ticket Information */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Ticket Information
            </Text>

            <View className="space-y-3">
              {booking.tickets?.map((ticket, index) => (
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

              <View className="border-t border-gray-200 pt-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-800 font-bold text-lg">
                    Total Amount
                  </Text>
                  <Text className="text-primary font-bold text-xl">
                    ₹{booking.totalAmount}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Payment Information */}
          {booking.payment && (
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-gray-800 font-bold text-lg mb-4">
                Payment Information
              </Text>

              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Payment ID</Text>
                  <Text className="text-gray-800 font-medium">
                    {booking.payment.paymentId}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Method</Text>
                  <Text className="text-gray-800 font-medium capitalize">
                    {booking.payment.method}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Status</Text>
                  <Text className="text-green-600 font-medium capitalize">
                    {booking.payment.status}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* QR Code */}
          <View className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
            <View className="flex-row items-center mb-3">
              <Icon name="qr-code" size={20} color="#2563EB" />
              <Text className="text-blue-800 font-bold text-base ml-2">
                Entry QR Code
              </Text>
            </View>
            <Text className="text-blue-700 text-sm mb-2">{booking.qrCode}</Text>
            <Text className="text-blue-600 text-xs">
              Show this QR code at the venue for entry
            </Text>
          </View>

          {/* Contact Information */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Contact Information
            </Text>

            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Name</Text>
                <Text className="text-gray-800 font-medium">
                  {booking.userName}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Email</Text>
                <Text className="text-gray-800 font-medium">
                  {booking.userEmail}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Phone</Text>
                <Text className="text-gray-800 font-medium">
                  {booking.userPhone}
                </Text>
              </View>

              {booking.emergencyContact && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Emergency Contact</Text>
                  <Text className="text-gray-800 font-medium">
                    {booking.emergencyContact}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Special Requests */}
          {booking.specialRequests && (
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-gray-800 font-bold text-lg mb-3">
                Special Requests
              </Text>
              <Text className="text-gray-600">{booking.specialRequests}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
