import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {db} from '../../config/firebaseConfig';
import {collection, getDocs, query, where, orderBy} from 'firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function MyDonationsScreen() {
  const navigation = useNavigation();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalDonated, setTotalDonated] = useState(0);

  // Fetch user's donations
  const fetchMyDonations = async () => {
    try {
      setLoading(true);
      const currentUser = auth().currentUser;

      if (!currentUser) {
        Alert.alert('Error', 'Please login to view your donations');
        navigation.navigate('Login');
        return;
      }

      const donationsQuery = query(
        collection(db, 'DonationPayments'),
        where('userId', '==', currentUser.uid),
        orderBy('donationDate', 'desc'),
      );

      const donationsSnapshot = await getDocs(donationsQuery);

      if (!donationsSnapshot.empty) {
        const donationsData = donationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          donationDate: doc.data().donationDate?.toDate?.() || new Date(),
        }));

        // Calculate total donated amount
        const total = donationsData.reduce(
          (sum, donation) => sum + (donation.amount || 0),
          0,
        );

        setDonations(donationsData);
        setTotalDonated(total);
      } else {
        setDonations([]);
        setTotalDonated(0);
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      Alert.alert('Error', 'Failed to fetch donations');
    } finally {
      setLoading(false);
    }
  };

  // Refresh donations
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyDonations();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMyDonations();
  }, []);

  // Format date
  const formatDate = date => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format amount
  const formatAmount = amount => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  // Get status color
  const getStatusColor = status => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Navigate to donation details
  const viewDonationDetails = donation => {
    navigation.navigate('DonationDetails', {donation});
  };

  // Render donation card
  const renderDonationCard = donation => (
    <TouchableOpacity
      key={donation.id}
      className="bg-white rounded-2xl shadow-lg mb-4 mx-4 overflow-hidden"
      onPress={() => viewDonationDetails(donation)}
      activeOpacity={0.8}>
      {/* Header */}
      <View className="p-4 border-b border-gray-100">
        <View className="flex-row justify-between items-start mb-2">
          <Text
            className="text-lg font-bold text-gray-800 flex-1 mr-2"
            numberOfLines={2}>
            {donation.donationDetails?.title || 'Donation'}
          </Text>
          <View
            className="px-3 py-1 rounded-full"
            style={{backgroundColor: getStatusColor(donation.status) + '20'}}>
            <Text
              className="text-xs font-medium capitalize"
              style={{color: getStatusColor(donation.status)}}>
              {donation.status}
            </Text>
          </View>
        </View>

        <Text className="text-gray-600 text-sm mb-2">
          Donation ID: {donation.donationId}
        </Text>

        {/* Donation Details */}
        <View className="space-y-2">
          <View className="flex-row items-center">
            <Icon name="favorite" size={16} color="#10B981" />
            <Text className="text-gray-700 text-sm ml-2">
              {formatDate(donation.donationDate)}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Icon name="person" size={16} color="#10B981" />
            <Text className="text-gray-700 text-sm ml-2">
              {donation.isAnonymous ? 'Anonymous Donation' : donation.donorName}
            </Text>
          </View>

          {donation.message && (
            <View className="flex-row items-start">
              <Icon name="message" size={16} color="#10B981" />
              <Text
                className="text-gray-700 text-sm ml-2 flex-1"
                numberOfLines={2}>
                "{donation.message}"
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Amount & Payment Info */}
      <View className="flex-row p-4 justify-between items-center">
        <View>
          <Text className="text-gray-600 text-sm">Amount Donated</Text>
          <Text className="text-green-600 font-bold text-lg">
            ₹{donation.amount}
          </Text>
        </View>

        <View className="items-end">
          {donation.payment && (
            <View className="bg-green-100 px-3 py-1 rounded-full mb-1">
              <Text className="text-green-700 text-xs font-medium">
                Payment ID: {donation.payment.paymentId?.slice(-8)}
              </Text>
            </View>
          )}
          <Text className="text-gray-500 text-xs">
            {formatDate(donation.donationDate)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="mt-4 text-gray-600">Loading your donations...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-gray-800 text-xl font-bold">My Donations</Text>

          <TouchableOpacity onPress={onRefresh}>
            <Icon name="refresh" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>

        <Text className="text-gray-500 text-sm mt-2">
          {donations.length} donation{donations.length !== 1 ? 's' : ''} made
        </Text>
      </View>

      {/* Statistics */}
      <View className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm">
        <Text className="text-gray-800 font-bold text-lg mb-4">
          Your Impact
        </Text>

        <View className="flex-row justify-between">
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-green-600">
              {donations.length}
            </Text>
            <Text className="text-gray-600 text-sm">Total Donations</Text>
          </View>

          <View className="w-px bg-gray-200 mx-4" />

          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-green-600">
              {formatAmount(totalDonated)}
            </Text>
            <Text className="text-gray-600 text-sm">Amount Donated</Text>
          </View>
        </View>

        <View className="bg-green-50 rounded-lg p-3 mt-4">
          <Text className="text-green-800 text-sm text-center">
            Thank you for your generosity! Your donations are making a real
            difference.
          </Text>
        </View>
      </View>

      {/* Donations List */}
      <ScrollView
        className="flex-1 mt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }>
        {donations.length > 0 ? (
          <View className="pb-4">{donations.map(renderDonationCard)}</View>
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Icon name="volunteer-activism" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              No Donations Yet
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              You haven't made any donations yet. Start making a difference
              today!
            </Text>
            <TouchableOpacity
              className="bg-green-500 rounded-xl px-6 py-3 mt-6"
              onPress={() => navigation.navigate('Donations')}>
              <Text className="text-white font-bold">Browse Causes</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
