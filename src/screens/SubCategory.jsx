import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SubcategoriesScreen = () => {
  const route = useRoute();
  const {category} = route.params || {}; // Fallback to empty object if params are undefined
  const {height} = Dimensions.get('window');
  const cardHeight = height * 0.18; // Slightly reduced for better spacing
  const navigation = useNavigation();
  const fadeAnim = React.useState(new Animated.Value(0))[0]; // Animation for fade-in effect

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

  // Trigger animation on component mount
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Fallback UI if category is undefined or not passed
  if (!category) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center p-4">
        <Text className="text-red-500 text-lg mb-4">
          Error: Category data not found
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-lg p-3 shadow-sm"
          onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold px-4 py-1">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header - Modern and Professional */}
      <View className="flex-row items-center justify-between bg-primary px-5 py-5 shadow-md">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 rounded-full bg-primary-dark shadow-sm">
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <View className="bg-primary-light rounded-full p-2 mr-3">
            <Icon
              name={category.icon || 'category'}
              size={24}
              color="#689F38"
            />
          </View>
          <Text className="text-white font-bold text-xl">
            {category.name || 'Unknown Category'}
          </Text>
        </View>
        <View className="w-10" /> {/* Spacer for alignment */}
      </View>

      {/* Subcategories Content with Animation */}
      <Animated.ScrollView
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        style={{opacity: fadeAnim}}>
        <Text className="text-gray-700 font-bold text-lg mb-4">
          Select a Subcategory
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {category.subcategories && category.subcategories.length > 0 ? (
            category.subcategories.map(sub => (
              <TouchableOpacity
                key={sub.id || `sub-${Math.random()}`} // Fallback key if id is missing
                className="w-[48%] bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100"
                style={{height: cardHeight, elevation: 2}}
                onPress={() => {
                  navigation.navigate('Services', {
                    category: category.name || 'Unknown',
                    subcategory: sub.name || 'Unnamed Subcategory',
                  });
                }}>
                <View className="flex-1 items-center justify-center">
                  <View className="bg-primary-light rounded-full p-3 mb-2 shadow-sm">
                    <Icon
                      name={subcategoryIcons[sub.name] || 'category'}
                      size={38}
                      color="#8BC34A"
                    />
                  </View>
                  <Text className="text-center text-gray-800 text-sm font-semibold">
                    {sub.name || 'Unnamed Subcategory'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View className="w-full items-center justify-center mt-10">
              <Text className="text-gray-600 text-base">
                No subcategories available for this category.
              </Text>
              <TouchableOpacity
                className="bg-primary rounded-lg p-3 mt-4 shadow-sm"
                onPress={() => navigation.goBack()}>
                <Text className="text-white font-bold px-4 py-1">
                  Back to Categories
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Extra padding at the bottom for better scrolling */}
        <View className="h-10" />
      </Animated.ScrollView>
    </View>
  );
};

export default SubcategoriesScreen;
