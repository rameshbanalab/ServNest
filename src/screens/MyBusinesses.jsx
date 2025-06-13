/* eslint-disable react-native/no-inline-styles */
/* eslint-disable no-catch-shadow */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ✅ UPDATED: Hybrid Firebase imports
import auth from '@react-native-firebase/auth'; // React Native Firebase for Auth
import {db} from '../config/firebaseConfig'; // Firebase Web SDK for Firestore
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

export default function MyBusinesses() {
  const navigation = useNavigation();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyBusinesses();
  }, []);

  // ✅ UPDATED: Use React Native Firebase auth syntax
  const fetchMyBusinesses = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        navigation.navigate('Login');
        return;
      }

      const businessesQuery = query(
        collection(db, 'Businesses'),
        where('userId', '==', user.uid),
      );

      const querySnapshot = await getDocs(businessesQuery);
      const businessesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setBusinesses(businessesData);
      setError('');
    } catch (err) {
      console.error('Error fetching businesses:', err);
      setError('Failed to load your businesses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyBusinesses();
  };

  const toggleBusinessStatus = async (businessId, currentStatus) => {
    const newStatus = currentStatus ? false : true;

    Alert.alert(
      'Update Business Status',
      `Are you sure you want to ${
        newStatus ? 'activate' : 'deactivate'
      } this business?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'Businesses', businessId), {
                isActive: newStatus,
                updatedAt: new Date().toISOString(),
              });
              fetchMyBusinesses();
            } catch (error) {
              Alert.alert('Error', 'Failed to update business status');
            }
          },
        },
      ],
    );
  };

  const deleteBusiness = async (businessId, businessName) => {
    Alert.alert(
      'Delete Business',
      `Are you sure you want to delete "${businessName}"? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'Businesses', businessId));
              fetchMyBusinesses();
              Alert.alert('Success', 'Business deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete business');
            }
          },
        },
      ],
    );
  };

  const editBusiness = business => {
    navigation.navigate('EditBusiness', {businessData: business});
  };

  const navigateToRegisterBusiness = () => {
    navigation.navigate('RegisterBusiness');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF4500" />
        <Text className="text-gray-700 text-base mt-4">
          Loading your businesses...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        {/* ✅ NEW: Register Business Button */}
        <TouchableOpacity
          className="bg-primary rounded-2xl p-4 flex-row items-center justify-center shadow-lg"
          style={{
            shadowColor: '#FF4500',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={navigateToRegisterBusiness}
          activeOpacity={0.8}>
          <View className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
            <Icon name="add-business" size={24} color="green" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">
              Register New Business
            </Text>
            <Text className="text-white text-sm opacity-90">
              Expand your reach with ServeNest
            </Text>
          </View>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF4500']}
            tintColor="#FF4500"
          />
        }>
        <View className="px-4 py-6">
          {/* Error Message */}
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <View className="flex-row items-center">
                <Icon name="error-outline" size={20} color="#DC2626" />
                <Text className="text-red-700 ml-2 flex-1">{error}</Text>
              </View>
            </View>
          ) : null}

          {/* Business Stats */}
          {businesses.length > 0 && (
            <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
              <Text className="text-gray-800 font-bold text-lg mb-3">
                Business Overview
              </Text>
              <View className="flex-row justify-around">
                <View className="items-center">
                  <Text className="text-2xl font-bold text-primary">
                    {businesses.length}
                  </Text>
                  <Text className="text-gray-400 text-sm">Total</Text>
                </View>
                <View className="w-px bg-gray-300" />
                <View className="items-center">
                  <Text className="text-2xl font-bold text-green-600">
                    {businesses.filter(b => b.isActive).length}
                  </Text>
                  <Text className="text-gray-400 text-sm">Active</Text>
                </View>
                <View className="w-px bg-gray-300" />
                <View className="items-center">
                  <Text className="text-2xl font-bold text-yellow-600">
                    {businesses.filter(b => !b.isActive).length}
                  </Text>
                  <Text className="text-gray-400 text-sm">Inactive</Text>
                </View>
              </View>
            </View>
          )}

          {/* Businesses List */}
          {businesses.length === 0 ? (
            <View className="items-center py-12">
              <View className="bg-white rounded-full p-6 shadow-lg mb-4">
                <Icon name="store" size={64} color="#FF4500" />
              </View>
              <Text className="text-gray-700 text-xl font-bold mb-2">
                No Businesses Yet
              </Text>
              <Text className="text-gray-400 text-center mb-6 px-8">
                Start your entrepreneurial journey by registering your first
                business with ServeNest
              </Text>
              <TouchableOpacity
                className="bg-primary rounded-xl px-8 py-4 flex-row items-center"
                onPress={navigateToRegisterBusiness}>
                <Icon name="add-business" size={20} color="#FFFFFF" />
                <Text className="text-white font-bold ml-2">Get Started</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-4">
              {businesses.map(business => (
                <View
                  key={business.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Business Header */}
                  <View className="p-6 border-b border-gray-100">
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1 mr-4">
                        <View className="flex-row items-center mb-2">
                          <Text className="text-gray-800 font-bold text-lg">
                            {business.businessName}
                          </Text>
                          {/* Status Badge */}
                          <View
                            className={`ml-3 px-2 py-1 rounded-full ${
                              business.isActive ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                            <Text
                              className={`text-xs font-medium ${
                                business.isActive
                                  ? 'text-green-700'
                                  : 'text-red-700'
                              }`}>
                              {business.isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-gray-500 text-sm">
                          {business.categories?.join(', ') || 'No categories'}
                        </Text>
                      </View>
                    </View>

                    {/* Business Info */}
                    <View className="space-y-2">
                      <View className="flex-row items-center">
                        <Icon name="person" size={16} color="#FF4500" />
                        <Text className="text-gray-600 text-sm ml-2">
                          {business.ownerName}
                        </Text>
                      </View>

                      <View className="flex-row items-center">
                        <Icon name="phone" size={16} color="#FF4500" />
                        <Text className="text-gray-600 text-sm ml-2">
                          {business.contactNumber}
                        </Text>
                      </View>

                      <View className="flex-row items-center">
                        <Icon name="location-on" size={16} color="#FF4500" />
                        <Text className="text-gray-600 text-sm ml-2">
                          {business.address?.city}, {business.address?.pinCode}
                        </Text>
                      </View>

                      <View className="flex-row items-center">
                        <Icon name="calendar-today" size={16} color="#FF4500" />
                        <Text className="text-gray-600 text-sm ml-2">
                          Created on{' '}
                          {new Date(business.createdAt).toLocaleDateString(
                            'en-IN',
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Business Images */}
                  {business.images && business.images.length > 0 && (
                    <View className="px-6 py-4 border-b border-gray-100">
                      <Text className="text-gray-700 font-medium mb-3">
                        Business Images
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="flex-row">
                        {business.images.slice(0, 4).map((image, index) => (
                          <Image
                            key={index}
                            source={{
                              uri: `data:image/jpeg;base64,${image.base64}`,
                            }}
                            className="w-20 h-20 rounded-xl mr-3"
                            resizeMode="cover"
                          />
                        ))}
                        {business.images.length > 4 && (
                          <View className="w-20 h-20 rounded-xl bg-gray-100 items-center justify-center">
                            <Text className="text-gray-500 text-xs font-medium">
                              +{business.images.length - 4}
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View className="p-6">
                    <View className="flex-row space-x-3">
                      {/* Edit Button */}
                      <TouchableOpacity
                        className="flex-1 bg-primary-light rounded-xl py-3 flex-row items-center justify-center"
                        onPress={() => editBusiness(business)}>
                        <Icon name="edit" size={18} color="#689F38" />
                        <Text className="text-primary-dark font-medium ml-2">
                          Edit
                        </Text>
                      </TouchableOpacity>

                      {/* Status Toggle Button */}
                      <TouchableOpacity
                        className={`flex-1 rounded-xl py-3 flex-row items-center justify-center ${
                          business.isActive ? 'bg-yellow-100' : 'bg-green-100'
                        }`}
                        onPress={() =>
                          toggleBusinessStatus(business.id, business.isActive)
                        }>
                        <Icon
                          name={business.isActive ? 'pause' : 'play-arrow'}
                          size={18}
                          color={business.isActive ? '#D97706' : '#16A34A'}
                        />
                        <Text
                          className={`font-medium ml-2 ${
                            business.isActive
                              ? 'text-yellow-700'
                              : 'text-green-700'
                          }`}>
                          {business.isActive ? 'Pause' : 'Activate'}
                        </Text>
                      </TouchableOpacity>

                      {/* Delete Button */}
                      <TouchableOpacity
                        className="bg-red-100 rounded-xl py-3 px-4 flex-row items-center justify-center"
                        onPress={() =>
                          deleteBusiness(business.id, business.businessName)
                        }>
                        <Icon name="delete" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Bottom Spacing */}
          <View style={{height: 20}} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
