import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoute } from '@react-navigation/native';

// Dummy Base64 images (shortened for example)
// In production, use your actual full Base64 strings!
const dummyBase64Images = [
  // This is a very short, invalid Base64 string for demonstration.
  // Replace with your real Base64 image data!
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // (This will show as a tiny black dot)
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // (Same as above)
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // (Same as above)
  // For real use, use a full Base64 string, e.g.:
  // 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA...' (very long string)
];

const ServiceDetailsScreen = () => {
  const route = useRoute();
  const { service } = route.params;
  const { width } = Dimensions.get('window');
  const IMAGE_HEIGHT = width * 0.6;

  // Use your service.image if available, or fall back to dummy data
  const images = service.image?.length ? service.image : dummyBase64Images;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Image Carousel (Base64 images) */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        className="rounded-none"
      >
        {images.map((base64Str, index) => (
          <Image
            key={index}
            source={{ uri: `data:image/jpeg;base64,${base64Str}` }}
            className="rounded-none"
            style={{ width: width, height: IMAGE_HEIGHT }}
          />
        ))}
      </ScrollView>

      {/* Main Content */}
      <View className="p-4">
        {/* Name & Rating */}
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-2xl font-bold text-gray-900">{service.name}</Text>
          <View className="flex-row items-center">
            <View className="bg-green-100 px-2 py-1 rounded-full flex-row items-center">
              <Icon name="star" size={16} color="#059669" />
              <Text className="text-green-800 ml-1 font-semibold">{service.rating}</Text>
            </View>
          </View>
        </View>
        <Text className="text-gray-500 text-sm">{service.ratingCount} Ratings</Text>

        {/* Address */}
        <View className="flex-row items-center mt-4">
          <Icon name="location-on" size={18} color="#4A90E2" />
          <Text className="text-gray-700 ml-2">{service.address}</Text>
        </View>

        {/* Tags */}
        <View className="flex-row flex-wrap mt-4">
          {service.tags.map((tag, idx) => (
            <View
              key={idx}
              className="bg-gray-100 px-3 py-1 rounded-full mr-2 mb-2"
            >
              <Text className="text-xs text-gray-700">{tag}</Text>
            </View>
          ))}
        </View>

        {/* Badges */}
        <View className="flex-row mt-4">
          {service.topSearch && (
            <View className="bg-yellow-100 px-2 py-1 rounded-full mr-2">
              <Text className="text-xs text-yellow-800">Top Search</Text>
            </View>
          )}
          {service.trending && (
            <View className="bg-orange-100 px-2 py-1 rounded-full">
              <Text className="text-xs text-orange-800">Trending</Text>
            </View>
          )}
        </View>

        {/* Contact */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-2">Contact</Text>
          <View className="flex-row items-center mb-2">
            <Icon name="call" size={18} color="#4A90E2" />
            <Text className="text-gray-700 ml-2">{service.phone}</Text>
          </View>
          <View className="flex-row items-center">
            <Icon name="whatsapp" size={18} color="#25D366" />
            <Text className="text-gray-700 ml-2">{service.whatsapp}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row mt-8 mb-8">
          <TouchableOpacity className="flex-1 bg-blue-600 rounded-lg p-3 mr-2 flex-row items-center justify-center">
            <Icon name="call" size={20} color="#fff" />
            <Text className="text-white ml-2 font-semibold">Call Now</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-green-600 rounded-lg p-3 flex-row items-center justify-center">
            <Icon name="whatsapp" size={20} color="#fff" />
            <Text className="text-white ml-2 font-semibold">WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default ServiceDetailsScreen;
