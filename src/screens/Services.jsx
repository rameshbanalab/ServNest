import React from "react";
import { View, Text, Image, FlatList, TouchableOpacity, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_HEIGHT = SCREEN_WIDTH * 0.38;

const services = [
  {
    business_id: "1",
    name_of_service: "Hotel Silver Line",
    categories: ["Restaurant"],
    sub_Categories: ["North Indian", "Barbeque"],
    Address: "123, Old Street, New Delhi",
    timings: "10:00 AM - 11:00 PM",
    Phone: "+91-9876543210",
    Whatsapp: "+91-9876543210",
    images: [
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&crop=center"
    ],
    latlong: "28.6139,77.2090",
    URL: "https://hotel-silverline.com",
    rating: "4.2",
    distance: "5.4 km"
  },
  {
    business_id: "2",
    name_of_service: "Aloha Hotel",
    categories: ["Restaurant"],
    sub_Categories: ["Continental", "Sea Food"],
    Address: "87/B, Salt Earth Street, Mumbai",
    timings: "9:00 AM - 12:00 AM",
    Phone: "+91-9876543211",
    Whatsapp: "+91-9876543211",
    images: [
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop&crop=center"
    ],
    latlong: "19.0760,72.8777",
    URL: "https://aloha-hotel.com",
    rating: "4.7",
    distance: "5.4 km"
  },
  {
    business_id: "3",
    name_of_service: "Hotel Gateway",
    categories: ["Restaurant"],
    sub_Categories: ["Chinese", "Thai"],
    Address: "45/8, Indira Street, New Delhi",
    timings: "11:00 AM - 11:30 PM",
    Phone: "+91-9876543212",
    Whatsapp: "+91-9876543212",
    images: [
      "https://images.unsplash.com/photo-1565299585323-38174c4a6663?w=400&h=300&fit=crop&crop=center"
    ],
    latlong: "28.6139,77.2090",
    URL: "https://hotel-gateway.com",
    rating: "4.5",
    distance: "5.4 km"
  }
];

const ServiceCard = ({ item }) => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      className="mx-3 mb-5"
      activeOpacity={0.85}
      onPress={() => navigation.navigate("Details", { item })}
    >
      <View className="bg-white rounded-2xl shadow-md overflow-hidden" style={{ elevation: 4 }}>
        {/* Image */}
        <View>
          <Image
            source={{ uri: item.images[0] }}
            className="w-full"
            style={{ height: CARD_HEIGHT, width: SCREEN_WIDTH - 32 }}
            resizeMode="cover"
          />
          {/* Rating Badge */}
          <View className="absolute top-3 left-3 bg-primary px-2 py-1 rounded-lg flex-row items-center">
            <Text className="text-xs text-white font-bold">{item.rating}</Text>
          </View>
        </View>
        {/* Details */}
        <View className="px-4 py-3">
          <Text className="text-gray-800 font-bold text-base mb-0.5" numberOfLines={1}>
            {item.name_of_service}
          </Text>
          <Text className="text-gray-400 text-xs mb-2" numberOfLines={1}>
            {item.Address}
          </Text>
          <View className="flex-row items-center justify-between">
            <View />
            <View className="flex-row items-center">
              <Icon name="navigation" size={18} color="#8BC34A" />
              <Text className="ml-1 text-primary-dark font-semibold text-sm">{item.distance}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ServiceListScreen = () => (
  <View className="flex-1 bg-gray-100 pt-2">
    <FlatList
      data={services}
      keyExtractor={(item) => item.business_id}
      renderItem={({ item }) => <ServiceCard item={item} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
    />
  </View>
);

export default ServiceListScreen;
