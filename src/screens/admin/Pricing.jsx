import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const AdminPricingScreen = () => {
  const [price, setPrice] = useState('');

  useEffect(() => {
    const fetchPrice = async () => {
      const docRef = doc(db, 'settings', 'registration');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPrice(docSnap.data().price.toString());
      }
    };
    fetchPrice();
  }, []);

  const updatePrice = async () => {
    try {
      await updateDoc(doc(db, 'settings', 'registration'), {
        price: parseInt(price)
      });
      alert('Price updated successfully!');
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  return (
    <View className="flex-1 bg-gray-100 p-4">
      <Text className="text-xl font-bold mb-4">Registration Price</Text>
      <TextInput
        className="bg-white p-2 rounded border border-gray-300 mb-4"
        placeholder="Enter price in INR"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />
      <TouchableOpacity
        className="bg-blue-500 p-2 rounded items-center"
        onPress={updatePrice}>
        <Text className="text-white">Update Price</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AdminPricingScreen;
