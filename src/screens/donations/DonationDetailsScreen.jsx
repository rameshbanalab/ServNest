import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useRoute} from '@react-navigation/native';

export default function DonationDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {donation} = route.params || {};

  if (!donation) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Icon name="error-outline" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4">
          Donation details not found
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Share donation
  const shareDonation = async () => {
    try {
      await Share.share({
        message: `I just donated ₹${donation.amount} to "${donation.donationDetails?.title}" through ServeNest. Join me in making a difference!`,
        title: 'My Donation',
      });
    } catch (error) {
      console.error('Error sharing donation:', error);
    }
  };

  // Get tax receipt (placeholder)
  const getTaxReceipt = () => {
    Alert.alert(
      'Tax Receipt',
      'Tax receipt will be sent to your registered email address within 7 business days.',
      [{text: 'OK'}],
    );
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
            Donation Details
          </Text>

          <TouchableOpacity onPress={shareDonation}>
            <Icon name="share" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4 space-y-6">
          {/* Donation Summary */}
          <View className="bg-white rounded-2xl p-6 shadow-sm">
            <View className="items-center mb-4">
              <View className="bg-green-100 rounded-full p-4 mb-3">
                <Icon name="favorite" size={32} color="#10B981" />
              </View>
              <Text className="text-2xl font-bold text-green-600">
                ₹{donation.amount}
              </Text>
              <Text className="text-gray-600">Donation Amount</Text>
            </View>

            <View className="bg-green-50 rounded-lg p-3">
              <Text className="text-green-800 text-center font-medium">
                Thank you for your generous contribution!
              </Text>
            </View>
          </View>

          {/* Donation Information */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Donation Information
            </Text>

            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Donation ID</Text>
                <Text className="text-gray-800 font-medium">
                  {donation.donationId}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Date & Time</Text>
                <Text className="text-gray-800 font-medium">
                  {formatDate(donation.donationDate)}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Status</Text>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-700 font-semibold text-sm capitalize">
                    {donation.status}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Donor Name</Text>
                <Text className="text-gray-800 font-medium">
                  {donation.isAnonymous ? 'Anonymous' : donation.donorName}
                </Text>
              </View>
            </View>
          </View>

          {/* Cause Details */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Cause Details
            </Text>

            <Text className="text-gray-800 font-medium text-lg mb-2">
              {donation.donationDetails?.title || 'Donation Cause'}
            </Text>
            <Text className="text-gray-600 leading-6">
              {donation.donationDetails?.description ||
                'Thank you for supporting this cause.'}
            </Text>
          </View>

          {/* Message */}
          {donation.message && (
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-gray-800 font-bold text-lg mb-3">
                Your Message
              </Text>
              <View className="bg-blue-50 rounded-lg p-3">
                <Text className="text-blue-800 italic">
                  "{donation.message}"
                </Text>
              </View>
            </View>
          )}

          {/* Payment Details */}
          {donation.payment && (
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-gray-800 font-bold text-lg mb-4">
                Payment Details
              </Text>

              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Payment ID</Text>
                  <Text className="text-gray-800 font-medium">
                    {donation.payment.paymentId}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Method</Text>
                  <Text className="text-gray-800 font-medium capitalize">
                    {donation.payment.method}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Status</Text>
                  <Text className="text-green-600 font-medium capitalize">
                    {donation.payment.status}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
