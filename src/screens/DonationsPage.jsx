import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { db } from "../config/firebaseConfig";

const DonationsPage = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, "Donations"));
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDonations(list);
    } catch (error) {
      console.error("Error fetching donations:", error);
      Alert.alert("Error", `Failed to fetch donations: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDonation = (donation) => {
    Alert.alert(
      "Donate",
      `You are about to donate to: ${donation.title}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Proceed", onPress: () => console.log("Donating to:", donation.id) }
      ]
    );
  };

  useEffect(() => {
    fetchDonations();
  }, []);
  const renderDonationCard = (donation) => (
    <View key={donation.id} className="bg-white mx-4 mb-4 rounded-xl shadow-md">
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-800 flex-1 mr-4">
            {donation.title}
          </Text>
          <TouchableOpacity
            onPress={() => handleDonation(donation)}
            className="bg-green-500 px-4 py-2 rounded-lg"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">Donate</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-gray-600 text-base leading-5">
          {donation.description}
        </Text>
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
        <Text className="text-2xl font-bold text-gray-800">Make a Donation</Text>
        <Text className="text-gray-600 mt-1">Support causes that matter to you</Text>
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16 }}
      >
        {donations.length > 0 ? (
          donations.map(renderDonationCard)
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-gray-500 text-lg">No donations available</Text>
            <Text className="text-gray-400 mt-2">Check back later</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DonationsPage;