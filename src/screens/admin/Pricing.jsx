import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { db } from '../../config/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AdminPricingScreen = ({ navigation }) => {
  const [currentPrice, setCurrentPrice] = useState(0);
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchCurrentPrice();
    fetchPriceHistory();
  }, []);

  const fetchCurrentPrice = async () => {
    try {
      const docRef = doc(db, 'settings', 'businessRegistration');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentPrice(data.price || 0);
        setNewPrice((data.price || 0).toString());
      } else {
        // Create default document if it doesn't exist
        await setDoc(docRef, {
          price: 499,
          currency: 'INR',
          lastUpdated: new Date(),
          updatedBy: 'admin'
        });
        setCurrentPrice(499);
        setNewPrice('499');
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      Alert.alert('Error', 'Failed to fetch current price');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async () => {
    try {
      setHistoryLoading(true);
      const docRef = doc(db, 'settings', 'priceHistory');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setPriceHistory(docSnap.data().history || []);
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCurrentPrice(),
        fetchPriceHistory()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const updatePrice = async () => {
    const price = parseInt(newPrice);
    
    if (!price || price < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price amount');
      return;
    }

    if (price === currentPrice) {
      Alert.alert('No Change', 'The new price is the same as current price');
      return;
    }

    Alert.alert(
      'Confirm Price Update',
      `Are you sure you want to change the business registration price from ₹${currentPrice} to ₹${price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setSaving(true);
            try {
              // Update current price
              await updateDoc(doc(db, 'settings', 'businessRegistration'), {
                price: price,
                lastUpdated: new Date(),
                updatedBy: 'admin'
              });

              // Add to price history
              const historyEntry = {
                oldPrice: currentPrice,
                newPrice: price,
                updatedAt: new Date(),
                updatedBy: 'admin'
              };

              const historyRef = doc(db, 'settings', 'priceHistory');
              const historySnap = await getDoc(historyRef);
              
              if (historySnap.exists()) {
                const existingHistory = historySnap.data().history || [];
                await updateDoc(historyRef, {
                  history: [historyEntry, ...existingHistory.slice(0, 9)] // Keep last 10 entries
                });
              } else {
                await setDoc(historyRef, {
                  history: [historyEntry]
                });
              }

              setCurrentPrice(price);
              setPriceHistory(prev => [historyEntry, ...prev.slice(0, 9)]);
              Alert.alert('Success', 'Business registration price updated successfully');
            } catch (error) {
              console.error('Error updating price:', error);
              Alert.alert('Error', 'Failed to update price. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="mt-4 text-gray-600">Loading pricing settings...</Text>
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
        <Text className="text-white font-bold text-lg ml-4">Business Registration Pricing</Text>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8BC34A']}
            tintColor="#8BC34A"
            title="Pull to refresh"
            titleColor="#8BC34A"
          />
        }
      >
        <View className="p-4">
          {/* Current Price Display */}
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
            <View className="flex-row items-center mb-4">
              <View className="bg-green-100 rounded-full p-3 mr-4">
                <Icon name="currency-inr" size={28} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-600 text-sm">Current Registration Price</Text>
                <Text className="text-3xl font-bold text-gray-800">₹{currentPrice}</Text>
              </View>
            </View>
            <View className="bg-gray-50 rounded-lg p-3">
              <Text className="text-gray-600 text-sm">
                This is the amount businesses pay to register on your platform
              </Text>
            </View>
          </View>

          {/* Update Price Form */}
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
            <View className="flex-row items-center mb-6">
              <View className="bg-blue-100 rounded-full p-3 mr-4">
                <Icon name="pencil" size={24} color="#2563EB" />
              </View>
              <Text className="text-xl font-bold text-gray-800">Update Registration Price</Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">New Price (₹)</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                <View className="px-4 py-3 border-r border-gray-200">
                  <Icon name="currency-inr" size={20} color="#6B7280" />
                </View>
                <TextInput
                  className="flex-1 px-4 py-3 text-gray-800 text-lg"
                  placeholder="Enter new price"
                  value={newPrice}
                  onChangeText={setNewPrice}
                  keyboardType="numeric"
                  style={{ fontSize: 18 }}
                  editable={!saving}
                />
              </View>
            </View>

            <TouchableOpacity
              className={`px-8 py-4 rounded-xl items-center shadow-md ${saving ? 'bg-green-300' : 'bg-primary'}`}
              onPress={updatePrice}
              disabled={saving}
              style={{ elevation: 3 }}
            >
              <View className="flex-row items-center">
                {saving && (
                  <ActivityIndicator size="small" color="white" className="mr-2" />
                )}
                <Text className="text-white font-bold text-lg">
                  {saving ? 'Updating...' : 'Update Price'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Price Impact Information */}
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
            <View className="flex-row items-center mb-4">
              <View className="bg-yellow-100 rounded-full p-3 mr-4">
                <Icon name="information" size={24} color="#D97706" />
              </View>
              <Text className="text-xl font-bold text-gray-800">Price Impact</Text>
            </View>
            
            <View className="space-y-3">
              <View className="flex-row items-center mb-3">
                <Icon name="check-circle" size={20} color="#059669" className="mr-3" />
                <Text className="text-gray-700 flex-1">
                  New businesses will pay the updated price immediately
                </Text>
              </View>
              <View className="flex-row items-center mb-3">
                <Icon name="clock" size={20} color="#D97706" className="mr-3" />
                <Text className="text-gray-700 flex-1">
                  Changes take effect immediately after confirmation
                </Text>
              </View>
              <View className="flex-row items-center">
                <Icon name="shield-check" size={20} color="#2563EB" className="mr-3" />
                <Text className="text-gray-700 flex-1">
                  All price changes are logged for audit purposes
                </Text>
              </View>
            </View>
          </View>

          {/* Price History */}
          <View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <View className="flex-row items-center mb-4">
              <View className="bg-purple-100 rounded-full p-3 mr-4">
                <Icon name="history" size={24} color="#7C3AED" />
              </View>
              <Text className="text-xl font-bold text-gray-800">Recent Price Changes</Text>
            </View>
            
            {historyLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="small" color="#8BC34A" />
                <Text className="mt-2 text-gray-500">Loading price history...</Text>
              </View>
            ) : priceHistory.length > 0 ? (
              <View className="space-y-3">
                {priceHistory.slice(0, 5).map((entry, index) => (
                  <View key={index} className="bg-gray-50 rounded-lg p-4">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-gray-800 font-medium">
                        ₹{entry.oldPrice} → ₹{entry.newPrice}
                      </Text>
                      <View className={`px-2 py-1 rounded-full ${
                        entry.newPrice > entry.oldPrice ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        <Text className={`text-xs font-medium ${
                          entry.newPrice > entry.oldPrice ? 'text-red-700' : 'text-green-700'
                        }`}>
                          {entry.newPrice > entry.oldPrice ? 'Increased' : 'Decreased'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-gray-500 text-sm">
                      {formatDate(entry.updatedAt)} by {entry.updatedBy}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center py-8">
                <Icon name="history" size={48} color="#9CA3AF" />
                <Text className="text-gray-500 text-lg mt-4">No price changes yet</Text>
                <Text className="text-gray-400 text-sm mt-2">Price change history will appear here</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AdminPricingScreen;
