import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Geolocation from 'react-native-geolocation-service';
import { useNavigation } from '@react-navigation/native';

// Dummy data with latitude and longitude
const services = [
  {
    id: 1,
    name: 'Nap and Dream Bean Bags',
    address: 'Vasai West, Palghar',
    rating: 4.7,
    ratingCount: 6,
    tags: ['Bean Bag Dealers', 'Bean Bag Filler Dealers'],
    phone: '07041744010',
    whatsapp: '07041744010',
    topSearch: true,
    trending: false,
    image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80',
    latitude: 19.3911,
    longitude: 72.8311,
  },
  {
    id: 2,
    name: 'K F Bean Bags',
    address: 'Chandansar Road Virar East, Palghar',
    rating: 4.9,
    ratingCount: 24,
    tags: ['Bean Bag Dealers', 'Bean Bag Filler Dealers'],
    phone: '07041744011',
    whatsapp: '07041744011',
    topSearch: false,
    trending: true,
    image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=400&q=80',
    latitude: 19.4559,
    longitude: 72.8136,
  },
];

// Fixed card size
const CARD_WIDTH = Dimensions.get('window').width - 32;
const CARD_HEIGHT = 200;

// Haversine formula to calculate distance (in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const ServiceCard = ({ item, onPress }) => (
  <TouchableOpacity
    style={{
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      marginBottom: 16,
      backgroundColor: '#fff',
      borderRadius: 16,
      flexDirection: 'row',
      overflow: 'hidden',
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    }}
    activeOpacity={0.9}
    onPress={onPress}
  >
    {/* Image */}
    <Image
      source={{ uri: item.image }}
      style={{
        width: 120,
        height: '100%',
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
      }}
      resizeMode="cover"
    />

    {/* Info */}
    <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
      {/* Name & Rating */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        <Text numberOfLines={1} style={{ fontWeight: 'bold', fontSize: 17, flex: 1, color: '#222' }}>
          {item.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#d1fae5', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
            <Text style={{ color: '#059669', fontWeight: '600', fontSize: 13 }}>{item.rating}</Text>
            <Icon name="star" size={13} color="#059669" style={{ marginLeft: 2 }} />
          </View>
        </View>
      </View>
      {/* Ratings & Badges */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        <Text style={{ color: '#888', fontSize: 12 }}>{item.ratingCount} Ratings</Text>
        {item.topSearch && (
          <View style={{ backgroundColor: '#fef9c3', borderRadius: 4, marginLeft: 8, paddingHorizontal: 5, paddingVertical: 2 }}>
            <Text style={{ color: '#b45309', fontSize: 11 }}>Top Search</Text>
          </View>
        )}
        {item.trending && (
          <View style={{ backgroundColor: '#ffedd5', borderRadius: 4, marginLeft: 8, paddingHorizontal: 5, paddingVertical: 2 }}>
            <Text style={{ color: '#c2410c', fontSize: 11 }}>Trending</Text>
          </View>
        )}
      </View>
      {/* Address */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        <Icon name="location-on" size={14} color="#4A90E2" />
        <Text numberOfLines={1} style={{ color: '#666', fontSize: 13, marginLeft: 4 }}>
          {item.address}
        </Text>
      </View>
      {/* Distance */}
      {item.distance !== undefined && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <Icon name="directions" size={14} color="#4A90E2" />
          <Text style={{ color: '#4A90E2', fontSize: 13, marginLeft: 4 }}>
            {item.distance.toFixed(2)} km away
          </Text>
        </View>
      )}
      {/* Tags */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 }}>
        {item.tags.map((tag, idx) => (
          <View
            key={idx}
            style={{
              backgroundColor: '#f3f4f6',
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginRight: 6,
              marginBottom: 2,
            }}
          >
            <Text style={{ color: '#444', fontSize: 11 }}>{tag}</Text>
          </View>
        ))}
      </View>
      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#22c55e',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginRight: 6,
          }}
        >
          <Icon name="call" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13, marginLeft: 4 }}>Show Number</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#25D366',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginRight: 6,
          }}
        >
          <Icon name="whatsapp" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13, marginLeft: 4 }}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
);

const ServicesScreen = () => {
  const navigation = useNavigation();
  const [userLocation, setUserLocation] = useState(null);
  const [sortedServices, setSortedServices] = useState(null);

  useEffect(() => {
    Geolocation.getCurrentPosition(
      position => {
        setUserLocation(position.coords);
      },
      error => {
        alert("Unable to get location");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  useEffect(() => {
    if (userLocation) {
      // Calculate distance for each service
      const servicesWithDistance = services.map(service => ({
        ...service,
        distance: calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          service.latitude,
          service.longitude
        ),
      }));
      // Sort by distance
      const sorted = [...servicesWithDistance].sort((a, b) => a.distance - b.distance);
      setSortedServices(sorted);
    }
  }, [userLocation]);

  const handleCardPress = (item) => {
    navigation.navigate('ServiceDetails', { service: item });
  };

  if (!userLocation || !sortedServices) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={{ marginTop: 12, color: '#666' }}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 p-2">
      <FlatList
        data={sortedServices}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <ServiceCard item={item} onPress={() => navigation.navigate("Details",{service:item})} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 16 }}
      />
    </View>
  );
};

export default ServicesScreen;
