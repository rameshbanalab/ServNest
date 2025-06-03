/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import database from '@react-native-firebase/database';

export default function RegisterBusiness() {
  const navigation = useNavigation();
  const [businessName, setBusinessName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [timings, setTimings] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subCategoryModalVisible, setSubCategoryModalVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Categories and Subcategories (aligned with your DB design)
  const categories = [
    {
      id: 1,
      name: 'Plumbers',
      subCategories: [
        {id: 101, name: 'Emergency Plumbing'},
        {id: 102, name: 'Pipe Repair'},
        {id: 103, name: 'Drain Cleaning'},
        {id: 104, name: 'Water Heater'},
      ],
    },
    {
      id: 2,
      name: 'Electricians',
      subCategories: [
        {id: 201, name: 'Wiring'},
        {id: 202, name: 'Panel Upgrade'},
        {id: 203, name: 'Lighting'},
        {id: 204, name: 'Appliance Repair'},
      ],
    },
    {
      id: 3,
      name: 'Restaurants',
      subCategories: [
        {id: 301, name: 'Indian'},
        {id: 302, name: 'Chinese'},
        {id: 303, name: 'Italian'},
        {id: 304, name: 'Mexican'},
      ],
    },
    {
      id: 4,
      name: 'Doctors',
      subCategories: [
        {id: 401, name: 'General Physician'},
        {id: 402, name: 'Dentist'},
        {id: 403, name: 'Pediatrician'},
        {id: 404, name: 'Cardiologist'},
      ],
    },
  ];

  // Get subcategories based on selected categories (combine subcategories for all selected categories)
  const subCategories =
    selectedCategories.length > 0
      ? categories
          .filter(cat => selectedCategories.includes(cat.name))
          .flatMap(cat => cat.subCategories)
      : [];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    // Reset subcategories when categories change, unless they still belong to selected categories
    setSelectedSubCategories(prev =>
      prev.filter(subName => subCategories.some(sub => sub.name === subName)),
    );
  }, [selectedCategories]);

  const toggleCategory = catName => {
    setSelectedCategories(prev =>
      prev.includes(catName)
        ? prev.filter(c => c !== catName)
        : [...prev, catName],
    );
  };

  const toggleSubCategory = subName => {
    setSelectedSubCategories(prev =>
      prev.includes(subName)
        ? prev.filter(s => s !== subName)
        : [...prev, subName],
    );
  };

  const renderSelectedText = (selectedItems, placeholder) => {
    if (selectedItems.length === 0) return placeholder;
    if (selectedItems.length <= 2) return selectedItems.join(', ');
    return `${selectedItems.length} selected`;
  };

  const handleRegister = async () => {
    if (
      !businessName ||
      selectedCategories.length === 0 ||
      selectedSubCategories.length === 0 ||
      !phone ||
      !address ||
      !city ||
      !pinCode
    ) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const businessData = {
        name_of_service: businessName,
        categories: selectedCategories, // Array of selected categories
        sub_Categories: selectedSubCategories, // Array of selected subcategories
        Address: {
          street: address,
          city: city,
          pinCode: pinCode,
        },
        timings: timings || 'Not specified',
        Phone: phone,
        Whatsapp: whatsapp || 'Not specified',
        images: [], // Placeholder for future image upload feature
        lat_long: 'Not specified', // Placeholder for future geolocation feature
        URL: url || 'Not specified',
        Description: description || 'Not specified',
        createdAt: new Date().toISOString(),
      };
      // Save to Firebase Realtime Database under 'Business' node
      const newBusinessRef = database().ref('/Business').push();
      await newBusinessRef.set(businessData);
      alert('Business registered successfully!');
      navigation.goBack(); // Navigate back or to a confirmation screen
    } catch (err) {
      setError(err.message || 'Failed to register business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View className="flex-1" style={{opacity: fadeAnim}}>
        {/* Header */}
        <View className="flex-row items-center justify-between bg-primary px-5 py-5 shadow-md">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2 rounded-full bg-primary-dark shadow-sm">
            <Icon name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View className="flex-row items-center">
            <View className="bg-primary-light rounded-full p-2 mr-3">
              <Icon name="store" size={24} color="#689F38" />
            </View>
            <Text className="text-white font-bold text-xl">
              Register Your Business
            </Text>
          </View>
          <View className="w-10" /> {/* Spacer for alignment */}
        </View>

        {/* Content */}
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {/* Error Message */}
          {error ? (
            <View className="bg-red-100 rounded-lg p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : null}
          {/* Input Fields */}
          <View className="space-y-4 mb-6">
            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <Icon name="store" size={20} color="#8BC34A" className="mr-2" />
                <TextInput
                  placeholder="Business Name *"
                  placeholderTextColor="#9CA3AF" // Gray-400 for contrast
                  value={businessName}
                  onChangeText={setBusinessName}
                  className="flex-1 text-gray-800 text-base"
                />
              </View>
            </View>
            <TouchableOpacity
              className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
              onPress={() => setCategoryModalVisible(true)}>
              <View className="flex-row items-center">
                <Icon
                  name="tag-multiple"
                  size={20}
                  color="#8BC34A"
                  className="mr-3"
                />
                <Text
                  className={
                    selectedCategories.length > 0
                      ? 'flex-1 text-gray-800 text-base'
                      : 'flex-1 text-gray-400 text-base'
                  }>
                  {renderSelectedText(
                    selectedCategories,
                    'Select Categories *',
                  )}
                </Text>
                <Icon name="chevron-down" size={20} color="#8BC34A" />
              </View>
            </TouchableOpacity>
            {selectedCategories.length > 0 ? (
              <TouchableOpacity
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                onPress={() => setSubCategoryModalVisible(true)}>
                <View className="flex-row items-center">
                  <Icon
                    name="tag-outline"
                    size={20}
                    color="#8BC34A"
                    className="mr-3"
                  />
                  <Text
                    className={
                      selectedSubCategories.length > 0
                        ? 'flex-1 text-gray-800 text-base'
                        : 'flex-1 text-gray-400 text-base'
                    }>
                    {renderSelectedText(
                      selectedSubCategories,
                      'Select Subcategories *',
                    )}
                  </Text>
                  <Icon name="chevron-down" size={20} color="#8BC34A" />
                </View>
              </TouchableOpacity>
            ) : null}
            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <Icon
                  name="phone-outline"
                  size={20}
                  color="#8BC34A"
                  className="mr-2"
                />
                <TextInput
                  placeholder="Phone Number *"
                  placeholderTextColor="#9CA3AF" // Gray-400 for contrast
                  value={phone}
                  onChangeText={setPhone}
                  className="flex-1 text-gray-800 text-base"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <Icon
                  name="whatsapp"
                  size={20}
                  color="#8BC34A"
                  className="mr-2"
                />
                <TextInput
                  placeholder="WhatsApp Number (Optional)"
                  placeholderTextColor="#9CA3AF" // Gray-400 for contrast
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  className="flex-1 text-gray-800 text-base"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <Icon
                  name="map-marker-outline"
                  size={20}
                  color="#8BC34A"
                  className="mr-2"
                />
                <TextInput
                  placeholder="Street Address *"
                  placeholderTextColor="#9CA3AF" // Gray-400 for contrast
                  value={address}
                  onChangeText={setAddress}
                  className="flex-1 text-gray-800 text-base"
                />
              </View>
            </View>
            <View className="flex-row space-x-2">
              <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex-1">
                <View className="flex-row items-center">
                  <Icon
                    name="city"
                    size={20}
                    color="#8BC34A"
                    className="mr-2"
                  />
                  <TextInput
                    placeholder="City/Town *"
                    placeholderTextColor="#9CA3AF" // Gray-400 for contrast
                    value={city}
                    onChangeText={setCity}
                    className="flex-1 text-gray-800 text-base"
                  />
                </View>
              </View>
              <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm w-1/3">
                <View className="flex-row items-center">
                  <Icon
                    name="map-marker-radius"
                    size={20}
                    color="#8BC34A"
                    className="mr-2"
                  />
                  <TextInput
                    placeholder="Pin Code *"
                    placeholderTextColor="#9CA3AF" // Gray-400 for contrast
                    value={pinCode}
                    onChangeText={setPinCode}
                    className="flex-1 text-gray-800 text-base"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <Icon
                  name="clock-outline"
                  size={20}
                  color="#8BC34A"
                  className="mr-2"
                />
                <TextInput
                  placeholder="Operating Hours (e.g., 9 AM - 5 PM, Mon-Fri)"
                  placeholderTextColor="#9CA3AF" // Gray-400 for contrast
                  value={timings}
                  onChangeText={setTimings}
                  className="flex-1 text-gray-800 text-base"
                />
              </View>
            </View>
            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <Icon name="web" size={20} color="#8BC34A" className="mr-2" />
                <TextInput
                  placeholder="Website URL (Optional)"
                  placeholderTextColor="#9CA3AF" // Gray-400 for contrast
                  value={url}
                  onChangeText={setUrl}
                  className="flex-1 text-gray-800 text-base"
                  keyboardType="url"
                />
              </View>
            </View>
            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm h-24">
              <View className="flex-row items-start">
                <Icon
                  name="text-box-outline"
                  size={20}
                  color="#8BC34A"
                  className="mr-2 mt-1"
                />
                <TextInput
                  placeholder="Business Description (Optional)"
                  placeholderTextColor="#9CA3AF" // Gray-400 for contrast
                  value={description}
                  onChangeText={setDescription}
                  className="flex-1 text-gray-800 text-base"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>
          {/* Register Button */}
          <TouchableOpacity
            className="bg-primary rounded-xl p-4 shadow-md mb-6"
            onPress={handleRegister}
            disabled={loading}>
            <Text className="text-white font-bold text-lg text-center">
              {loading ? 'Registering...' : 'Register Business'}
            </Text>
          </TouchableOpacity>
          <View className="h-10" /> {/* Bottom padding for scroll */}
        </ScrollView>

        {/* Category Selection Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={categoryModalVisible}
          onRequestClose={() => setCategoryModalVisible(false)}>
          <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
            <View className="bg-white rounded-xl p-5 w-11/12 max-h-1/2 shadow-lg">
              <Text className="text-gray-800 font-bold text-xl mb-4">
                Select Categories
              </Text>
              <FlatList
                data={categories}
                keyExtractor={item => item.id.toString()}
                renderItem={({item}) => (
                  <TouchableOpacity
                    className={`p-3 rounded-lg mb-2 ${
                      selectedCategories.includes(item.name)
                        ? 'bg-primary-light'
                        : 'bg-gray-100'
                    }`}
                    onPress={() => toggleCategory(item.name)}>
                    <Text
                      className={`text-base ${
                        selectedCategories.includes(item.name)
                          ? 'text-primary-dark font-semibold'
                          : 'text-gray-800'
                      }`}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                className="bg-primary rounded-lg p-3 mt-4"
                onPress={() => setCategoryModalVisible(false)}>
                <Text className="text-white font-bold text-center">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Subcategory Selection Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={subCategoryModalVisible}
          onRequestClose={() => setSubCategoryModalVisible(false)}>
          <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
            <View className="bg-white rounded-xl p-5 w-11/12 max-h-1/2 shadow-lg">
              <Text className="text-gray-800 font-bold text-xl mb-4">
                Select Subcategories
              </Text>
              {subCategories.length > 0 ? (
                <FlatList
                  data={subCategories}
                  keyExtractor={item => item.id.toString()}
                  renderItem={({item}) => (
                    <TouchableOpacity
                      className={`p-3 rounded-lg mb-2 ${
                        selectedSubCategories.includes(item.name)
                          ? 'bg-primary-light'
                          : 'bg-gray-100'
                      }`}
                      onPress={() => toggleSubCategory(item.name)}>
                      <Text
                        className={`text-base ${
                          selectedSubCategories.includes(item.name)
                            ? 'text-primary-dark font-semibold'
                            : 'text-gray-800'
                        }`}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <Text className="text-gray-600 text-center py-4">
                  No subcategories available
                </Text>
              )}
              <TouchableOpacity
                className="bg-primary rounded-lg p-3 mt-4"
                onPress={() => setSubCategoryModalVisible(false)}>
                <Text className="text-white font-bold text-center">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
