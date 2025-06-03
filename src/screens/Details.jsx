import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Dimensions, FlatList, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.4;
const TAB_LIST = ['About', 'Timings', 'Reviews', 'Address'];

const ServiceShowcase = ({
  name_of_service = 'Hotel Silver Line',
  Address = '123, Old Street, New Delhi',
  distance = '5.4 km',
  about = 'The Silver line Hotels & Resorts is an upscale, full service and mid market hotel & resort chain in South Asia.',
  hospitalities = 'Not only do our rooms and suites cater to your comfort and care but are equipped to cater to your technology needs.',
  food = "Food is a unique experience at The Hotel Silver Line that you can't deny. Be it authentic regional home-style cooking to a buzzing café.",
  timings = '10:00 AM - 11:00 PM',
  Phone = '+91-9876543210',
  Whatsapp = '+91-9876543210',
  images = [
    'https://imgs.search.brave.com/b_sj610x9C8zI5AnSI6oJQ7wNSauNAvcineUPZikmuk/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9saDct/dXMuZ29vZ2xldXNl/cmNvbnRlbnQuY29t/L2RvY3N6L0FEXzRu/WGVua0xhd2c1MUVB/cmFHaHNXazFRekF5/bEIyNURQQS1QTy10/dlVRamZROXluaWVs/TEZPUzY3cjBCYXlS/d3pDYlh6c3A0VEJ6/S3NJbmY3TlRYUmFE/UDAtb2J5ZzdrNC1h/b2szTlhNQ2VscE1f/SkNBd0F4bDZaWWI5/TEhlWWhNSE01RVhs/NWhFNU9oblFjb3g4/MmRsMzR5cnI1dz9r/ZXk9MWxuYm44LUF6/MnF5b2pzblpGcDFE/UQ.jpeg',
    'https://example.com/hotel-room.jpg',
  ],
  latlong = '28.6139,77.2090',
  URL = 'https://hotel-silverline.com',
  reviews = [
    { id: 1, name: 'Alex', rating: 4, text: 'Great service and location.' },
    { id: 2, name: 'Priya', rating: 5, text: 'Loved the hospitality and food.' },
  ],
}) => {
  const [activeTab, setActiveTab] = useState('About');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handleCall = () => Linking.openURL(`tel:${Phone}`);
  const handleWhatsApp = () => Linking.openURL(`whatsapp://send?phone=${Whatsapp}`);
  const handleWebsite = () => Linking.openURL(URL);
  const handleDirections = () => {
    const [lat, long] = latlong.split(',');
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${long}`);
  };

  const renderImageItem = ({ item }) => (
    <Image
      source={{ uri: item }}
      className="w-full h-full rounded-b-xl"
      style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT }}
      resizeMode="cover"
    />
  );

  const renderImageIndicators = () => (
    <View className="absolute bottom-4 left-0 right-0 flex-row justify-center space-x-2">
      {images.map((_, index) => (
        <View
          key={index}
          className={`h-2 w-2 rounded-full ${index === activeImageIndex ? 'bg-primary' : 'bg-white'} opacity-80`}
        />
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'About':
        return (
          <View className="px-4 py-4 bg-white">
            <Text className="text-primary-dark font-bold mb-2">About</Text>
            <Text className="text-gray-700 text-base mb-3">{about}</Text>
            <Text className="text-primary-dark font-bold mb-2">Hospitalities</Text>
            <Text className="text-gray-700 text-base mb-3">{hospitalities}</Text>
            <Text className="text-primary-dark font-bold mb-2">Food</Text>
            <Text className="text-gray-700 text-base">{food}</Text>
          </View>
        );
      case 'Timings':
        return (
          <View className="px-4 py-4 bg-white">
            <Text className="text-primary-dark font-bold mb-2">Timings</Text>
            <Text className="text-gray-700 text-base">{timings}</Text>
          </View>
        );
      case 'Reviews':
        return (
          <View className="px-4 py-4 bg-white">
            <Text className="text-primary-dark font-bold mb-2">Reviews</Text>
            {reviews.map((review) => (
              <View key={review.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                <Text className="font-semibold text-gray-700">{review.name}</Text>
                <Text className="text-gray-600 mt-1">Rating: {review.rating}/5</Text>
                <Text className="text-gray-600 mt-1">{review.text}</Text>
              </View>
            ))}
          </View>
        );
      case 'Address':
        return (
          <View className="px-4 py-4 bg-white">
            <Text className="text-primary-dark font-bold mb-2">Map</Text>
            <View className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
              <Image
                source={{ uri: `https://maps.googleapis.com/maps/api/staticmap?center=${latlong}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${latlong}&key=YOUR_API_KEY` }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <Text className="text-gray-600 mt-2">Address: {Address}</Text>
            <TouchableOpacity
              onPress={handleDirections}
              className="mt-2 flex-row items-center bg-gray-50 px-4 py-2 rounded-full"
            >
              <Icon name="directions" size={18} color="#8BC34A" />
              <Text className="ml-2 text-gray-700">Get Directions</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView className="bg-gray-50 flex-1">
      {/* Image Carousel */}
      <View className="relative">
        <FlatList
          data={images}
          renderItem={renderImageItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.floor(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveImageIndex(index);
          }}
          className="rounded-b-xl"
        />
        {renderImageIndicators()}
      </View>

      {/* Main Info */}
      <View className="px-4 py-3 bg-white">
        <Text className="text-xl font-bold text-gray-700">{name_of_service}</Text>
        <View className="flex-row items-center mt-1 space-x-2">
          <Text className="text-gray-400 text-sm">{Address}</Text>
          <View className="w-px h-4 bg-gray-300" />
          <Text className="bg-primary-light px-2 py-1 rounded-full text-primary-dark font-semibold text-xs">
            {distance}
          </Text>
        </View>
        {/* Large Contact & Website Links */}
        <View className="flex-row flex-wrap mt-4 gap-3">
          <TouchableOpacity
            onPress={handleCall}
            className="flex-1 flex-row items-center bg-gray-50 px-4 py-3 rounded-lg"
          >
            <Icon name="call" size={20} color="#8BC34A" />
            <Text className="ml-2 text-gray-700 font-medium">Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleWhatsApp}
            className="flex-1 flex-row items-center bg-gray-50 px-4 py-3 rounded-lg"
          >
            <Icon name="whatsapp" size={20} color="#25D366" />
            <Text className="ml-2 text-gray-700 font-medium">WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleWebsite}
            className="flex-1 flex-row items-center bg-gray-50 px-4 py-3 rounded-lg"
          >
            <Icon name="link" size={20} color="#8BC34A" />
            <Text className="ml-2 text-gray-700 font-medium">Website</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200 bg-white">
        {TAB_LIST.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 items-center py-4 ${activeTab === tab ? 'border-b-2 border-primary' : ''}`}
          >
            <Text className={`font-medium ${activeTab === tab ? 'text-primary' : 'text-gray-400'}`}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {renderTabContent()}
    </ScrollView>
  );
};

export default ServiceShowcase;
