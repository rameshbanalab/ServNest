import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SubcategoriesScreen = () => {
  const route = useRoute();
  const {category} = route.params || {}; // Fallback to empty object if params are undefined
  const {height} = Dimensions.get('window');
  const cardHeight = height * 0.2;
  const navigation = useNavigation();

  // Icon mapping for subcategories
  const subcategoryIcons = {
    'Emergency Plumbing': 'plumbing',
    'Pipe Repair': 'build',
    'Drain Cleaning': 'water-damage',
    Wiring: 'electrical-services',
    'Panel Upgrade': 'power',
    Lighting: 'lightbulb',
    Indian: 'restaurant',
    Chinese: 'ramen-dining',
    Italian: 'dinner-dining',
    'General Physician': 'medical-services',
    Dentist: 'dentistry',
    Pediatrician: 'child-friendly',
  };

  // Fallback UI if category is undefined or not passed
  if (!category) {
    return (
      <View className="flex-1 bg-gray-100 justify-center items-center p-4">
        <Text className="text-red-500 text-lg mb-4">
          Error: Category data not found
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-lg p-3"
          onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-100 p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between bg-primary px-5 py-4 shadow-md mb-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 rounded-full bg-primary-dark">
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Icon name={category.icon || 'category'} size={28} color="#fff" />
          <Text className="ml-3 text-xl font-bold text-white">
            {category.name || 'Unknown Category'}
          </Text>
        </View>
        <View className="w-10" /> {/* Spacer for alignment */}
      </View>

      {/* Subcategories Grid (2 per row, 1/3 screen height each) */}
      <View className="flex-row flex-wrap justify-between">
        {category.subcategories && category.subcategories.length > 0 ? (
          category.subcategories.map(sub => (
            <TouchableOpacity
              key={sub.id || `sub-${Math.random()}`} // Fallback key if id is missing
              className="w-[48%] bg-white rounded-xl p-3 mb-4 shadow-sm"
              style={{height: cardHeight, elevation: 2}}
              onPress={() => {
                // Navigate to services for this subcategory
                navigation.navigate('Services', {
                  category: category.name || 'Unknown',
                  subcategory: sub.name || 'Unnamed Subcategory',
                });
              }}>
              <View className="flex-1 items-center justify-center">
                <View className="bg-primary-light p-3 rounded-full mb-2">
                  <Icon
                    name={subcategoryIcons[sub.name] || 'category'}
                    size={44}
                    color="#8BC34A"
                  />
                </View>
                <Text className="text-center text-gray-800 text-sm font-medium">
                  {sub.name || 'Unnamed Subcategory'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text className="text-gray-600 text-center mt-10 w-full">
            No subcategories available for this category.
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

export default SubcategoriesScreen;
