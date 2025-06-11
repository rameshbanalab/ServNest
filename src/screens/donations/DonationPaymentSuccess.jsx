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

export default function DonationPaymentSuccess() {
  const navigation = useNavigation();
  const route = useRoute();
  const {paymentData, donationData, donationCause} = route.params || {};

  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
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

  const goToDonations = () => {
    navigation.replace('My Donations');
  };

  const goToHome = () => {
    navigation.replace('Main');
  };

  return (
    <ScrollView className="flex-1">
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#10B981" />

        {/* Header */}
        <View className="bg-green-500 px-6 py-8">
          <View className="items-center">
            <Animated.View
              style={{transform: [{scale: scaleAnim}]}}
              className="bg-white rounded-full p-4 mb-4">
              <Icon name="favorite" size={48} color="#10B981" />
            </Animated.View>
            <Text className="text-white font-bold text-2xl mb-2">
              Thank You! 💚
            </Text>
            <Text className="text-green-100 text-center">
              Your donation has been processed successfully
            </Text>
          </View>
        </View>

        <Animated.View style={{opacity: fadeAnim}} className="flex-1 px-6 py-8">
          {/* Donation Details */}
          <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Donation Details
            </Text>

            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Donation ID</Text>
                <Text className="text-gray-800 font-medium">
                  {donationData?.donationId || 'N/A'}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Payment ID</Text>
                <Text className="text-gray-800 font-medium">
                  {paymentData?.paymentId || 'N/A'}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Amount Donated</Text>
                <Text className="text-green-600 font-bold text-lg">
                  ₹{paymentData?.amount || donationData?.amount || '0'}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Donation Date</Text>
                <Text className="text-gray-800 font-medium">
                  {new Date().toLocaleDateString('en-IN')}
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

          {/* Cause Details */}
          <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Donation Cause
            </Text>
            <Text className="text-gray-800 font-medium text-lg mb-2">
              {donationCause?.title || 'Donation Cause'}
            </Text>
            <Text className="text-gray-600">
              {donationCause?.description ||
                'Thank you for your generous donation.'}
            </Text>
          </View>

          {/* Impact Message */}
          <View className="bg-blue-50 rounded-2xl p-6 border border-blue-200 mb-6">
            <View className="flex-row items-center mb-3">
              <Icon name="volunteer-activism" size={20} color="#2563EB" />
              <Text className="text-blue-800 font-bold text-base ml-2">
                Your Impact
              </Text>
            </View>
            <Text className="text-blue-700 text-sm">
              Your generous donation of ₹{donationData?.amount} will make a real
              difference. Thank you for supporting this important cause and
              helping us create positive change in the community.
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="space-y-4 mt-auto">
            <TouchableOpacity
              className="bg-green-500 rounded-2xl py-4 shadow-lg"
              onPress={goToDonations}>
              <Text className="text-white font-bold text-center text-base">
                Make Another Donation
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-100 rounded-2xl py-4"
              onPress={goToHome}>
              <Text className="text-gray-700 font-bold text-center text-base">
                Go to Home
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
