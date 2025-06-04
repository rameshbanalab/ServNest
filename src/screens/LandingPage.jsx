import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, Animated, Image} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function LandingPage() {
  const navigation = useNavigation();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View className="flex-1 bg-gray-50 justify-center items-center p-6">
      {/* App Logo/Title Section */}
      <Animated.View
        className="mb-10 items-center"
        style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>
        <View className="bg-primary-light rounded-full p-5 mb-4 shadow-md">
          <Icon name="home-search" size={60} color="#8BC34A" />
        </View>
        <Text className="text-primary-dark font-bold text-4xl">ServeNest</Text>
        <Text className="text-gray-700 text-base mt-2 text-center">
          Discover local services and connect with ease.
        </Text>
      </Animated.View>

      {/* Call to Action Buttons */}
      <View className="w-full max-w-md space-y-4">
        <TouchableOpacity
          className="bg-primary rounded-xl p-4 shadow-md"
          onPress={() => navigation.navigate('Login')}>
          <Text className="text-white font-bold text-lg text-center">
            Login
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-white rounded-xl p-4 border border-primary shadow-md"
          onPress={() => navigation.navigate('Signup')}>
          <Text className="text-primary font-bold text-lg text-center">
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer Text */}
      <TouchableOpacity
        className="mt-10"
        onPress={() => navigation.navigate('Main')}>
        <Text className="text-gray-400 text-sm mt-10">
          Find services near you with ServeNest
        </Text>
      </TouchableOpacity>
    </View>
  );
}
