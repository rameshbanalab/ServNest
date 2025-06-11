/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {db} from '../../config/firebaseConfig';
import {collection, getDocs, query, where, orderBy} from 'firebase/firestore';

const AdminDonationDetails = ({route, navigation}) => {
  const {id, name, count, description, totalAmount} = route.params;
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [calculatedCount, setCalculatedCount] = useState(0);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    loadDonations();
  }, []);

  function formatTimeFromNanoseconds(seconds, nanoseconds) {
    const totalMilliseconds = seconds * 1000 + nanoseconds / 1e6;
    const date = new Date(totalMilliseconds);

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const day = String(date.getDate()).padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;

    return {date: formattedDate, time: formattedTime};
  }

  // ✅ FIXED: Load donations with accurate counting
  const loadDonations = async () => {
    setLoading(true);
    try {
      const paymentsRef = collection(db, 'DonationPayments');
      const q = query(
        paymentsRef,
        where('donationCauseId', '==', id),
        orderBy('donationDate', 'desc'),
      );
      const querySnapshot = await getDocs(q);

      let paymentData = [];
      let total = 0;
      let confirmedCount = 0; // ✅ Only count confirmed donations

      querySnapshot.forEach(doc => {
        const data = doc.data();
        let paymentDate = '';
        let paymentTime = '';

        if (data.donationDate) {
          const dateObj = formatTimeFromNanoseconds(
            data.donationDate.seconds,
            data.donationDate.nanoseconds,
          );
          paymentDate = dateObj.date;
          paymentTime = dateObj.time;
        }

        const paymentItem = {
          id: doc.id,
          donorName: data.isAnonymous ? 'Anonymous' : data.donorName,
          email: data.donorEmail || 'N/A',
          amount: data.amount || 0,
          paymentDate: paymentDate,
          paymentTime: paymentTime,
          paymentId: data.payment?.paymentId || 'N/A',
          isAnonymous: data.isAnonymous || false,
          message: data.message || '',
          status: data.status || 'confirmed',
        };

        paymentData.push(paymentItem);

        // ✅ FIXED: Only count confirmed donations in totals
        if (data.status === 'confirmed') {
          total += data.amount || 0;
          confirmedCount++;
        }
      });

      setPayments(paymentData);
      setCalculatedTotal(total); // ✅ Use calculated total
      setCalculatedCount(confirmedCount); // ✅ Use calculated count
      setLoading(false);
    } catch (error) {
      console.error('Error fetching donation payments:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDonations();
    setRefreshing(false);
  };

  const formatAmount = amount => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  const renderDonationCard = ({item}) => (
    <TouchableOpacity
      className="bg-white mx-4 mb-3 rounded-xl shadow-sm border border-gray-100"
      activeOpacity={0.8}>
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center mb-1">
              <Text className="text-gray-800 font-semibold text-base">
                {item.donorName}
              </Text>
              {item.isAnonymous && (
                <View className="bg-blue-100 px-2 py-1 rounded-full ml-2">
                  <Text className="text-blue-700 text-xs font-medium">
                    Anonymous
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-gray-600 text-sm">{item.email}</Text>
            <Text className="text-gray-500 text-xs mt-1">
              {item.paymentDate} at {item.paymentTime}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-green-600 font-bold text-lg">
              ₹{item.amount.toLocaleString('en-IN')}
            </Text>
            <View
              className={`px-2 py-1 rounded-full mt-1 ${
                item.status === 'confirmed'
                  ? 'bg-green-100'
                  : item.status === 'pending'
                  ? 'bg-yellow-100'
                  : 'bg-red-100'
              }`}>
              <Text
                className={`text-xs font-medium ${
                  item.status === 'confirmed'
                    ? 'text-green-700'
                    : item.status === 'pending'
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        {item.message && (
          <View className="bg-blue-50 rounded-lg p-3 mt-2">
            <Text className="text-blue-800 text-sm italic">
              "{item.message}"
            </Text>
          </View>
        )}

        <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <Text className="text-gray-500 text-xs">ID: {item.paymentId}</Text>
          <TouchableOpacity className="bg-primary/10 px-3 py-1 rounded-full">
            <Text className="text-primary text-xs font-medium">
              View Details
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            className="mr-4 p-2 -ml-2"
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-gray-800 text-xl font-bold">{name}</Text>
            <Text className="text-gray-600 text-sm">{description}</Text>
          </View>
        </View>
      </View>

      {/* ✅ FIXED: Statistics using calculated values */}
      <View className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
        <Text className="text-gray-800 font-bold text-lg mb-4">Statistics</Text>
        <View className="flex-row justify-between">
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-primary">
              {calculatedCount}
            </Text>
            <Text className="text-gray-600 text-sm">Confirmed Donations</Text>
          </View>
          <View className="w-px bg-gray-200 mx-4" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-green-600">
              {formatAmount(calculatedTotal)}
            </Text>
            <Text className="text-gray-600 text-sm">Total Amount</Text>
          </View>
          <View className="w-px bg-gray-200 mx-4" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-blue-600">
              ₹
              {calculatedCount > 0
                ? Math.round(calculatedTotal / calculatedCount)
                : 0}
            </Text>
            <Text className="text-gray-600 text-sm">Avg Donation</Text>
          </View>
        </View>

        {/* ✅ ADDED: Additional statistics */}
        <View className="flex-row justify-between mt-4 pt-4 border-t border-gray-100">
          <View className="items-center flex-1">
            <Text className="text-lg font-bold text-orange-600">
              {payments.length}
            </Text>
            <Text className="text-gray-600 text-xs">Total Transactions</Text>
          </View>
          <View className="w-px bg-gray-200 mx-2" />
          <View className="items-center flex-1">
            <Text className="text-lg font-bold text-purple-600">
              {payments.filter(p => p.status === 'pending').length}
            </Text>
            <Text className="text-gray-600 text-xs">Pending</Text>
          </View>
          <View className="w-px bg-gray-200 mx-2" />
          <View className="items-center flex-1">
            <Text className="text-lg font-bold text-red-600">
              {payments.filter(p => p.status === 'failed').length}
            </Text>
            <Text className="text-gray-600 text-xs">Failed</Text>
          </View>
        </View>
      </View>

      {/* Section Title */}
      <View className="flex-row justify-between items-center px-4 mt-6 mb-4">
        <Text className="text-gray-700 font-bold text-lg">
          All Transactions
        </Text>
        <Text className="text-gray-500 text-sm">{payments.length} total</Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View className="bg-white rounded-lg p-6 items-center mx-4 mt-4">
      <Icon name="volunteer-activism" size={48} color="#D1D5DB" />
      <Text className="text-gray-500 text-center mt-2">No donations found</Text>
      <Text className="text-gray-400 text-center mt-1">
        Donations for this cause will appear here
      </Text>
    </View>
  );

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
      <FlatList
        data={payments}
        renderItem={renderDonationCard}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8BC34A']}
            tintColor="#8BC34A"
          />
        }
        contentContainerStyle={{paddingBottom: 20}}
      />
    </SafeAreaView>
  );
};

export default AdminDonationDetails;
