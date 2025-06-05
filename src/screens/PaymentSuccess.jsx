/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect} from 'react';
import {View, Text, TouchableOpacity, Animated, StatusBar, ScrollView} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {CommonActions} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function PaymentSuccess() {
  const navigation = useNavigation();
  const route = useRoute();
  const {paymentData, businessData} = route.params || {};

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

  const goToMyBusinesses = () => {
    // Use replace to prevent going back
    navigation.replace('Main', {
      screen: 'My Businesses',
    });
  };

  const goToHome = () => {
    // Use replace to prevent going back
    navigation.replace('Main');
  };

  return (
    <ScrollView className='flex-1'>
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
            Payment Successful!
          </Text>
          <Text className="text-green-100 text-center">
            Your business registration payment has been processed successfully
          </Text>
        </View>
      </View>

      <Animated.View style={{opacity: fadeAnim}} className="flex-1 px-6 py-8">
        {/* Payment Details Card */}
        <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <Text className="text-gray-800 font-bold text-lg mb-4">
            Payment Details
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Payment ID</Text>
              <Text className="text-gray-800 font-medium">
                {paymentData?.paymentId || 'N/A'}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-600">Amount Paid</Text>
              <Text className="text-green-600 font-bold text-lg">
                ₹{paymentData?.amount || '150'}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-600">Transaction Date</Text>
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
                  Completed
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Business Details Card */}
        <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <Text className="text-gray-800 font-bold text-lg mb-4">
            Business Registration
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
              <Text className="text-gray-600 text-sm">Status</Text>
              <View className="bg-green-100 px-3 py-1 rounded-full mt-1 self-start">
                <Text className="text-green-700 font-semibold text-sm">
                  Live & Active
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Success Message Card */}
        <View className="bg-blue-50 rounded-2xl p-6 border border-blue-200 mb-6">
          <View className="flex-row items-center mb-3">
            <Icon name="celebration" size={20} color="#2563EB" />
            <Text className="text-blue-800 font-bold text-base ml-2">
              Congratulations!
            </Text>
          </View>
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
            onPress={goToMyBusinesses}>
            <Text className="text-white font-bold text-center text-base">
              View My Businesses
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
    </View></ScrollView>
  );
}
