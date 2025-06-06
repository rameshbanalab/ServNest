/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function LandingPage() {
  const navigation = useNavigation();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const buttonFadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, buttonFadeAnim]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{flexGrow: 1}}
        showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 py-10">
          {/* Hero Section */}
          <Animated.View
            className="flex-1 justify-center items-center mb-8"
            style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>
            {/* App Icon */}
            <View className="bg-primary-light rounded-full p-8 mb-6 shadow-lg">
              <Icon name="home-repair-service" size={64} color="#689F38" />
            </View>

            {/* App Title */}
            <Text className="text-gray-700 font-bold text-4xl mb-3">
              ServeNest
            </Text>
            <Text className="text-gray-400 text-lg text-center px-4 leading-relaxed">
              Discover local services and connect with ease
            </Text>

            {/* Features Section */}
            <View className="mt-8 space-y-4">
              <View className="flex-row mt-3 items-center">
                <View className="bg-primary-light rounded-full p-2 mr-3">
                  <Icon name="search" size={20} color="#689F38" />
                </View>
                <Text className="text-gray-600 text-base">
                  Find services near you
                </Text>
              </View>
              <View className="flex-row mt-3 items-center">
                <View className="bg-primary-light rounded-full p-2 mr-3">
                  <Icon name="verified" size={20} color="#689F38" />
                </View>
                <Text className="text-gray-600 text-base">
                  Verified service providers
                </Text>
              </View>
              <View className="flex-row mt-3 items-center">
                <View className="bg-primary-light rounded-full p-2 mr-3">
                  <Icon name="star" size={20} color="#689F38" />
                </View>
                <Text className="text-gray-600 text-base">
                  Rated and reviewed
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Action Buttons Section */}
          <Animated.View
            className="space-y-4"
            style={{opacity: buttonFadeAnim}}>
            {/* Login Button */}
            <TouchableOpacity
              className="bg-primary rounded-2xl mb-3 px-8 py-5 shadow-lg"
              style={{
                shadowColor: '#8BC34A',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
              onPress={() => navigation.navigate('Login')}>
              <Text className="text-white font-bold text-center text-base">
                Log In to Your Account
              </Text>
            </TouchableOpacity>

            {/* Sign Up Button */}
            <TouchableOpacity
              className="bg-white border border-gray-200 rounded-2xl px-8 py-5 shadow-sm"
              onPress={() => navigation.navigate('Signup')}>
              <Text className="text-gray-700 font-bold text-center text-base">
                Create New Account
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View className="mt-8 items-center">
            <Text className="text-gray-400 text-sm text-center">
              Your trusted platform for local services
            </Text>
            <View className="flex-row items-center mt-4 space-x-6">
              <View className="flex-row items-center">
                <Icon name="security" size={16} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs ml-1">Secure</Text>
              </View>
              <View className="flex-row items-center">
                <Icon name="verified-user" size={16} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs ml-1">Trusted</Text>
              </View>
              <View className="flex-row items-center">
                <Icon name="support" size={16} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs ml-1">Support</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
