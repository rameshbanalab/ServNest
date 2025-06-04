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
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {auth, db} from '../config/firebaseConfig';
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

  const fetchMyBusinesses = async () => {
    try {
      const user = auth.currentUser;
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

  const getStatusColor = status => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'approved':
        return 'check-circle';
      case 'pending':
        return 'schedule';
      case 'rejected':
        return 'cancel';
      default:
        return 'help';
    }
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

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="text-gray-700 text-base mt-4">
          Loading your businesses...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#8BC34A']}
        />
      }>
      <View className="px-6 py-6">
        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <Text className="text-red-700 text-center">{error}</Text>
          </View>
        ) : null}

        {businesses.length === 0 ? (
          <View className="items-center py-12">
            <Icon name="store" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg font-medium mt-4 mb-2">
              No Businesses Yet
            </Text>
            <Text className="text-gray-400 text-center mb-6">
              Start by registering your first business with ServeNest
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-xl px-6 py-3"
              onPress={() => navigation.navigate('Register Business')}>
              <Text className="text-white font-bold">Register Business</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-4">
            {businesses.map(business => (
              <View
                key={business.id}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                {/* Business Header */}
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1">
                    <Text className="text-gray-800 font-bold text-lg mb-1">
                      {business.businessName}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      {business.categories?.join(', ')}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View
                    className={`px-3 py-1 rounded-full flex-row items-center ${getStatusColor(
                      business.status,
                    )}`}>
                    <Icon
                      name={getStatusIcon(business.status)}
                      size={14}
                      color={
                        business.status === 'approved'
                          ? '#16A34A'
                          : business.status === 'pending'
                          ? '#D97706'
                          : '#DC2626'
                      }
                    />
                    <Text className="ml-1 text-xs font-medium capitalize">
                      {business.status || 'pending'}
                    </Text>
                  </View>
                </View>

                {/* Business Info */}
                <View className="space-y-2 mb-4">
                  <View className="flex-row items-center">
                    <Icon name="person" size={16} color="#6B7280" />
                    <Text className="text-gray-600 text-sm ml-2">
                      {business.ownerName}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <Icon name="phone" size={16} color="#6B7280" />
                    <Text className="text-gray-600 text-sm ml-2">
                      {business.contactNumber}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <Icon name="location-on" size={16} color="#6B7280" />
                    <Text className="text-gray-600 text-sm ml-2">
                      {business.address?.city}, {business.address?.pinCode}
                    </Text>
                  </View>
                </View>

                {/* Business Images */}
                {business.images && business.images.length > 0 && (
                  <View className="mb-4">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}>
                      <View className="flex-row space-x-2">
                        {business.images.slice(0, 3).map((image, index) => (
                          <Image
                            key={index}
                            source={{
                              uri: `data:image/jpeg;base64,${image.base64}`,
                            }}
                            className="w-16 h-16 rounded-lg"
                            resizeMode="cover"
                          />
                        ))}
                        {business.images.length > 3 && (
                          <View className="w-16 h-16 rounded-lg bg-gray-100 items-center justify-center">
                            <Text className="text-gray-500 text-xs">
                              +{business.images.length - 3}
                            </Text>
                          </View>
                        )}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Action Buttons */}
                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    className="flex-1 bg-primary-light rounded-xl py-3 flex-row items-center justify-center"
                    onPress={() => editBusiness(business)}>
                    <Icon name="edit" size={16} color="#689F38" />
                    <Text className="text-primary-dark font-medium ml-2">
                      Edit
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 rounded-xl py-3 flex-row items-center justify-center ${
                      business.isActive ? 'bg-yellow-100' : 'bg-green-100'
                    }`}
                    onPress={() =>
                      toggleBusinessStatus(business.id, business.isActive)
                    }>
                    <Icon
                      name={business.isActive ? 'pause' : 'play-arrow'}
                      size={16}
                      color={business.isActive ? '#D97706' : '#16A34A'}
                    />
                    <Text
                      className={`font-medium ml-2 ${
                        business.isActive ? 'text-yellow-700' : 'text-green-700'
                      }`}>
                      {business.isActive ? 'Pause' : 'Activate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-red-100 rounded-xl py-3 px-4 flex-row items-center justify-center"
                    onPress={() =>
                      deleteBusiness(business.id, business.businessName)
                    }>
                    <Icon name="delete" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                {/* Created Date */}
                <Text className="text-gray-400 text-xs mt-3 text-center">
                  Created on {new Date(business.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
