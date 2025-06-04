/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  TextInput,
  Image,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Geolocation from 'react-native-geolocation-service';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {Platform} from 'react-native';
import {db} from '../config/firebaseConfig';
import {collection, getDocs, query} from 'firebase/firestore';
import {generateOperatingHoursDisplay, getBusinessStatus} from '../utils/businessHours';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

export default function Home() {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [locationText, setLocationText] = useState('Fetching location...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [displayedServices, setDisplayedServices] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreServices, setHasMoreServices] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Added refresh state
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scrollViewRef = useRef(null);
  const servicesRef = useRef(null);
  const ITEMS_PER_PAGE = 10;

  const openMenu = () => navigation.openDrawer();

  const toggleSearchBar = () => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      setSearchQuery('');
      setTimeout(() => scrollToServices(), 300);
    }
  };

  const scrollToServices = () => {
    if (servicesRef.current && scrollViewRef.current) {
      servicesRef.current.measureLayout(
        scrollViewRef.current,
        (x, y) => { scrollViewRef.current.scrollTo({y: y - 20, animated: true}); },
        () => {},
      );
    }
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

  // Fetch categories from Firebase - Updated to use Firebase document ID
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const categoriesQuery = query(collection(db, 'Categories'));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      if (!categoriesSnapshot.empty) {
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id, // Use Firebase document ID
          name: doc.data().category_name,
          icon: doc.data().icon || 'category',
          description: doc.data().description || '',
          image: doc.data().image || null,
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

  // Fetch subcategories from Firebase - Updated to use Firebase document ID
  const fetchSubCategories = async () => {
    try {
      const subCategoriesQuery = query(collection(db, 'SubCategories'));
      const subCategoriesSnapshot = await getDocs(subCategoriesQuery);
      if (!subCategoriesSnapshot.empty) {
        const subCategoriesData = subCategoriesSnapshot.docs.map(doc => ({
          id: doc.id, // Use Firebase document ID
          name: doc.data().sub_category_name,
          category_id: doc.data().category_id, // This should match the category's Firebase document ID
          icon: doc.data().icon || 'category',
          description: doc.data().description || '',
          image: doc.data().image || null,
        }));
        setSubCategories(subCategoriesData);
      } else {
        console.log('No subcategories found in Firestore.');
      }
    } catch (err) {
      console.error('Error fetching subcategories:', err.message);
    }
  };

  // Fetch services (businesses) from Firebase
  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const servicesQuery = query(collection(db, 'Businesses'));
      const servicesSnapshot = await getDocs(servicesQuery);
      if (!servicesSnapshot.empty) {
        const servicesData = servicesSnapshot.docs.map(doc => {
          const data = doc.data();
          let processedWeeklySchedule = null;
          if (data.weeklySchedule) {
            processedWeeklySchedule = {};
            Object.keys(data.weeklySchedule).forEach(day => {
              const dayData = data.weeklySchedule[day];
              processedWeeklySchedule[day] = {
                isOpen: dayData.isOpen,
                openTime: dayData.openTime?.toDate
                  ? dayData.openTime.toDate()
                  : new Date(dayData.openTime),
                closeTime: dayData.closeTime?.toDate
                  ? dayData.closeTime.toDate()
                  : new Date(dayData.closeTime),
              };
            });
          }
          return {
            id: doc.id,
            name: data.businessName || 'Unknown Business',
            category: data.categories?.[0] || 'General',
            subCategories: data.subCategories || [],
            rating: data.rating || 4.5,
            latitude: data.location?.latitude || 0,
            longitude: data.location?.longitude || 0,
            address: data.address || {},
            weeklySchedule: processedWeeklySchedule,
            contactNumber: data.contactNumber || '',
            email: data.email || '',
            ownerName: data.ownerName || '',
            images: data.images || [],
            createdAt: data.createdAt || '',
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

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refetch all data
      await Promise.all([
        fetchCategories(),
        fetchSubCategories(),
        fetchServices()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Sort services with open services first
  const sortServicesByStatus = servicesList => {
    return servicesList.sort((a, b) => {
      const statusA = getBusinessStatus(a.weeklySchedule);
      const statusB = getBusinessStatus(b.weeklySchedule);
      if (statusA.status === 'open' && statusB.status !== 'open') return -1;
      if (statusA.status !== 'open' && statusB.status === 'open') return 1;
      if (a.distance && b.distance) return a.distance - b.distance;
      return 0;
    });
  };

  // Filter and sort services based on location and search query
  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = services;
      if (searchQuery.trim()) {
        filtered = filtered.filter(service =>
          service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          service.subCategories.some(sub =>
            sub.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        );
      }
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
          .filter(service => service.distance <= 50);
      }
      const sortedFiltered = sortServicesByStatus(filtered);
      setFilteredServices(sortedFiltered);
      setDisplayedServices(sortedFiltered.slice(0, ITEMS_PER_PAGE));
      setHasMoreServices(sortedFiltered.length > ITEMS_PER_PAGE);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, services, location]);

  // Auto-scroll to services when search query changes
  useEffect(() => {
    if (searchQuery.trim() && isSearchActive) {
      setTimeout(() => scrollToServices(), 100);
    }
  }, [searchQuery]);

  // Load more services for pagination
  const loadMoreServices = () => {
    if (loadingMore || !hasMoreServices) return;
    setLoadingMore(true);
    setTimeout(() => {
      const currentLength = displayedServices.length;
      const nextServices = filteredServices.slice(
        currentLength,
        currentLength + ITEMS_PER_PAGE,
      );
      setDisplayedServices(prev => [...prev, ...nextServices]);
      setHasMoreServices(currentLength + ITEMS_PER_PAGE < filteredServices.length);
      setLoadingMore(false);
    }, 500);
  };

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
    fetchCategories();
    fetchSubCategories();
    checkAndRequestPermission();
  }, [fadeAnim]);

  // Fetch services after location is obtained
  useEffect(() => {
    if (location) {
      fetchServices();
    }
  }, [location]);

  // Navigate to category-specific subcategories - Updated to use Firebase document ID
  const navigateToCategory = category => {
    const categorySubcategories = subCategories.filter(
      sub => sub.category_id === category.id, // Now comparing Firebase document IDs
    );
    const categoryServices = filteredServices.filter(
      service => service.category === category.name,
    );
    navigation.navigate('SubCategory', {
      category: {
        ...category,
        subcategories: categorySubcategories,
      },
      services: categoryServices,
    });
  };

  // Navigate to service details
  const navigateToServiceDetails = service => {
    navigation.navigate('Details', {service});
  };

  // Render professional service card
  const renderServiceCard = ({item: service, index}) => {
    const businessStatus = getBusinessStatus(service.weeklySchedule);
    const hasImages = service.images && service.images.length > 0;
    const categoryIcon = service.icon || 'business';
    return (
      <TouchableOpacity
        className="bg-white rounded-2xl shadow-lg mb-4 overflow-hidden border border-gray-100 mx-4"
        onPress={() => navigateToServiceDetails(service)}
        style={{elevation: 3}}>
        {/* Image or Icon Section */}
        <View className="relative">
          {hasImages ? (
            <Image
              source={{
                uri: `data:image/jpeg;base64,${service.images[0].base64}`,
              }}
              className="w-full h-48"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-48 bg-primary-light items-center justify-center">
              <View className="bg-white rounded-full p-4 shadow-md">
                <Icon name={categoryIcon} size={40} color="#8BC34A" />
              </View>
            </View>
          )}
          {/* Status Badge */}
          <View className="absolute top-3 left-3">
            <View
              className={`px-3 py-1 rounded-full flex-row items-center ${
                businessStatus.status === 'open' ? 'bg-green-500' : 'bg-red-500'
              }`}>
              <View
                className={`w-2 h-2 rounded-full mr-2 ${
                  businessStatus.status === 'open' ? 'bg-white' : 'bg-white'
                }`}
              />
              <Text className="text-white text-xs font-medium">
                {businessStatus.status === 'open' ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
          {/* Distance Badge */}
          {service.distance && (
            <View className="absolute top-3 right-3">
              <View className="bg-black bg-opacity-70 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-medium">
                  {service.distance.toFixed(1)} km
                </Text>
              </View>
            </View>
          )}
          {/* Rating Badge */}
          <View className="absolute bottom-3 right-3">
            <View className="bg-white rounded-full px-3 py-1 flex-row items-center shadow-md">
              <Icon name="star" size={14} color="#FFD700" />
              <Text className="text-gray-800 text-xs font-bold ml-1">
                {service.rating}
              </Text>
            </View>
          </View>
        </View>
        {/* Content Section */}
        <View className="p-4">
          <Text
            className="text-lg font-bold text-gray-800 mb-1"
            numberOfLines={1}>
            {service.name}
          </Text>
          <Text className="text-gray-500 text-sm mb-2">{service.category}</Text>
          {/* Subcategories */}
          {service.subCategories.length > 0 && (
            <View className="flex-row flex-wrap mb-3">
              {service.subCategories.slice(0, 2).map((sub, index) => (
                <View
                  key={index}
                  className="bg-primary-light px-2 py-1 rounded-full mr-2 mb-1">
                  <Text className="text-primary-dark text-xs font-medium">
                    {sub}
                  </Text>
                </View>
              ))}
              {service.subCategories.length > 2 && (
                <View className="bg-gray-100 px-2 py-1 rounded-full">
                  <Text className="text-gray-600 text-xs">
                    +{service.subCategories.length - 2}
                  </Text>
                </View>
              )}
            </View>
          )}
          {/* Address */}
          {service.address && (service.address.city || service.address.street) && (
            <View className="flex-row items-center mb-3">
              <Icon name="location-on" size={16} color="#8BC34A" />
              <Text
                className="text-gray-600 text-sm ml-1 flex-1"
                numberOfLines={1}>
                {service.address.street ? `${service.address.street}, ` : ''}
                {service.address.city}
              </Text>
              <Text
                className={`text-sm font-medium ${
                  businessStatus.status === 'open'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                {businessStatus.message}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderLoadMoreFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#8BC34A" />
        <Text className="text-center text-gray-600 mt-2">
          Loading more services...
        </Text>
      </View>
    );
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
      

      {/* Enhanced Search Bar */}
      
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
            onPress={()=>setIsSearchActive(true)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="clear" size={20} color="#8BC34A" />
            </TouchableOpacity>
          )}
        </Animated.View>
      

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8BC34A']}
            tintColor="#8BC34A"
            title="Pull to refresh"
            titleColor="#8BC34A"
          />
        }>
        {/* Categories Section - Only show when not searching */}
        {!isSearchActive && (
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
                      {cat.image ? (
                        <Image
                          source={{
                            uri: `data:image/jpeg;base64,${cat.image}`,
                          }}
                          className="w-16 h-16 rounded-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-16 h-16 bg-primary-light rounded-full items-center justify-center">
                          <Icon
                            name={cat.icon || 'business'}
                            size={40}
                            color="#8BC34A"
                          />
                        </View>
                      )}
                    </View>
                    <Text className="font-bold text-gray-700 text-base text-center">
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Nearby Services Section with Lazy Loading */}
        <View ref={servicesRef} className="mt-6 mb-6">
          <View className="flex-row justify-between items-center mb-4 px-4">
            <Text className="text-gray-700 font-bold text-xl">
              {isSearchActive && searchQuery
                ? 'Search Results'
                : 'Nearby Services'}
            </Text>
            {location && (
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-gray-500 text-sm">
                  {filteredServices.length} services • Open first
                </Text>
              </View>
            )}
          </View>

          {servicesLoading ? (
            <View className="flex-row justify-center py-8">
              <ActivityIndicator size="small" color="#8BC34A" />
              <Text className="ml-2 text-gray-600">Loading services...</Text>
            </View>
          ) : displayedServices.length > 0 ? (
            <FlatList
              data={displayedServices}
              renderItem={renderServiceCard}
              keyExtractor={item => item.id}
              onEndReached={loadMoreServices}
              onEndReachedThreshold={0.1}
              ListFooterComponent={renderLoadMoreFooter}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              nestedScrollEnabled={true}
              getItemLayout={(data, index) => ({
                length: 280, // Approximate height of each card
                offset: 280 * index,
                index,
              })}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              initialNumToRender={5}
              windowSize={10}
            />
          ) : (
            <View className="bg-white rounded-lg p-6 items-center mx-4">
              <Icon name="search_off" size={48} color="#9CA3AF" />
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

          {/* View All Button */}
          {!isSearchActive &&
            filteredServices.length > displayedServices.length && (
              <TouchableOpacity
                className="bg-primary rounded-lg p-3 mt-4 mx-4"
                onPress={() =>
                  navigation.navigate('Services', {
                    services: filteredServices,
                    title: 'All Services',
                  })
                }>
                <Text className="text-white font-bold text-center">
                  View All {filteredServices.length} Services
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </ScrollView>
    </View>
  );
}
