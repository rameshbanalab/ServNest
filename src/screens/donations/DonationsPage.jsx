/* eslint-disable react-native/no-inline-styles */
import {collection, getDocs} from 'firebase/firestore';
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {db} from '../../config/firebaseConfig';

const DonationsPage = () => {
  const navigation = useNavigation();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'Donations'));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDonations(list);
    } catch (error) {
      console.error('Error fetching donations:', error);
      Alert.alert('Error', `Failed to fetch donations: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Navigate to donation booking screen
  const handleDonation = donation => {
    navigation.navigate('DonationBooking', {donation});
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const renderDonationCard = donation => (
    <View key={donation.id} className="bg-white mx-4 mb-4 rounded-xl shadow-md">
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-800 flex-1 mr-4">
            {donation.title}
          </Text>
          <TouchableOpacity
            onPress={() => handleDonation(donation)}
            className="bg-green-500 px-4 py-2 rounded-lg flex-row items-center"
            activeOpacity={0.8}>
            <Icon name="favorite" size={16} color="#FFFFFF" />
            <Text className="text-white font-semibold ml-1">Donate</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-gray-600 text-base leading-5 mb-3">
          {donation.description}
        </Text>

        {/* ✅ ADDED: Donation stats */}
        <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Icon name="people" size={16} color="#10B981" />
            <Text className="text-gray-600 text-sm ml-1">
              {donation.totalDonations || 0} donors
            </Text>
          </View>
          <View className="flex-row items-center">
            <Icon name="currency-rupee" size={16} color="#10B981" />
            <Text className="text-green-600 font-semibold">
              ₹{donation.totalAmount || 0} raised
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="mt-4 text-gray-600">Loading donations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-6 py-4 shadow-sm">
        <Text className="text-2xl font-bold text-gray-800">
          Make a Donation
        </Text>
        <Text className="text-gray-600 mt-1">
          Support causes that matter to you
        </Text>
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingVertical: 16}}>
        {donations.length > 0 ? (
          donations.map(renderDonationCard)
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Icon name="volunteer-activism" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg">
              No donations available
            </Text>
            <Text className="text-gray-400 mt-2">Check back later</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DonationsPage;
