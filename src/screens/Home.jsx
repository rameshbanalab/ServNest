import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Dummy data for services (replace with your Firebase data)
const dummyServices = [
  { id: 1, name: 'Plumber Joe', category: 'Plumber', rating: 4.5 },
  { id: 2, name: 'Electrician Max', category: 'Electrician', rating: 4.2 },
  { id: 3, name: 'Restaurant Delight', category: 'Restaurant', rating: 4.8 },
  { id: 4, name: 'Dr. Health', category: 'Doctor', rating: 4.7 },
  { id: 11, name: 'Plumber Joe', category: 'Plumber', rating: 4.5 },
  { id: 22, name: 'Electrician Max', category: 'Electrician', rating: 4.2 },
  { id: 33, name: 'Restaurant Delight', category: 'Restaurant', rating: 4.8 },
  { id: 45, name: 'Dr. Health', category: 'Doctor', rating: 4.7 },
];

// Categories for horizontal scroll
const categories = [
  { id: 1, name: 'Plumbers', icon: 'plumbing' },
  { id: 2, name: 'Electricians', icon: 'electrical-services' },
  { id: 3, name: 'Restaurants', icon: 'restaurant' },
  { id: 4, name: 'Doctors', icon: 'medical-services' },
];

const HomePage = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState(dummyServices);
  const [filteredServices, setFilteredServices] = useState(dummyServices);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      const filtered = services.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredServices(filtered);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, services]);

  // Location permission and fetch
  useEffect(() => {
    const checkAndRequestPermission = async () => {
      const permission = Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      const status = await check(permission);
      if (status === RESULTS.GRANTED) {
        fetchLocation();
      } else {
        const newStatus = await request(permission);
        if (newStatus === RESULTS.GRANTED) fetchLocation();
        else {
          setError('Location permission denied');
          setLoading(false);
        }
      }
    };
    checkAndRequestPermission();
  }, []);

  const fetchLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords);
        setLoading(false);
      },
      (error) => {
        setError(error.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text className="mt-4 text-gray-600">Fetching your location...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-red-500 text-lg">{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      className="flex-1 bg-gray-100"
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        className="flex-1"
      >
        <View className="p-4">
          {/* Location header */}
          <View className="flex-row items-center mb-4">
            <Icon name="location-on" size={20} color="#4A90E2" />
            <Text className="ml-2 text-gray-700 text-sm">
              {location ? `Current Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Location not available'}
            </Text>
          </View>

          {/* Search bar */}
          <View className="flex-row items-center bg-white rounded-lg px-4 py-3 mb-4 shadow-sm">
            <Icon name="search" size={20} color="#666" className="mr-2" />
            <TextInput
              className="flex-1 text-gray-800"
              placeholder="Search services..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Categories section */}
          <Text className="text-lg font-semibold text-gray-800 mb-3">Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            <View className="flex-row space-x-3">
              {categories.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  className="w-24 h-24 bg-white rounded-lg items-center justify-center shadow-sm mx-2"
                >
                  <Icon name={item.icon} size={28} color="#4A90E2" />
                  <Text className="mt-2 text-xs text-center text-gray-600">{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Nearby Services (or search results) */}
          <Text className="text-lg font-semibold text-gray-800 mb-3">Nearby Services</Text>
          <View className="space-y-3">
            {filteredServices.map((item) => (
              <TouchableOpacity
                key={item.id}
                className="bg-white rounded-lg p-4 shadow-sm"
              >
                <View className="flex-row justify-between">
                  <Text className="text-base font-medium text-gray-800">{item.name}</Text>
                  <Text className="text-yellow-500 text-sm">⭐ {item.rating}</Text>
                </View>
                <Text className="text-gray-500 text-xs mt-1">{item.category}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default HomePage;
