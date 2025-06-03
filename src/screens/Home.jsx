import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  TextInput,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Geolocation from 'react-native-geolocation-service';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {Platform} from 'react-native';

const categories = [
  {
    id: 1,
    name: 'Plumbers',
    icon: 'plumbing',
    subcategories: [
      {id: 101, name: 'Emergency Plumbing'},
      {id: 102, name: 'Pipe Repair'},
      {id: 103, name: 'Drain Cleaning'},
      {id: 104, name: 'Water Heater'},
    ],
  },
  {
    id: 2,
    name: 'Electricians',
    icon: 'electrical-services',
    subcategories: [
      {id: 201, name: 'Wiring'},
      {id: 202, name: 'Panel Upgrade'},
      {id: 203, name: 'Lighting'},
      {id: 204, name: 'Appliance Repair'},
    ],
  },
  {
    id: 3,
    name: 'Restaurants',
    icon: 'restaurant',
    subcategories: [
      {id: 301, name: 'Indian'},
      {id: 302, name: 'Chinese'},
      {id: 303, name: 'Italian'},
      {id: 304, name: 'Mexican'},
    ],
  },
  {
    id: 4,
    name: 'Doctors',
    icon: 'medical-services',
    subcategories: [
      {id: 401, name: 'General Physician'},
      {id: 402, name: 'Dentist'},
      {id: 403, name: 'Pediatrician'},
      {id: 404, name: 'Cardiologist'},
    ],
  },
];

export default function Home() {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [locationText, setLocationText] = useState('Fetching location...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSearchActive, setIsSearchActive] = useState(false); // State for search bar visibility
  const [searchQuery, setSearchQuery] = useState(''); // State for search input
  const fadeAnim = useState(new Animated.Value(0))[0];

  const openMenu = () => navigation.openDrawer();

  const toggleSearchBar = () => {
    setIsSearchActive(!isSearchActive);
    setSearchQuery(''); // Reset search query when closing
  };

  useEffect(() => {
    const checkAndRequestPermission = async () => {
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      const status = await check(permission);
      if (status === RESULTS.GRANTED) {
        fetchLocation();
      } else {
        const newStatus = await request(permission);
        if (newStatus === RESULTS.GRANTED) {
          fetchLocation();
        } else {
          setError('Location permission denied');
          setLocationText('Location unavailable');
          setLoading(false);
        }
      }
    };

    const fetchLocation = () => {
      Geolocation.getCurrentPosition(
        position => {
          setLocation(position.coords);
          setLocationText('Nearby');
          setLoading(false);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }).start();
        },
        error => {
          setError(error.message);
          setLocationText('Location unavailable');
          setLoading(false);
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    };

    checkAndRequestPermission();
  }, [fadeAnim]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  if (error && !location) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-red-500 text-lg">Unable to fetch location</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between bg-primary px-5 py-4 shadow-md">
        <TouchableOpacity
          onPress={openMenu}
          className="p-2 rounded-full bg-primary-dark">
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Icon name="map-marker" size={20} color="#fff" />
          <Text className="text-white font-bold ml-2 text-lg">
            {locationText}
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleSearchBar}
          className="p-2 rounded-full bg-primary-dark">
          <Icon
            name={isSearchActive ? 'close' : 'magnify'}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar (Visible when active) */}
      {isSearchActive && (
        <Animated.View
          className="bg-white rounded-xl mx-4 mt-3 p-3 flex-row items-center shadow-sm border border-gray-200"
          style={{opacity: fadeAnim}}>
          <Icon name="magnify" size={20} color="#8BC34A" className="mr-2" />
          <TextInput
            className="flex-1 text-gray-800 text-base"
            placeholder="Search categories or services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
        </Animated.View>
      )}

      {/* Banner */}
      <Animated.View
        className="bg-primary-light rounded-xl mx-4 mt-5 p-5 flex-row items-center shadow-sm"
        style={{opacity: fadeAnim}}>
        <Icon name="gift" size={45} color="#689F38" className="mr-4" />
        <View className="flex-1">
          <Text className="text-primary-dark font-bold text-lg">
            Share & Earn Rewards
          </Text>
          <Text className="text-gray-700 text-sm mt-1">
            Invite friends and get exciting offers!
          </Text>
          <TouchableOpacity className="bg-accent-yellow rounded-full px-4 py-2 mt-3 w-32">
            <Text className="text-primary-dark font-bold text-center">
              Get 50 Rs.
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Categories Section */}
      <View className="flex-1 px-4 mt-6">
        <Text className="text-gray-700 font-bold text-xl mb-4">
          Explore Categories
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-between">
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                className="bg-white rounded-xl shadow-sm mb-4 w-[48%] p-4 items-center border border-gray-100"
                onPress={() =>
                  navigation.navigate('SubCategory', {category: cat})
                }>
                <View className="bg-primary-light rounded-full p-3 mb-3">
                  <Icon name={cat.icon} size={30} color="#8BC34A" />
                </View>
                <Text className="font-bold text-gray-700 text-base text-center">
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
