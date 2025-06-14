/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  lazy,
  Suspense,
} from 'react';
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
import {
  collection,
  getDocs,
  query,
  limit,
  startAfter,
  orderBy,
} from 'firebase/firestore';
import {
  generateOperatingHoursDisplay,
  getBusinessStatus,
} from '../utils/businessHours';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {processWeeklySchedule} from '../utils/timeUtils';
import {useTranslation} from 'react-i18next';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

// // Lazy loaded components for better performance
// const ServiceCard = lazy(() => import('../components/ServiceCard'));
// const CategoryCard = lazy(() => import('../components/CategoryCard'));

export default function Home() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [locationText, setLocationText] = useState(t('fetching_location'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  // const [subCategories, setSubCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [displayedServices, setDisplayedServices] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreServices, setHasMoreServices] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scrollViewRef = useRef(null);
  const servicesRef = useRef(null);
  const lastDocumentRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Pagination constants
  const ITEMS_PER_PAGE = 10;
  const ITEMS_PER_BATCH = 50; // Load 50 businesses at a time from Firestore

  const scrollToServices = () => {
    if (servicesRef.current && scrollViewRef.current) {
      servicesRef.current.measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current.scrollTo({y: y - 20, animated: true});
        },
        () => {},
      );
    }
  };

  const toggleShowCategories = () => {
    setShowAllCategories(prev => !prev);
  };

  const checkAdminRole = async () => {
    try {
      const userRole = await AsyncStorage.getItem('userRole');
      if (userRole && userRole === 'admin') {
        navigation.reset({index: 0, routes: [{name: 'Admin'}]});
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  useEffect(() => {
    checkAdminRole();
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
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

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const categoriesQuery = query(collection(db, 'Categories'));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      if (!categoriesSnapshot.empty) {
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().category_name,
          icon: doc.data().icon || 'category',
          description: doc.data().description || '',
          image: doc.data().image || null,
        }));
        setCategories(categoriesData);
      }
    } catch (err) {
      console.error('Error fetching categories:', err.message);
      setError(t('failed_load_categories'));
    } finally {
      setCategoriesLoading(false);
    }
  };

  // const fetchSubCategories = async () => {
  //   try {
  //     const subCategoriesQuery = query(collection(db, 'SubCategories'));
  //     const subCategoriesSnapshot = await getDocs(subCategoriesQuery);
  //     if (!subCategoriesSnapshot.empty) {
  //       const subCategoriesData = subCategoriesSnapshot.docs.map(doc => ({
  //         id: doc.id,
  //         name: doc.data().sub_category_name,
  //         category_id: doc.data().category_id,
  //         icon: doc.data().icon || 'category',
  //         description: doc.data().description || '',
  //         image: doc.data().image || null,
  //       }));
  //       setSubCategories(subCategoriesData);
  //     }
  //   } catch (err) {
  //     console.error('Error fetching subcategories:', err.message);
  //   }
  // };

  // Optimized fetchServices with pagination
  const fetchServices = async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setServicesLoading(true);
        lastDocumentRef.current = null;
      } else {
        setLoadingMore(true);
      }

      let servicesQuery = query(
        collection(db, 'Businesses'),
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_BATCH),
      );

      if (isLoadMore && lastDocumentRef.current) {
        servicesQuery = query(
          collection(db, 'Businesses'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDocumentRef.current),
          limit(ITEMS_PER_BATCH),
        );
      }

      const servicesSnapshot = await getDocs(servicesQuery);

      if (!servicesSnapshot.empty) {
        lastDocumentRef.current =
          servicesSnapshot.docs[servicesSnapshot.docs.length - 1];

        const servicesData = servicesSnapshot.docs.map(doc => {
          const data = doc.data();
          const processedWeeklySchedule = processWeeklySchedule(
            data.weeklySchedule,
          );
          return {
            id: doc.id,
            userId: data.userId || '',
            name: data.businessName || t('unknown_business'),
            category: data.categories?.[0] || t('general'),
            // subCategories: data.subCategories || [],
            rating: data.rating || 4.5,
            latitude: data.location?.latitude || 0,
            longitude: data.location?.longitude || 0,
            address: data.address || {},
            weeklySchedule: processedWeeklySchedule,
            contactNumber: data.contactNumber || '',
            whatsappNumber: data.whatsappNumber || '',
            email: data.email || '',
            ownerName: data.ownerName || '',
            images: data.images || [],
            description: data.description || '', // Include description for search
            createdAt: data.createdAt || '',
          };
        });

        if (isLoadMore) {
          setServices(prev => [...prev, ...servicesData]);
        } else {
          setServices(servicesData);
        }

        setHasMoreServices(servicesData.length === ITEMS_PER_BATCH);
      } else {
        setHasMoreServices(false);
        if (!isLoadMore) setServices([]);
      }
    } catch (err) {
      console.error('Error fetching services:', err.message);
      setError(t('failed_load_services'));
    } finally {
      setServicesLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      lastDocumentRef.current = null;
      await Promise.all([fetchCategories(), fetchServices(false)]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const sortServicesByStatus = useMemo(() => {
    return servicesList => {
      return servicesList.sort((a, b) => {
        const statusA = getBusinessStatus(a.weeklySchedule);
        const statusB = getBusinessStatus(b.weeklySchedule);
        if (statusA.status === 'open' && statusB.status !== 'open') return -1;
        if (statusA.status !== 'open' && statusB.status === 'open') return 1;
        if (a.distance && b.distance) return a.distance - b.distance;
        return 0;
      });
    };
  }, []);

  // Optimized search and filter with description field
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      let filtered = services;

      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        filtered = filtered.filter(service => {
          const nameMatch = service.name.toLowerCase().includes(queryLower);
          const categoryMatch = service.category
            .toLowerCase()
            .includes(queryLower);
          // const subCategoryMatch = service.subCategories.some(sub =>
          //   sub.toLowerCase().includes(queryLower),
          // );
          const descriptionMatch =
            service.description &&
            service.description.toLowerCase().includes(queryLower);

          return (
            nameMatch || categoryMatch || descriptionMatch
          );
        });
      }

      if (location) {
        filtered = filtered.map(service => ({
          ...service,
          distance: calculateDistance(
            location.latitude,
            location.longitude,
            service.latitude,
            service.longitude,
          ),
        }));
      }

      const sortedFiltered = sortServicesByStatus(filtered);
      setFilteredServices(sortedFiltered);
      setDisplayedServices(sortedFiltered.slice(0, ITEMS_PER_PAGE));
      setHasMoreServices(sortedFiltered.length > ITEMS_PER_PAGE);
    }, 500); // Increased debounce time for better performance

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, services, location, sortServicesByStatus]);

  useEffect(() => {
    if (searchQuery.trim() && isSearchActive) {
      setTimeout(() => scrollToServices(), 100);
    }
  }, [searchQuery]);

  // Optimized loadMoreServices
  const loadMoreServices = () => {
    if (loadingMore) return;

    if (searchQuery.trim() || !hasMoreServices) {
      // Load more from filtered results (client-side pagination)
      if (displayedServices.length < filteredServices.length) {
        setLoadingMore(true);
        setTimeout(() => {
          const currentLength = displayedServices.length;
          const nextServices = filteredServices.slice(
            currentLength,
            currentLength + ITEMS_PER_PAGE,
          );
          setDisplayedServices(prev => [...prev, ...nextServices]);
          setLoadingMore(false);
        }, 300);
      }
    } else {
      // Load more from Firestore (server-side pagination)
      fetchServices(true);
    }
  };

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
        setError(t('location_permission_denied'));
        setLocationText(t('location_unavailable'));
        setLoading(false);
      }
    }
  };

  const fetchLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        setLocation(position.coords);
        setLocationText(t('nearby'));
        setLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      },
      error => {
        setError(error.message);
        setLocationText(t('location_unavailable'));
        setLoading(false);
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  useEffect(() => {
    fetchCategories();
    checkAndRequestPermission();
  }, [fadeAnim]);

  useEffect(() => {
    if (location) {
      fetchServices();
    }
  }, [location]);

  const navigateToCategory = category => {
    const categoryServices = filteredServices.filter(
      service => service.category === category.name,
    );

    navigation.navigate('Services', {
      category: category.name,
      services: categoryServices,
      title: `${category.name} Services`,
    });
  };

  const navigateToServiceDetails = service => {
    navigation.navigate('Details', {service});
  };

  // Memoized render functions for better performance
  const renderServiceCard = useMemo(() => {
    return ({item: service, index}) => {
      const businessStatus = getBusinessStatus(service.weeklySchedule);
      const hasImages = service.images && service.images.length > 0;
      const categoryIcon = service.icon || 'business';

      return (
        <Suspense
          fallback={
            <View className="bg-white rounded-2xl shadow-lg mb-4 overflow-hidden border border-gray-100 mx-4 h-80 justify-center items-center">
              <ActivityIndicator size="small" color="#FF4500" />
            </View>
          }>
          <TouchableOpacity
            className="bg-white rounded-2xl shadow-lg mb-4 overflow-hidden border border-gray-100 mx-4"
            onPress={() => navigateToServiceDetails(service)}
            style={{elevation: 3}}>
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
                    <Icon name={categoryIcon} size={40} color="#FF4500" />
                  </View>
                </View>
              )}
              <View className="absolute top-3 left-3">
                <View
                  className={`px-3 py-1 rounded-full flex-row items-center ${
                    businessStatus.status === 'open'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}>
                  <View
                    className={`w-2 h-2 rounded-full mr-2 ${
                      businessStatus.status === 'open' ? 'bg-white' : 'bg-white'
                    }`}
                  />
                  <Text className="text-white text-xs font-medium">
                    {businessStatus.status === 'open' ? t('open') : t('closed')}
                  </Text>
                </View>
              </View>
              {service.distance && (
                <View className="absolute top-3 right-3">
                  <View className="bg-black bg-opacity-70 px-3 py-1 rounded-full">
                    <Text className="text-white text-xs font-medium">
                      {service.distance.toFixed(1)} {t('km')}
                    </Text>
                  </View>
                </View>
              )}
              <View className="absolute bottom-3 right-3">
                <View className="bg-white rounded-full px-3 py-1 flex-row items-center shadow-md">
                  <Icon name="star" size={14} color="#FFD700" />
                  <Text className="text-gray-800 text-xs font-bold ml-1">
                    {service.rating}
                  </Text>
                </View>
              </View>
            </View>
            <View className="p-4">
              <Text
                className="text-lg font-bold text-gray-800 mb-1"
                numberOfLines={1}>
                {service.name}
              </Text>
              <Text className="text-gray-500 text-sm mb-2">
                {service.category}
              </Text>
              {service.description && (
                <Text className="text-gray-600 text-xs mb-2" numberOfLines={2}>
                  {service.description}
                </Text>
              )}
              {service.address &&
                (service.address.city || service.address.street) && (
                  <View className="flex-row items-center mb-3">
                    <Icon name="location-on" size={16} color="#FF4500" />
                    <Text
                      className="text-gray-600 text-sm ml-1 flex-1"
                      numberOfLines={1}>
                      {service.address.street
                        ? `${service.address.street}, `
                        : ''}
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
        </Suspense>
      );
    };
  }, [t, navigateToServiceDetails]);

  const renderCategoryCard = useMemo(() => {
    return cat => (
      <Suspense
        key={cat.id}
        fallback={
          <View
            className="bg-white rounded-xl shadow-sm mb-4 p-4 items-center border border-gray-100"
            style={{width: '31%'}}>
            <ActivityIndicator size="small" color="#FF4500" />
          </View>
        }>
        <TouchableOpacity
          className="bg-white rounded-xl shadow-sm mb-4 p-4 items-center border border-gray-100"
          style={{width: '31%'}}
          onPress={() => navigateToCategory(cat)}>
          <View className="bg-primary-light rounded-full p-2">
            {cat.image ? (
              <Image
                source={{
                  uri: `data:image/jpeg;base64,${cat.image}`,
                }}
                className="w-20 h-20 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <Icon name={cat.icon || 'business'} size={32} color="#FF4500" />
            )}
          </View>
          <Text
            className="font-bold text-gray-700 text-sm text-center"
            numberOfLines={2}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      </Suspense>
    );
  }, [navigateToCategory]);

  const renderLoadMoreFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#FF4500" />
        <Text className="text-center text-gray-600 mt-2">
          {t('loading_more_services')}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF4500" />
        <Text className="mt-4 text-gray-600">{t('loading')}</Text>
      </View>
    );
  }

  if (error && !location) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-red-500 text-lg">
          {t('unable_fetch_location')}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-primary px-6 py-3 rounded-lg"
          onPress={() => {
            checkAndRequestPermission();
            fetchLocation();
          }}>
          <Text className="text-white font-bold">{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Animated.View
        className="bg-white rounded-xl mx-4 mt-3 p-3 flex-row items-center shadow-sm border border-gray-200"
        style={{opacity: fadeAnim}}>
        <Icon name="search" size={20} color="#FF4500" className="mr-2" />
        <TextInput
          className="flex-1 text-gray-800 text-base"
          placeholder={t('search_services_placeholder')}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onPress={() => setIsSearchActive(true)}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="clear" size={20} color="#FF4500" />
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
            colors={['#FF4500']}
            tintColor="#FF4500"
            title={t('pull_to_refresh')}
            titleColor="#FF4500"
          />
        }>
        {!isSearchActive && (
          <View className="px-4 mt-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-700 font-bold text-xl">
                {t('explore_categories')}
              </Text>
              {categories.length > 5 && showAllCategories && (
                <TouchableOpacity
                  onPress={() => setShowAllCategories(false)}
                  className="flex-row items-center bg-primary-light px-3 py-2 rounded-full">
                  <Text className="text-primary-dark text-sm font-medium mr-1">
                    {t('show_less')}
                  </Text>
                  <Icon name="keyboard-arrow-up" size={18} color="#689F38" />
                </TouchableOpacity>
              )}
            </View>

            {categoriesLoading ? (
              <View className="flex-row justify-center py-8">
                <ActivityIndicator size="small" color="#FF4500" />
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {(showAllCategories ? categories : categories.slice(0, 5)).map(
                  renderCategoryCard,
                )}

                {categories.length > 5 && !showAllCategories && (
                  <TouchableOpacity
                    onPress={() => setShowAllCategories(true)}
                    className="bg-primary rounded-2xl shadow-lg mb-4 p-4 items-center justify-center border border-primary-dark"
                    style={{
                      width: '31%',
                      shadowColor: '#FF4500',
                      shadowOffset: {width: 0, height: 4},
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                      elevation: 6,
                    }}>
                    <View className="bg-white rounded-xl p-3 mb-3 w-14 h-14 items-center justify-center shadow-sm">
                      <Icon name="expand-more" size={24} color="#FF4500" />
                    </View>
                    <Text className="font-bold text-white text-sm text-center">
                      +{categories.length - 5}
                    </Text>
                    <Text className="text-white text-xs opacity-90 text-center mt-1">
                      {t('more')}
                    </Text>
                    <View className="absolute bottom-2 w-8 h-1 bg-white bg-opacity-30 rounded-full" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        <View ref={servicesRef} className="mt-6 mb-6">
          <View className="flex-row justify-between items-center mb-4 px-4">
            <Text className="text-gray-700 font-bold text-xl">
              {isSearchActive && searchQuery
                ? t('search_results')
                : t('nearby_services')}
            </Text>
            {location && (
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-gray-500 text-sm">
                  {filteredServices.length} {t('services')} • {t('open_first')}
                </Text>
              </View>
            )}
          </View>

          {servicesLoading ? (
            <View className="flex-row justify-center py-8">
              <ActivityIndicator size="small" color="#FF4500" />
              <Text className="ml-2 text-gray-600">
                {t('loading_services')}
              </Text>
            </View>
          ) : displayedServices.length > 0 ? (
            <FlatList
              data={displayedServices}
              renderItem={renderServiceCard}
              keyExtractor={item => item.id}
              onEndReached={loadMoreServices}
              onEndReachedThreshold={0.3}
              ListFooterComponent={renderLoadMoreFooter}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              nestedScrollEnabled={true}
              getItemLayout={(data, index) => ({
                length: 320,
                offset: 320 * index,
                index,
              })}
              removeClippedSubviews={true}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={30}
              initialNumToRender={8}
              windowSize={21}
            />
          ) : (
            <View className="bg-white rounded-lg p-6 items-center mx-4">
              <Icon name="search_off" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 text-center mt-2">
                {searchQuery
                  ? t('no_services_found_search')
                  : t('no_services_available_area')}
              </Text>
              {searchQuery && (
                <TouchableOpacity
                  className="mt-3 bg-primary px-4 py-2 rounded-lg"
                  onPress={() => setSearchQuery('')}>
                  <Text className="text-white font-medium">
                    {t('clear_search')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!isSearchActive &&
            filteredServices.length > displayedServices.length && (
              <TouchableOpacity
                className="bg-primary rounded-lg p-3 mt-4 mx-4"
                onPress={() =>
                  navigation.navigate('Services', {
                    services: filteredServices,
                    title: t('all_services'),
                  })
                }>
                <Text className="text-white font-bold text-center">
                  {t('view_all')} {filteredServices.length} {t('services')}
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </ScrollView>
    </View>
  );
}
