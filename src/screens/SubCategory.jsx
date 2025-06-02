import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SubcategoriesScreen = () => {
  const route = useRoute();
  const { category } = route.params;
  const { height } = Dimensions.get('window');
  const cardHeight = height * 0.20;
    const navigation=useNavigation();
  // Icon mapping (add your own icons as needed)
  const subcategoryIcons = {
    'Emergency Plumbing': 'plumbing',
    'Pipe Repair': 'build',
    'Drain Cleaning': 'water-damage',
    'Wiring': 'electrical-services',
    'Panel Upgrade': 'power',
    'Lighting': 'lightbulb',
    'Indian': 'restaurant',
    'Chinese': 'ramen-dining',
    'Italian': 'dinner-dining',
    'General Physician': 'medical-services',
    'Dentist': 'dentistry',
    'Pediatrician': 'child-friendly'
  };

  return (
    <ScrollView className="flex-1 bg-gray-100 p-4">
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <Icon name={category.icon} size={28} color="#4A90E2" />
        <Text className="ml-3 text-2xl font-bold text-gray-900">{category.name}</Text>
      </View>

      {/* Subcategories Grid (2 per row, 1/3 screen height each) */}
      <View className="flex-row flex-wrap justify-between">
        {category.subcategories.map((sub, index) => (
          <TouchableOpacity
            key={sub.id}
            className="w-[48%] bg-white rounded-xl p-3 mb-4 shadow-sm"
            style={{ height: cardHeight, elevation: 2 }}
            onPress={() => {
              // Navigate to services for this subcategory
              navigation.navigate('Services', { category:category.name,subcategory: sub.name });
            }}
          >
            <View className="flex-1 items-center justify-center">
              <View className="bg-blue-50 p-3 rounded-full mb-2">
                <Icon
                  name={subcategoryIcons[sub.name] || 'category'}
                  size={44}
                  color="#4A90E2"
                />
              </View>
              <Text className="text-center text-gray-800 text-sm font-medium">
                {sub.name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

export default SubcategoriesScreen;
