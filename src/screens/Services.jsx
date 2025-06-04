import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getBusinessStatus} from '../utils/businessHours';

const ServicesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {category, subcategory, services = [], title} = route.params || {};
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredServices, setFilteredServices] = useState(services);
  const [loading, setLoading] = useState(false);
  const fadeAnim = React.useState(new Animated.Value(0))[0];

  // Category icon mapping for fallback
  const categoryIcons = {
    Plumbers: 'plumbing',
    Electricians: 'electrical_services',
    Restaurants: 'restaurant',
    Doctors: 'medical_services',
    Automotive: 'directions_car',
    'Retail & Consumer Services': 'shopping_cart',
    'Health & Medical Services': 'local_hospital',
    'Food & Dining': 'fastfood',
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Filter services based on search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        const filtered = services.filter(
          service =>
            service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.category
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            service.subCategories.some(sub =>
              sub.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
        );
        setFilteredServices(filtered);
      } else {
        setFilteredServices(services);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, services]);

  const navigateToServiceDetails = service => {
    navigation.navigate('Details', {service});
  };

  // Render professional service card
  const renderServiceCard = service => {
    const businessStatus = getBusinessStatus(service.weeklySchedule);
    const hasImages = service.images && service.images.length > 0;
    const categoryIcon = categoryIcons[service.category] || 'business';

    return (
      <TouchableOpacity
        key={service.id}
        className="bg-white rounded-2xl shadow-lg mb-4 overflow-hidden border border-gray-100"
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
          {service.address &&
            (service.address.city || service.address.street) && (
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

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between bg-primary px-5 py-5 shadow-md">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 rounded-full bg-primary-dark shadow-sm">
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View className="flex-1 mx-3">
          <Text className="text-white font-bold text-lg text-center">
            {title || `${subcategory || category} Services`}
          </Text>
        </View>
        <View className="w-10" />
      </View>

      <Animated.View className="flex-1" style={{opacity: fadeAnim}}>
        {/* Search Bar */}
        <View className="bg-white rounded-xl mx-4 mt-4 p-3 flex-row items-center shadow-sm border border-gray-200">
          <Icon name="search" size={20} color="#8BC34A" className="mr-2" />
          <TextInput
            className="flex-1 text-gray-800 text-base"
            placeholder="Search services..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="clear" size={20} color="#8BC34A" />
            </TouchableOpacity>
          )}
        </View>

        {/* Services Count and Filter Options */}
        <View className="flex-row justify-between items-center px-4 mt-4">
          <Text className="text-gray-600 text-sm">
            {filteredServices.length} service
            {filteredServices.length !== 1 ? 's' : ''} found
          </Text>
          <TouchableOpacity className="flex-row items-center">
            <Icon name="tune" size={16} color="#8BC34A" />
            <Text className="text-primary text-sm ml-1 font-medium">
              Filter
            </Text>
          </TouchableOpacity>
        </View>

        {/* Services List */}
        <ScrollView
          className="flex-1 px-4 mt-2"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 20}}>
          {loading ? (
            <View className="flex-row justify-center py-8">
              <ActivityIndicator size="small" color="#8BC34A" />
              <Text className="ml-2 text-gray-600">Loading services...</Text>
            </View>
          ) : filteredServices.length > 0 ? (
            <View>
              {filteredServices.map(service => renderServiceCard(service))}
            </View>
          ) : (
            <View className="bg-white rounded-2xl p-8 items-center mt-8 shadow-sm">
              <View className="bg-gray-100 rounded-full p-4 mb-4">
                <Icon name="search_off" size={48} color="#9CA3AF" />
              </View>
              <Text className="text-gray-700 font-bold text-lg mb-2">
                {searchQuery ? 'No Results Found' : 'No Services Available'}
              </Text>
              <Text className="text-gray-500 text-center mb-4">
                {searchQuery
                  ? `We couldn't find any services matching "${searchQuery}"`
                  : 'No services are currently available in this category'}
              </Text>
              {searchQuery && (
                <TouchableOpacity
                  className="bg-primary px-6 py-3 rounded-full"
                  onPress={() => setSearchQuery('')}>
                  <Text className="text-white font-bold">Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default ServicesScreen;
