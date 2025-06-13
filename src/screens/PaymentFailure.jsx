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
import {CommonActions} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function PaymentFailure() {
  const navigation = useNavigation();
  const route = useRoute();
  const {errorData, businessData} = route.params || {};

  const shakeAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Animation for failure icon
    Animated.sequence([
      Animated.timing(shakeAnim, {
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

  const getErrorMessage = () => {
    if (errorData?.error) {
      return errorData.error;
    }

    switch (errorData?.code) {
      case 'BAD_REQUEST_ERROR':
        return 'Invalid payment request. Please try again.';
      case 'GATEWAY_ERROR':
        return 'Payment gateway error. Please try again.';
      case 'NETWORK_ERROR':
        return 'Network connection error. Please check your internet.';
      default:
        return 'Payment could not be processed. Please try again.';
    }
  };

  const retryPayment = () => {
    // Normal back navigation - user can return to register business
    navigation.goBack();
  };

  const goToHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'Home'}],
      }),
    );
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
                transform: [
                  {
                    rotate: shakeAnim.interpolate({
                      inputRange: [0, 0.25, 0.5, 0.75, 1],
                      outputRange: ['0deg', '-5deg', '0deg', '5deg', '0deg'],
                    }),
                  },
                ],
              }}
              className="bg-white rounded-full p-4 mb-4">
              <Icon name="error" size={48} color="#DC2626" />
            </Animated.View>
            <Text className="text-white font-bold text-2xl mb-2">
              Payment Failed
            </Text>
            <Text className="text-red-100 text-center">
              Your payment could not be processed at this time
            </Text>
          </View>
        </View>

        <Animated.View style={{opacity: fadeAnim}} className="flex-1 px-6 py-8">
          {/* Error Details Card */}
          <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Error Details
            </Text>

            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <View className="flex-row items-start">
                <Icon name="error-outline" size={20} color="#DC2626" />
                <View className="ml-3 flex-1">
                  <Text className="text-red-800 font-medium text-sm">
                    {getErrorMessage()}
                  </Text>
                  {errorData?.code && (
                    <Text className="text-red-600 text-xs mt-1">
                      Error Code: {errorData.code}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Attempted Amount</Text>
                <Text className="text-gray-800 font-medium">
                  ₹{businessData?.amount || '150'}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Attempt Time</Text>
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
                <View className="bg-red-100 px-3 py-1 rounded-full">
                  <Text className="text-red-700 font-semibold text-sm">
                    Failed
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Business Details Card */}
          <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Business Registration (Pending Payment)
            </Text>

            <View className="space-y-3">
              <View>
                <Text className="text-gray-600 text-sm">Business Name</Text>
                <Text className="text-gray-800 font-medium">
                  {businessData?.businessName || 'Your Business'}
                </Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm">Owner Name</Text>
                <Text className="text-gray-800 font-medium">
                  {businessData?.ownerName || 'Business Owner'}
                </Text>
              </View>

              <View>
                <Text className="text-gray-600 text-sm">
                  Registration Status
                </Text>
                <View className="bg-yellow-100 px-3 py-1 rounded-full mt-1 self-start">
                  <Text className="text-yellow-700 font-semibold text-sm">
                    Payment Required
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Troubleshooting Card */}
          <View className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200 mb-6">
            <View className="flex-row items-center mb-3">
              <Icon name="lightbulb-outline" size={20} color="#D97706" />
              <Text className="text-yellow-800 font-bold text-base ml-2">
                Troubleshooting Tips
              </Text>
            </View>

            <View className="space-y-2">
              <Text className="text-yellow-700 text-sm">
                • Check your internet connection
              </Text>
              <Text className="text-yellow-700 text-sm">
                • Ensure sufficient balance in your account
              </Text>
              <Text className="text-yellow-700 text-sm">
                • Try using a different payment method
              </Text>
              <Text className="text-yellow-700 text-sm">
                • Contact your bank if the issue persists
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
                Retry Payment
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-blue-100 rounded-2xl py-4"
              onPress={() => navigation.navigate('Help')}>
              <Text className="text-blue-700 font-bold text-center text-base">
                Contact Support
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
