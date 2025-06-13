/* eslint-disable react-hooks/exhaustive-deps */
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

export default function EventPaymentFailure() {
  const navigation = useNavigation();
  const route = useRoute();
  const {errorData, eventData, bookingData} = route.params || {};

  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Animation for error icon
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

  const retryPayment = () => {
    navigation.goBack(); // Go back to booking screen
  };

  const goToEvents = () => {
    navigation.navigate('Events');
  };

  return (
    <ScrollView className="flex-1">
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

        {/* Header */}
        <View className="bg-red-500 px-6 py-8">
          <View className="items-center">
            <Animated.View
              style={{
                transform: [{scale: scaleAnim}],
              }}
              className="bg-white rounded-full p-4 mb-4">
              <Icon name="error" size={48} color="#DC2626" />
            </Animated.View>
            <Text className="text-white font-bold text-2xl mb-2">
              Payment Failed
            </Text>
            <Text className="text-red-100 text-center">
              Your payment could not be processed
            </Text>
          </View>
        </View>

        <Animated.View style={{opacity: fadeAnim}} className="flex-1 px-6 py-8">
          {/* Error Details Card */}
          <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              What happened?
            </Text>

            <View className="space-y-3">
              <View className="flex-row items-center">
                <Icon name="info" size={20} color="#F59E0B" />
                <Text className="text-gray-600 ml-3 flex-1">
                  {errorData?.error ||
                    'Payment processing failed. This could be due to insufficient funds, network issues, or payment gateway problems.'}
                </Text>
              </View>

              {errorData?.code && (
                <View className="bg-gray-50 rounded-lg p-3">
                  <Text className="text-gray-600 text-sm">
                    Error Code: {errorData.code}
                  </Text>
                </View>
              )}
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
                <Text className="text-gray-600 text-sm">Amount</Text>
                <Text className="text-gray-800 font-medium">
                  ₹{bookingData?.totalAmount || '0'}
                </Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm">Booking Status</Text>
                <View className="bg-red-100 px-3 py-1 rounded-full mt-1 self-start">
                  <Text className="text-red-700 font-semibold text-sm">
                    Payment Failed
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Help Section */}
          <View className="bg-blue-50 rounded-2xl p-6 border border-blue-200 mb-6">
            <View className="flex-row items-center mb-3">
              <Icon name="help-outline" size={20} color="#2563EB" />
              <Text className="text-blue-800 font-bold text-base ml-2">
                Need Help?
              </Text>
            </View>
            <Text className="text-blue-700 text-sm mb-3">
              If you continue to face issues, please try:
            </Text>
            <View className="space-y-1">
              <Text className="text-blue-600 text-sm">
                • Check your internet connection
              </Text>
              <Text className="text-blue-600 text-sm">
                • Verify your payment method
              </Text>
              <Text className="text-blue-600 text-sm">
                • Try a different payment option
              </Text>
              <Text className="text-blue-600 text-sm">
                • Contact our support team
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="space-y-4 mt-auto">
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 shadow-lg"
              style={{
                shadowColor: '#FF4500',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
              onPress={retryPayment}>
              <Text className="text-white font-bold text-center text-base">
                Try Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-100 rounded-2xl py-4"
              onPress={goToEvents}>
              <Text className="text-gray-700 font-bold text-center text-base">
                Browse Other Events
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
