import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { db } from '../../config/firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const AdminBusinessScreen = ({ navigation }) => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const businessQuery = query(
        collection(db, 'Businesses'),
        orderBy('createdAt', 'desc')
      );
      const businessSnapshot = await getDocs(businessQuery);
      
      if (!businessSnapshot.empty) {
        const businessData = businessSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBusinesses(businessData);
      } else {
        setBusinesses([]);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBusinesses();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatOperatingHours = (weeklySchedule) => {
    if (!weeklySchedule) return 'Not specified';
    
    const openDays = Object.keys(weeklySchedule).filter(day => 
      weeklySchedule[day]?.isOpen
    );
    
    if (openDays.length === 0) return 'Closed all days';
    if (openDays.length === 7) return 'Open all days';
    
    return `Open ${openDays.length} days`;
  };

  const openBusinessDetail = (business) => {
    setSelectedBusiness(business);
    setDetailModalVisible(true);
  };

  const renderBusinessItem = ({ item }) => (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-4 shadow-md border border-gray-100 mx-4"
      onPress={() => openBusinessDetail(item)}
      style={{ elevation: 3 }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800 mb-1" numberOfLines={1}>
            {item.businessName || 'Unnamed Business'}
          </Text>
          <Text className="text-gray-600 text-sm">
            Owner: {item.ownerName || 'N/A'}
          </Text>
        </View>
        <View className="items-end">
          
          <Text className="text-gray-500 text-xs">
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center mb-2">
        <Icon name="email" size={14} color="#8BC34A" />
        <Text className="text-gray-600 text-sm ml-2" numberOfLines={1}>
          {item.email || 'No email'}
        </Text>
      </View>

      <View className="flex-row items-center mb-2">
        <Icon name="phone" size={14} color="#8BC34A" />
        <Text className="text-gray-600 text-sm ml-2">
          {item.contactNumber || 'No contact'}
        </Text>
      </View>

      <View className="flex-row items-center mb-3">
        <Icon name="map-marker" size={14} color="#8BC34A" />
        <Text className="text-gray-600 text-sm ml-2 flex-1" numberOfLines={1}>
          {item.address ? 
            `${item.address.street || ''}, ${item.address.city || ''}`.replace(/^,\s*/, '') 
            : 'No address'
          }
        </Text>
      </View>

      {item.categories && item.categories.length > 0 && (
        <View className="flex-row flex-wrap mb-2">
          {item.categories.slice(0, 2).map((category, index) => (
            <View key={index} className="bg-blue-100 px-2 py-1 rounded-full mr-2 mb-1">
              <Text className="text-blue-700 text-xs font-medium">
                {category}
              </Text>
            </View>
          ))}
          {item.categories.length > 2 && (
            <View className="bg-gray-100 px-2 py-1 rounded-full">
              <Text className="text-gray-600 text-xs">
                +{item.categories.length - 2} more
              </Text>
            </View>
          )}
        </View>
      )}

      <View className="flex-row justify-between items-center">
        <Text className="text-gray-500 text-xs">
          {formatOperatingHours(item.weeklySchedule)}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-primary text-sm font-medium mr-2">
            ₹{item.payment?.amount || '0'}
          </Text>
          <Icon name="chevron-right" size={16} color="#8BC34A" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Replace the existing renderBusinessDetail function with this updated version
const renderBusinessDetail = () => {
  if (!selectedBusiness) return null;

  // Helper function to safely format time
  const formatTime = (timeValue) => {
    if (!timeValue) return 'N/A';
    
    try {
      let date;
      
      // Handle different time formats
      if (timeValue.toDate) {
        // Firebase Timestamp
        date = timeValue.toDate();
      } else if (timeValue.seconds) {
        // Firebase Timestamp object
        date = new Date(timeValue.seconds * 1000);
      } else if (typeof timeValue === 'string') {
        // ISO string
        date = new Date(timeValue);
      } else if (timeValue instanceof Date) {
        // Already a Date object
        date = timeValue;
      } else {
        // Fallback
        date = new Date(timeValue);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Time';
      }
      
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid Time';
    }
  };

  return (
    <Modal
      visible={detailModalVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setDetailModalVisible(false)}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center bg-primary px-4 py-3 shadow-md">
          <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg ml-4">Business Details</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-4">
            {/* Basic Information */}
            <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
              <View className="flex-row items-center mb-4">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="store" size={24} color="#8BC34A" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-800">
                    {selectedBusiness.businessName || 'Unnamed Business'}
                  </Text>
                  <Text className="text-gray-600">
                    Owner: {selectedBusiness.ownerName || 'N/A'}
                  </Text>
                </View>
              </View>

              <View className="space-y-3">
                <View className="flex-row items-center mb-3">
                  <Icon name="email" size={18} color="#8BC34A" />
                  <Text className="text-gray-700 ml-3 flex-1">
                    {selectedBusiness.email || 'No email provided'}
                  </Text>
                </View>

                <View className="flex-row items-center mb-3">
                  <Icon name="phone" size={18} color="#8BC34A" />
                  <Text className="text-gray-700 ml-3">
                    {selectedBusiness.contactNumber || 'No contact provided'}
                  </Text>
                </View>

                <View className="flex-row items-start">
                  <Icon name="map-marker" size={18} color="#8BC34A" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gray-700">
                      {selectedBusiness.address?.street && `${selectedBusiness.address.street}, `}
                      {selectedBusiness.address?.city || 'No address provided'}
                    </Text>
                    {selectedBusiness.address?.pinCode && (
                      <Text className="text-gray-500 text-sm">
                        PIN: {selectedBusiness.address.pinCode}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Payment Information */}
            <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
              <View className="flex-row items-center mb-4">
                <View className="bg-green-100 rounded-full p-3 mr-4">
                  <Icon name="currency-inr" size={24} color="#059669" />
                </View>
                <Text className="text-xl font-bold text-gray-800">Payment Details</Text>
              </View>

              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-600">Registration Fee:</Text>
                <Text className="text-lg font-bold text-primary">
                  ₹{selectedBusiness.registrationFee || '0'}
                </Text>
              </View>

              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-600">Payment Status:</Text>
                <View className={`px-3 py-1 rounded-full ${
                  selectedBusiness.paymentStatus === 'completed' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <Text className={`text-sm font-medium ${
                    selectedBusiness.paymentStatus === 'completed' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {selectedBusiness.paymentStatus || 'Pending'}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Registration Date:</Text>
                <Text className="text-gray-800 font-medium">
                  {formatDate(selectedBusiness.createdAt)}
                </Text>
              </View>
            </View>

            {/* Categories */}
            {selectedBusiness.categories && selectedBusiness.categories.length > 0 && (
              <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                <View className="flex-row items-center mb-4">
                  <View className="bg-blue-100 rounded-full p-3 mr-4">
                    <Icon name="tag-multiple" size={24} color="#2563EB" />
                  </View>
                  <Text className="text-xl font-bold text-gray-800">Categories</Text>
                </View>

                <View className="flex-row flex-wrap">
                  {selectedBusiness.categories.map((category, index) => (
                    <View key={index} className="bg-blue-100 px-3 py-2 rounded-full mr-2 mb-2">
                      <Text className="text-blue-700 font-medium">
                        {category}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Subcategories */}
            {selectedBusiness.subCategories && selectedBusiness.subCategories.length > 0 && (
              <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                <View className="flex-row items-center mb-4">
                  <View className="bg-purple-100 rounded-full p-3 mr-4">
                    <Icon name="tag-outline" size={24} color="#7C3AED" />
                  </View>
                  <Text className="text-xl font-bold text-gray-800">Subcategories</Text>
                </View>

                <View className="flex-row flex-wrap">
                  {selectedBusiness.subCategories.map((subCategory, index) => (
                    <View key={index} className="bg-purple-100 px-3 py-2 rounded-full mr-2 mb-2">
                      <Text className="text-purple-700 font-medium">
                        {subCategory}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Operating Hours - FIXED */}
            {selectedBusiness.weeklySchedule && (
              <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                <View className="flex-row items-center mb-4">
                  <View className="bg-orange-100 rounded-full p-3 mr-4">
                    <Icon name="clock-outline" size={24} color="#EA580C" />
                  </View>
                  <Text className="text-xl font-bold text-gray-800">Operating Hours</Text>
                </View>

                {Object.keys(selectedBusiness.weeklySchedule).map((day) => {
                  const schedule = selectedBusiness.weeklySchedule[day];
                  return (
                    <View key={day} className="flex-row justify-between items-center py-2 border-b border-gray-100">
                      <Text className="text-gray-700 font-medium">{day}</Text>
                      {schedule?.isOpen ? (
                        <Text className="text-gray-600">
                          {schedule.openTime && schedule.closeTime ? 
                            `${formatTime(schedule.openTime)} - ${formatTime(schedule.closeTime)}` 
                            : 'Open'
                          }
                        </Text>
                      ) : (
                        <Text className="text-red-500">Closed</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Business Images */}
            {selectedBusiness.images && selectedBusiness.images.length > 0 && (
              <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                <View className="flex-row items-center mb-4">
                  <View className="bg-indigo-100 rounded-full p-3 mr-4">
                    <Icon name="image-multiple" size={24} color="#4F46E5" />
                  </View>
                  <Text className="text-xl font-bold text-gray-800">Business Images</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row">
                    {selectedBusiness.images.map((imageData, index) => (
                      <View key={index} className="mr-3">
                        <Image
                          source={{ uri: `data:image/jpeg;base64,${imageData.base64}` }}
                          className="w-32 h-32 rounded-lg"
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Location */}
            {selectedBusiness.location && (selectedBusiness.location.latitude || selectedBusiness.location.longitude) && (
              <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                <View className="flex-row items-center mb-4">
                  <View className="bg-red-100 rounded-full p-3 mr-4">
                    <Icon name="map" size={24} color="#DC2626" />
                  </View>
                  <Text className="text-xl font-bold text-gray-800">Location</Text>
                </View>

                <View className="space-y-2">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Latitude:</Text>
                    <Text className="text-gray-800 font-medium">
                      {selectedBusiness.location.latitude?.toFixed(6) || 'N/A'}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Longitude:</Text>
                    <Text className="text-gray-800 font-medium">
                      {selectedBusiness.location.longitude?.toFixed(6) || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};


  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="mt-4 text-gray-600">Loading businesses...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-gray-50" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="flex-row items-center bg-primary px-4 py-3 shadow-md">
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg ml-4">Registered Businesses</Text>
      </View>

      {/* Statistics */}
      <View className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-md">
        <View className="flex-row justify-between items-center">
          <View className="items-center">
            <Text className="text-2xl font-bold text-primary">{businesses.length}</Text>
            <Text className="text-gray-600 text-sm">Total Businesses</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">
              {businesses.filter(b => b.payment?.status === 'completed').length}
            </Text>
            <Text className="text-gray-600 text-sm">Paid</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-600">
              {businesses.filter(b => b.payment?.status !== 'completed').length}
            </Text>
            <Text className="text-gray-600 text-sm">Pending</Text>
          </View>
        </View>
      </View>

      {/* Business List */}
      {businesses.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <View className="bg-white rounded-2xl p-8 mx-4 shadow-md items-center">
            <Icon name="store-off" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg font-medium mt-4">No Businesses Found</Text>
            <Text className="text-gray-400 text-center mt-2">
              No businesses have been registered yet
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={businesses}
          renderItem={renderBusinessItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8BC34A']}
              tintColor="#8BC34A"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Business Detail Modal */}
      {renderBusinessDetail()}
    </KeyboardAvoidingView>
  );
};

export default AdminBusinessScreen;
