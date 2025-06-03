import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
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
        </View>

        {/* Services Count */}
        <View className="px-4 mt-4">
          <Text className="text-gray-600 text-sm">
            {filteredServices.length} service
            {filteredServices.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        {/* Services List */}
        <ScrollView
          className="flex-1 px-4 mt-2"
          showsVerticalScrollIndicator={false}>
          {loading ? (
            <View className="flex-row justify-center py-8">
              <ActivityIndicator size="small" color="#8BC34A" />
              <Text className="ml-2 text-gray-600">Loading services...</Text>
            </View>
          ) : filteredServices.length > 0 ? (
            <View className="space-y-3 pb-6">
              {filteredServices.map(service => {
                const businessStatus = getBusinessStatus(
                  service.weeklySchedule,
                );

                return (
                  <TouchableOpacity
                    key={service.id}
                    className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
                    onPress={() => navigateToServiceDetails(service)}>
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-800">
                          {service.name}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-1">
                          {service.category}
                        </Text>

                        {/* Subcategories */}
                        {service.subCategories.length > 0 && (
                          <Text className="text-gray-400 text-xs mt-1">
                            {service.subCategories.slice(0, 2).join(', ')}
                            {service.subCategories.length > 2 &&
                              ` +${service.subCategories.length - 2} more`}
                          </Text>
                        )}

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

                        {/* Address */}
                        {service.address &&
                          (service.address.city || service.address.street) && (
                            <Text className="text-gray-400 text-xs mt-1">
                              📍{' '}
                              {service.address.street
                                ? `${service.address.street}, `
                                : ''}
                              {service.address.city}
                            </Text>
                          )}

                        {/* Distance */}
                        {service.distance && (
                          <Text className="text-blue-500 text-xs mt-1">
                            {service.distance.toFixed(1)} km away
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
                            onPress={e => {
                              e.stopPropagation();
                              // Handle call functionality
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
            </View>
          ) : (
            <View className="bg-white rounded-lg p-6 items-center mt-8">
              <Icon name="search-off" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 text-center mt-2">
                {searchQuery
                  ? 'No services found for your search'
                  : 'No services available'}
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
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default ServicesScreen;
