/* eslint-disable no-shadow */
import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  FlatList,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {db} from '../../config/firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

const AdminDonations = () => {
  const navigation = useNavigation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const handleAddDonation = async () => {
    if (title.trim() && description.trim()) {
      try {
        const donationRef = doc(collection(db, 'Donations'));
        const newDonation = {
          id: donationRef.id,
          title: title.trim(),
          description: description.trim(),
          totalDonations: 0,
          totalAmount: 0,
          createdAt: new Date(),
          status: 'active',
        };

        await setDoc(donationRef, newDonation);

        Alert.alert('Success', 'Donation cause added successfully!');
        setTitle('');
        setDescription('');
        setIsModalVisible(false);
        setDonations(prevDonations => [...prevDonations, newDonation]);
      } catch (error) {
        console.error('Error adding donation:', error);
        Alert.alert('Error', 'Failed to add donation. Please try again.');
      }
    } else {
      Alert.alert('Error', 'Please fill in all fields');
    }
  };

  // ✅ ADDED: Delete donation cause with confirmation
  const handleDeleteDonation = async (donationId, donationTitle) => {
    Alert.alert(
      'Delete Donation Cause',
      `Are you sure you want to delete "${donationTitle}"? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleteLoading(donationId);

              // Check if there are any donations for this cause
              const paymentsQuery = query(
                collection(db, 'DonationPayments'),
                where('donationCauseId', '==', donationId),
              );
              const paymentsSnapshot = await getDocs(paymentsQuery);

              if (!paymentsSnapshot.empty) {
                Alert.alert(
                  'Cannot Delete',
                  'This donation cause has existing donations and cannot be deleted. You can deactivate it instead.',
                  [{text: 'OK'}],
                );
                setDeleteLoading(null);
                return;
              }

              // Delete the donation cause
              await deleteDoc(doc(db, 'Donations', donationId));

              // Update local state
              setDonations(prev =>
                prev.filter(donation => donation.id !== donationId),
              );

              Alert.alert('Success', 'Donation cause deleted successfully!');
            } catch (error) {
              console.error('Error deleting donation:', error);
              Alert.alert(
                'Error',
                'Failed to delete donation cause. Please try again.',
              );
            } finally {
              setDeleteLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleCategoryPress = async category => {
    try {
      // ✅ FIXED: Get accurate donation count from DonationPayments collection
      const paymentsQuery = query(
        collection(db, 'DonationPayments'),
        where('donationCauseId', '==', category.id),
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);

      // ✅ FIXED: Calculate actual totals from payments
      let actualDonationCount = 0;
      let actualTotalAmount = 0;

      paymentsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'confirmed') {
          actualDonationCount++;
          actualTotalAmount += data.amount || 0;
        }
      });

      navigation.navigate('AdminDonationDetails', {
        id: category.id,
        name: category.title,
        count: actualDonationCount, // ✅ Use actual count
        description: category.description,
        totalAmount: actualTotalAmount, // ✅ Use actual amount
      });
    } catch (error) {
      console.error('Error fetching donation count:', error);
      navigation.navigate('AdminDonationDetails', {
        id: category.id,
        name: category.title,
        count: 0,
        description: category.description,
        totalAmount: 0,
      });
    }
  };

  const renderCategoryCard = ({item}) => (
    <TouchableOpacity
      className="bg-white mx-4 mb-4 rounded-xl shadow-md border border-gray-100"
      onPress={() => handleCategoryPress(item)}
      activeOpacity={0.8}>
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-4">
            <Text className="text-lg font-bold text-gray-800 mb-1">
              {item.title}
            </Text>
            <Text className="text-gray-600 text-sm leading-5" numberOfLines={2}>
              {item.description}
            </Text>
          </View>

          {/* ✅ ADDED: Delete button */}
          <View className="flex-row items-center">
            <TouchableOpacity
              className="bg-red-100 rounded-lg p-2 mr-2"
              onPress={() => handleDeleteDonation(item.id, item.title)}
              disabled={deleteLoading === item.id}>
              {deleteLoading === item.id ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Icon name="delete" size={20} color="#EF4444" />
              )}
            </TouchableOpacity>
            <Icon name="chevron-right" size={24} color="#8BC34A" />
          </View>
        </View>

        {/* Statistics */}
        <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Icon name="people" size={16} color="#10B981" />
            <Text className="text-gray-600 text-sm ml-1">
              {item.totalDonations || 0} donors
            </Text>
          </View>
          <View className="flex-row items-center">
            <Icon name="currency-rupee" size={16} color="#10B981" />
            <Text className="text-green-600 font-semibold">
              ₹{(item.totalAmount || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Status */}
        <View className="flex-row justify-between items-center mt-2">
          <View
            className={`px-2 py-1 rounded-full ${
              item.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
            <Text
              className={`text-xs font-medium ${
                item.status === 'active' ? 'text-green-700' : 'text-gray-600'
              }`}>
              {item.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <Text className="text-gray-400 text-xs">
            {item.createdAt
              ? new Date(item.createdAt.toDate()).toLocaleDateString()
              : 'N/A'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ✅ FIXED: Fetch donations with accurate statistics
  const fetchDonations = async () => {
    try {
      setLoading(true);
      const donationsSnapshot = await getDocs(collection(db, 'Donations'));

      const donationsList = await Promise.all(
        donationsSnapshot.docs.map(async doc => {
          const data = doc.data();

          // ✅ FIXED: Get accurate statistics from DonationPayments
          const paymentsQuery = query(
            collection(db, 'DonationPayments'),
            where('donationCauseId', '==', doc.id),
          );
          const paymentsSnapshot = await getDocs(paymentsQuery);

          let actualDonationCount = 0;
          let actualTotalAmount = 0;

          paymentsSnapshot.forEach(paymentDoc => {
            const paymentData = paymentDoc.data();
            if (paymentData.status === 'confirmed') {
              actualDonationCount++;
              actualTotalAmount += paymentData.amount || 0;
            }
          });

          return {
            id: doc.id,
            ...data,
            totalDonations: actualDonationCount, // ✅ Use actual count
            totalAmount: actualTotalAmount, // ✅ Use actual amount
          };
        }),
      );

      setDonations(donationsList);
    } catch (error) {
      console.error('Error fetching donations:', error);
      Alert.alert('Error', 'Failed to fetch donations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="mt-4 text-gray-600">Loading donations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white px-6 py-4 shadow-sm border-b border-gray-100">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="mr-4 p-2 -ml-2"
                activeOpacity={0.7}>
                <Icon name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-gray-800 text-xl font-bold">
                Admin - Donations
              </Text>
            </View>
            <TouchableOpacity
              className="bg-primary rounded-lg px-4 py-2 flex-row items-center"
              onPress={() => setIsModalVisible(true)}
              activeOpacity={0.8}>
              <Icon name="add" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold ml-1">Add Cause</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics Overview */}
        <View className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <Text className="text-gray-800 font-bold text-lg mb-4">Overview</Text>
          <View className="flex-row justify-between">
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-primary">
                {donations.length}
              </Text>
              <Text className="text-gray-600 text-sm">Total Causes</Text>
            </View>
            <View className="w-px bg-gray-200 mx-4" />
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-green-600">
                {donations.reduce((sum, d) => sum + (d.totalDonations || 0), 0)}
              </Text>
              <Text className="text-gray-600 text-sm">Total Donors</Text>
            </View>
            <View className="w-px bg-gray-200 mx-4" />
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-blue-600">
                ₹
                {donations
                  .reduce((sum, d) => sum + (d.totalAmount || 0), 0)
                  .toLocaleString('en-IN')}
              </Text>
              <Text className="text-gray-600 text-sm">Total Raised</Text>
            </View>
          </View>
        </View>

        {/* Categories Section */}
        <View className="mt-6">
          <Text className="text-gray-700 font-bold text-lg mb-4 px-4">
            Donation Causes
          </Text>
          {donations.length > 0 ? (
            <FlatList
              data={donations}
              renderItem={renderCategoryCard}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View className="bg-white rounded-lg p-6 items-center mx-4">
              <Icon name="volunteer-activism" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-center mt-2">
                No donation causes found
              </Text>
              <Text className="text-gray-400 text-center mt-1">
                Add a new cause to get started
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Donation Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-gray-800 text-xl font-bold">
                Add New Donation Cause
              </Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                className="p-2 -mr-2">
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-gray-700 font-medium mb-2">Title *</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter donation cause title"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View>
                <Text className="text-gray-700 font-medium mb-2">
                  Description *
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200 h-24"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter donation cause description"
                  placeholderTextColor="#9CA3AF"
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View className="flex-row space-x-3 pt-4">
                <TouchableOpacity
                  className="flex-1 bg-gray-100 rounded-xl py-3"
                  onPress={() => setIsModalVisible(false)}
                  activeOpacity={0.8}>
                  <Text className="text-gray-700 font-semibold text-center">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-primary rounded-xl py-3"
                  onPress={handleAddDonation}
                  activeOpacity={0.8}>
                  <Text className="text-white font-semibold text-center">
                    Add Cause
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminDonations;
