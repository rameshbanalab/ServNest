import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  TextInput,
  FlatList,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Geolocation from 'react-native-geolocation-service';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {Platform} from 'react-native';
import {db} from '../config/firebaseConfig';
import {collection, getDocs, query, where} from 'firebase/firestore';
import {
  generateOperatingHoursDisplay,
  getBusinessStatus,
} from '../utils/businessHours';

export default function Home() {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [locationText, setLocationText] = useState('Fetching location...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const openMenu = () => navigation.openDrawer();

  const toggleSearchBar = () => {
    setIsSearchActive(!isSearchActive);
    setSearchQuery('');
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Fetch categories from Firebase
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const categoriesQuery = query(collection(db, 'Categories'));
      const categoriesSnapshot = await getDocs(categoriesQuery);

      if (!categoriesSnapshot.empty) {
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.data().category_id,
          name: doc.data().category_name,
          icon: doc.data().icon || 'category',
          description: doc.data().description || '',
        }));
        setCategories(categoriesData);
      } else {
        console.log('No categories found in Firestore.');
      }
    } catch (err) {
      console.error('Error fetching categories:', err.message);
      setError('Failed to load categories.');
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Fetch services (businesses) from Firebase
  // In the fetchServices function
  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const servicesQuery = query(collection(db, 'Businesses'));
      const servicesSnapshot = await getDocs(servicesQuery);

      if (!servicesSnapshot.empty) {
        const servicesData = servicesSnapshot.docs.map(doc => {
          const data = doc.data();

          // Process weeklySchedule to convert Firestore Timestamps to Date objects
          let processedWeeklySchedule = null;
          if (data.weeklySchedule) {
            processedWeeklySchedule = {};
            Object.keys(data.weeklySchedule).forEach(day => {
              const dayData = data.weeklySchedule[day];
              processedWeeklySchedule[day] = {
                isOpen: dayData.isOpen,
                openTime: convertTimestampToDate(dayData.openTime),
                closeTime: convertTimestampToDate(dayData.closeTime),
              };
            });
          }

          return {
            id: doc.id,
            name: data.businessName || 'Unknown Business',
            category: data.categories?.[0] || 'General',
            subCategories: data.subCategories || [],
            rating: 4.5,
            latitude: data.location?.latitude || 0,
            longitude: data.location?.longitude || 0,
            address: data.address || {},
            weeklySchedule: processedWeeklySchedule,
            contactNumber: data.contactNumber || '',
            email: data.email || '',
            ownerName: data.ownerName || '',
          };
        });
        setServices(servicesData);
      } else {
        console.log('No services found in Firestore.');
        setServices([]);
      }
    } catch (err) {
      console.error('Error fetching services:', err.message);
      setError('Failed to load services.');
    } finally {
      setServicesLoading(false);
    }
  };

  // Filter and sort services based on location and search query
  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = services;

      // Filter by search query
      if (searchQuery.trim()) {
        filtered = filtered.filter(
          service =>
            service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.category
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            service.subCategories.some(sub =>
              sub.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
        );
      }

      // Calculate distance and filter nearby services (within 50km)
      if (location) {
        filtered = filtered
          .map(service => ({
            ...service,
            distance: calculateDistance(
              location.latitude,
              location.longitude,
              service.latitude,
              service.longitude,
            ),
          }))
          .filter(service => service.distance <= 50) // Show services within 50km
          .sort((a, b) => a.distance - b.distance); // Sort by distance
      }

      setFilteredServices(filtered);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, services, location]);

  // Fetch location and data on component mount
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

    // Fetch categories and services
    fetchCategories();
    checkAndRequestPermission();
  }, [fadeAnim]);

  // Fetch services after location is obtained
  useEffect(() => {
    if (location) {
      fetchServices();
    }
  }, [location]);

  // Navigate to category-specific services
  const navigateToCategory = category => {
    navigation.navigate('SubCategory', {
      category,
      services: filteredServices.filter(
        service => service.category === category.name,
      ),
    });
  };

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
        <TouchableOpacity
          className="mt-4 bg-primary px-6 py-3 rounded-lg"
          onPress={() => window.location.reload()}>
          <Text className="text-white font-bold">Retry</Text>
        </TouchableOpacity>
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
          <Icon name="location-on" size={20} color="#fff" />
          <Text className="text-white font-bold ml-2 text-lg">
            {locationText}
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleSearchBar}
          className="p-2 rounded-full bg-primary-dark">
          <Icon
            name={isSearchActive ? 'close' : 'search'}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {isSearchActive && (
        <Animated.View
          className="bg-white rounded-xl mx-4 mt-3 p-3 flex-row items-center shadow-sm border border-gray-200"
          style={{opacity: fadeAnim}}>
          <Icon name="search" size={20} color="#8BC34A" className="mr-2" />
          <TextInput
            className="flex-1 text-gray-800 text-base"
            placeholder="Search services, categories..."
            placeholderTextColor="#9CA3AF"
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
        <Icon name="card-giftcard" size={45} color="#689F38" className="mr-4" />
        <View className="flex-1">
          <Text className="text-primary-dark font-bold text-lg">
            Share & Earn Rewards
          </Text>
          <Text className="text-gray-700 text-sm mt-1">
            Invite friends and get exciting offers!
          </Text>
          <TouchableOpacity className="bg-accent-yellow rounded-full px-4 py-2 mt-3 w-32">
            <Text className="text-primary-dark font-bold text-center">
              Get ₹50
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Categories Section */}
        <View className="px-4 mt-6">
          <Text className="text-gray-700 font-bold text-xl mb-4">
            Explore Categories
          </Text>
          {categoriesLoading ? (
            <View className="flex-row justify-center py-8">
              <ActivityIndicator size="small" color="#8BC34A" />
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  className="bg-white rounded-xl shadow-sm mb-4 w-[48%] p-4 items-center border border-gray-100"
                  onPress={() => navigateToCategory(cat)}>
                  <View className="bg-primary-light rounded-full p-3 mb-3">
                    <Icon name={cat.icon} size={30} color="#8BC34A" />
                  </View>
                  <Text className="font-bold text-gray-700 text-base text-center">
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Nearby Services Section */}
        <View className="px-4 mt-6 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-700 font-bold text-xl">
              Nearby Services
            </Text>
            {location && (
              <Text className="text-gray-500 text-sm">
                {filteredServices.length} services found
              </Text>
            )}
          </View>

          {servicesLoading ? (
            <View className="flex-row justify-center py-8">
              <ActivityIndicator size="small" color="#8BC34A" />
              <Text className="ml-2 text-gray-600">Loading services...</Text>
            </View>
          ) : filteredServices.length > 0 ? (
            <View className="space-y-3">
              {filteredServices.slice(0, 10).map(service => {
                const businessStatus = getBusinessStatus(
                  service.weeklySchedule,
                );

                return (
                  <TouchableOpacity
                    key={service.id}
                    className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
                    onPress={() =>
                      navigation.navigate('ServiceDetails', {service})
                    }>
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-800">
                          {service.name}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-1">
                          {service.category}
                        </Text>

                        {/* Business Status */}
                        <View className="flex-row items-center mt-2">
                          <View
                            className={`w-2 h-2 rounded-full mr-2 ${
                              businessStatus.status === 'open'
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }`}
                          />
                          <Text
                            className={`text-xs ${
                              businessStatus.status === 'open'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                            {businessStatus.message}
                          </Text>
                        </View>

                        {/* Distance */}
                        {service.distance && (
                          <Text className="text-blue-500 text-xs mt-1">
                            📍 {service.distance.toFixed(1)} km away
                          </Text>
                        )}
                      </View>

                      <View className="items-end">
                        <View className="flex-row items-center">
                          <Icon name="star" size={16} color="#FFD700" />
                          <Text className="text-yellow-600 text-sm ml-1">
                            {service.rating}
                          </Text>
                        </View>
                        {service.contactNumber && (
                          <TouchableOpacity
                            className="mt-2 bg-primary-light px-3 py-1 rounded-full"
                            onPress={() => {
                              /* Handle call */
                            }}>
                            <Text className="text-primary-dark text-xs font-medium">
                              Call
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {filteredServices.length > 10 && (
                <TouchableOpacity
                  className="bg-primary rounded-lg p-3 mt-4"
                  onPress={() =>
                    navigation.navigate('AllServices', {
                      services: filteredServices,
                    })
                  }>
                  <Text className="text-white font-bold text-center">
                    View All {filteredServices.length} Services
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View className="bg-white rounded-lg p-6 items-center">
              <Icon name="search-off" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 text-center mt-2">
                {searchQuery
                  ? 'No services found for your search'
                  : 'No services available in your area'}
              </Text>
              {searchQuery && (
                <TouchableOpacity
                  className="mt-3 bg-primary px-4 py-2 rounded-lg"
                  onPress={() => setSearchQuery('')}>
                  <Text className="text-white font-medium">Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
