import React, { useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, Dimensions, FlatList } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.4; // 40% of screen height
const TAB_LIST = ["Info", "Offers", "Reviews", "Address"];

const ServiceShowcase = ({
  images = [
    "https://imgs.search.brave.com/b_sj610x9C8zI5AnSI6oJQ7wNSauNAvcineUPZikmuk/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9saDct/dXMuZ29vZ2xldXNl/cmNvbnRlbnQuY29t/L2RvY3N6L0FEXzRu/WGVua0xhd2c1MUVB/cmFHaHNXazFRekF5/bEIyNURQQS1QTy10/dlVRamZROXluaWVs/TEZPUzY3cjBCYXlS/d3pDYlh6c3A0VEJ6/S3NJbmY3TlRYUmFE/UDAtb2J5ZzdrNC1h/b2szTlhNQ2VscE1f/SkNBd0F4bDZaWWI5/TEhlWWhNSE01RVhs/NWhFNU9oblFjb3g4/MmRsMzR5cnI1dz9r/ZXk9MWxuYm44LUF6/MnF5b2pzblpGcDFE/UQ.jpeg",
    "https://example.com/hotel-room.jpg",
    "https://example.com/hotel-pool.jpg"
  ],
  name = "Hotel Silver Line",
  address = "123, Old Street, New Delhi",
  distance = "5.4 km",
  about = "The Silver line Hotels & Resorts is an upscale, full service and mid market hotel & resort chain in South Asia",
  hospitalities = "Not only do our rooms and suites cater to your comfort and care but are equipped to cater to your technology needs.",
  food = "Food is a unique experience at The Hotel Silver Line that you can't deny. Be it authentic regional home-style cooking to a buzzing café.",
  offers = [
    { id: 1, title: "Early Bird Discount", description: "Book early and get 15% off on your stay." },
    { id: 2, title: "Weekend Special", description: "Enjoy complimentary breakfast on weekends." },
  ],
  reviews = [
    { id: 1, name: "Alex", rating: 4, text: "Great service and location." },
    { id: 2, name: "Priya", rating: 5, text: "Loved the hospitality and food." },
  ],
  mapLink = "https://maps.google.com/?q=123,+Old+Street,+New+Delhi",
}) => {
  const [activeTab, setActiveTab] = useState("Info");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
      case "Info":
        return (
          <>
            <View className="px-4 py-4 bg-white">
              <Text className="text-primary-dark font-bold mb-1">About:</Text>
              <Text className="text-gray-700 text-base">{about}</Text>
            </View>
            <View className="px-4 py-4 bg-white border-t border-gray-100">
              <Text className="text-primary-dark font-bold mb-1">Hospitalities:</Text>
              <Text className="text-gray-700 text-base">{hospitalities}</Text>
            </View>
            <View className="px-4 py-4 bg-white border-t border-gray-100 mb-8">
              <Text className="text-primary-dark font-bold mb-1">Food at {name}:</Text>
              <Text className="text-gray-700 text-base">{food}</Text>
            </View>
          </>
        );
      case "Offers":
        return (
          <View className="px-4 py-4 bg-white">
            <Text className="text-primary-dark font-bold mb-2">Offers</Text>
            {offers.map((offer) => (
              <View key={offer.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                <Text className="font-semibold text-gray-700">{offer.title}</Text>
                <Text className="text-gray-600 mt-1">{offer.description}</Text>
              </View>
            ))}
          </View>
        );
      case "Reviews":
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
      case "Address":
        return (
          <View className="px-4 py-4 bg-white">
            <Text className="text-primary-dark font-bold mb-2">Map</Text>
            <View className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
              <Image
                source={{ uri: `https://maps.googleapis.com/maps/api/staticmap?center=123,Old Street,New Delhi&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C123,Old Street,New Delhi&key=YOUR_API_KEY` }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <Text className="text-gray-600 mt-2">Address: {address}</Text>
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
        <Text className="text-xl font-bold text-gray-700">{name}</Text>
        <View className="flex-row items-center mt-1 space-x-2">
          <Text className="text-gray-400 text-sm">{address}</Text>
          <View className="w-px h-4 bg-gray-300" />
          <Text className="bg-primary-light px-2 py-1 rounded-full text-primary-dark font-semibold text-xs">
            {distance}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200 bg-white">
        {TAB_LIST.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 items-center py-4 ${activeTab === tab ? "border-b-2 border-primary" : ""}`}
          >
            <Text className={`font-medium ${activeTab === tab ? "text-primary" : "text-gray-400"}`}>
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
