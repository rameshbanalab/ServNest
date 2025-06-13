/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable curly */
/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import auth from '@react-native-firebase/auth'; // React Native Firebase for Auth
import {db} from '../config/firebaseConfig'; // Firebase Web SDK for Firestore
import {collection, getDocs, doc, updateDoc} from 'firebase/firestore';

export default function EditBusiness() {
  const navigation = useNavigation();
  const route = useRoute();
  const {businessData} = route.params || {};

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  // Store selected category *names* as per businessData structure
  const [selectedCategoryNames, setSelectedCategoryNames] = useState([]);
  const [selectedSubCategoryNames, setSelectedSubCategoryNames] = useState([]);
  const [businessImages, setBusinessImages] = useState([]);

  // UI states
  const [loading, setLoading] = useState(false); // For form submission
  const [dataLoading, setDataLoading] = useState(true); // For initial data fetch
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Master lists of categories/subcategories (objects with all schema fields)
  const [masterCategories, setMasterCategories] = useState([]);
  const [masterSubCategories, setMasterSubCategories] = useState([]);

  const [filteredSubCategoriesForModal, setFilteredSubCategoriesForModal] =
    useState([]);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subCategoryModalVisible, setSubCategoryModalVisible] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [currentTimeField, setCurrentTimeField] = useState(null);

  // Weekly schedule state
  const [weeklyHours, setWeeklyHours] = useState({
    Monday: {
      isOpen: true,
      openTime: new Date(2024, 0, 1, 9, 0, 0),
      closeTime: new Date(2024, 0, 1, 18, 0, 0),
    },
    Tuesday: {
      isOpen: true,
      openTime: new Date(2024, 0, 1, 9, 0, 0),
      closeTime: new Date(2024, 0, 1, 18, 0, 0),
    },
    Wednesday: {
      isOpen: true,
      openTime: new Date(2024, 0, 1, 9, 0, 0),
      closeTime: new Date(2024, 0, 1, 18, 0, 0),
    },
    Thursday: {
      isOpen: true,
      openTime: new Date(2024, 0, 1, 9, 0, 0),
      closeTime: new Date(2024, 0, 1, 18, 0, 0),
    },
    Friday: {
      isOpen: true,
      openTime: new Date(2024, 0, 1, 9, 0, 0),
      closeTime: new Date(2024, 0, 1, 18, 0, 0),
    },
    Saturday: {
      isOpen: true,
      openTime: new Date(2024, 0, 1, 9, 0, 0),
      closeTime: new Date(2024, 0, 1, 18, 0, 0),
    },
    Sunday: {
      isOpen: false,
      openTime: new Date(2024, 0, 1, 9, 0, 0),
      closeTime: new Date(2024, 0, 1, 18, 0, 0),
    },
  });

  // Fetch master categories and subcategories once on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      setDataLoading(true);
      try {
        const categoriesSnapshot = await getDocs(collection(db, 'Categories'));
        const categoriesData = categoriesSnapshot.docs.map(d => ({
          id: d.id, // ✅ Firebase auto-generated ID
          name: d.data().category_name, // ✅ NEW FIELD NAME
          image: d.data().image,
        }));
        setMasterCategories(categoriesData);

        const subCategoriesSnapshot = await getDocs(
          collection(db, 'SubCategories'),
        );
        const subCategoriesData = subCategoriesSnapshot.docs.map(d => ({
          id: d.id, // ✅ Firebase auto-generated ID
          name: d.data().sub_category_name, // ✅ NEW FIELD NAME
          parentCategoryId: d.data().category_id, // ✅ Links to parent category's auto-generated ID
          icon: d.data().icon,
          image: d.data().image,
        }));
        setMasterSubCategories(subCategoriesData);
      } catch (err) {
        console.error('Error fetching master data:', err);
        setError('Failed to load category data. Please try again.');
      } finally {
        setDataLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  // Populate form when businessData and master lists are ready
  useEffect(() => {
    if (
      businessData &&
      masterCategories.length > 0 &&
      masterSubCategories.length > 0 &&
      !dataLoading
    ) {
      populateFormData();
    }
  }, [businessData, masterCategories, masterSubCategories, dataLoading]);

  // Effect to manage subcategories available for selection in the modal,
  // and also to clean up selectedSubCategoryNames if their parent category is deselected.
  useEffect(() => {
    if (masterSubCategories.length === 0) {
      setFilteredSubCategoriesForModal([]);
      return;
    }

    // ✅ FIXED: Get Firebase document IDs of currently selected categories
    const selectedParentCategoryIds = selectedCategoryNames
      .map(name => {
        const cat = masterCategories.find(c => c.name === name);
        return cat ? cat.id : null; // ✅ Use Firebase document ID
      })
      .filter(id => id !== null);

    if (selectedParentCategoryIds.length > 0) {
      const relevantSubcategories = masterSubCategories.filter(sub =>
        selectedParentCategoryIds.includes(sub.parentCategoryId),
      );
      setFilteredSubCategoriesForModal(relevantSubcategories);

      // ✅ FIXED: Clean up selectedSubCategoryNames using correct ID mapping
      setSelectedSubCategoryNames(prevSelectedSubNames =>
        prevSelectedSubNames.filter(subName => {
          const subDetail = masterSubCategories.find(s => s.name === subName);
          return (
            subDetail &&
            selectedParentCategoryIds.includes(subDetail.parentCategoryId)
          );
        }),
      );
    } else {
      setFilteredSubCategoriesForModal([]);
      setSelectedSubCategoryNames([]); // No categories selected, so no subcategories selected
    }
  }, [selectedCategoryNames, masterCategories, masterSubCategories]);

  const populateFormData = () => {
    setBusinessName(businessData.businessName || '');
    setOwnerName(businessData.ownerName || '');
    setContactNumber(businessData.contactNumber || '');
    setEmail(businessData.email || '');
    setStreetAddress(businessData.address?.street || '');
    setCity(businessData.address?.city || '');
    setPinCode(businessData.address?.pinCode || '');

    const initialCategoryNames = businessData.categories || [];
    const initialSubCategoryNames = businessData.subCategories || [];

    setSelectedCategoryNames([...initialCategoryNames]);

    // ✅ FIXED: Initial subcategories must be valid based on initially selected categories
    const selectedParentCategoryIds = initialCategoryNames
      .map(name => {
        const cat = masterCategories.find(c => c.name === name);
        return cat ? cat.id : null; // ✅ Use Firebase document ID
      })
      .filter(id => id !== null);

    const validInitialSubCategoryNames = initialSubCategoryNames.filter(
      subName => {
        const subDetail = masterSubCategories.find(s => s.name === subName);
        return (
          subDetail &&
          selectedParentCategoryIds.includes(subDetail.parentCategoryId)
        );
      },
    );
    setSelectedSubCategoryNames([...validInitialSubCategoryNames]);

    setBusinessImages(businessData.images || []);

    // ✅ Time parsing logic remains the same
    if (businessData.weeklySchedule) {
      const schedule = {};
      Object.keys(businessData.weeklySchedule).forEach(day => {
        const dayData = businessData.weeklySchedule[day];
        const defaultOpen = new Date(2024, 0, 1, 9, 0, 0);
        const defaultClose = new Date(2024, 0, 1, 18, 0, 0);

        const parseTime = timeInput => {
          if (!timeInput) return null;
          if (timeInput instanceof Date) return timeInput;
          if (typeof timeInput === 'string') return new Date(timeInput);
          if (timeInput.seconds) return new Date(timeInput.seconds * 1000);
          return null;
        };

        schedule[day] = {
          isOpen: dayData.isOpen !== undefined ? dayData.isOpen : true,
          openTime: parseTime(dayData.openTime) || defaultOpen,
          closeTime: parseTime(dayData.closeTime) || defaultClose,
        };
      });
      setWeeklyHours(schedule);
    }
  };

  const handleCategorySelection = useCallback(categoryName => {
    setSelectedCategoryNames(prevSelectedNames => {
      if (prevSelectedNames.includes(categoryName)) {
        return prevSelectedNames.filter(name => name !== categoryName);
      } else {
        return [...prevSelectedNames, categoryName];
      }
    });
  }, []);

  const handleSubCategorySelection = useCallback(subCategoryName => {
    setSelectedSubCategoryNames(prevSelectedNames => {
      if (prevSelectedNames.includes(subCategoryName)) {
        return prevSelectedNames.filter(name => name !== subCategoryName);
      } else {
        return [...prevSelectedNames, subCategoryName];
      }
    });
  }, []);

  // ... (handleImagePicker, removeImage, handleTimeChange, toggleDayStatus, handleUpdateBusiness remain the same) ...
  // Ensure handleUpdateBusiness saves selectedCategoryNames and selectedSubCategoryNames

  const handleImagePicker = type => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8,
    };

    const callback = response => {
      if (response.didCancel || response.error) return;

      if (response.assets && response.assets[0]) {
        const newImage = {
          id: Date.now().toString(),
          fileName: response.assets[0].fileName || 'image.jpg',
          base64: response.assets[0].base64,
          fileSize: response.assets[0].fileSize,
          type: response.assets[0].type,
        };
        setBusinessImages(prev => [...prev, newImage]);
      }
      setImagePickerVisible(false);
    };

    if (type === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  const removeImage = imageId => {
    setBusinessImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleTimeChange = selectedTime => {
    if (currentTimeField && selectedTime) {
      const [day, timeType] = currentTimeField.split('-');
      const newTime = new Date(selectedTime);

      setWeeklyHours(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [timeType]: newTime,
        },
      }));
    }
    setTimePickerVisible(false);
    setCurrentTimeField(null);
  };

  const toggleDayStatus = day => {
    setWeeklyHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen,
      },
    }));
  };

  const handleUpdateBusiness = async () => {
    if (
      !businessName ||
      !ownerName ||
      !contactNumber ||
      !email ||
      !city ||
      !pinCode
    ) {
      setError('Please fill in all required fields');
      return;
    }

    if (selectedCategoryNames.length === 0) {
      setError('Please select at least one category');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = auth().currentUser;
      if (!user) {
        Alert.alert('Error', 'Please login to update business');
        setLoading(false);
        return;
      }

      // ✅ FIXED: Process weekly hours with ISO string storage
      const processedWeeklyHours = {};
      Object.keys(weeklyHours).forEach(day => {
        const dayData = weeklyHours[day];
        processedWeeklyHours[day] = {
          isOpen: dayData.isOpen,
          openTime: dayData.openTime.toISOString(), // ✅ Store as ISO string
          closeTime: dayData.closeTime.toISOString(), // ✅ Store as ISO string
        };
      });

      const updatedBusinessData = {
        businessName,
        ownerName,
        contactNumber,
        email,
        categories: selectedCategoryNames, // ✅ Save array of names
        subCategories: selectedSubCategoryNames, // ✅ Save array of names
        address: {
          street: streetAddress,
          city,
          pinCode,
        },
        weeklySchedule: processedWeeklyHours,
        images: businessImages,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(
        doc(db, 'Businesses', businessData.id),
        updatedBusinessData,
      );

      setSuccess('Business updated successfully!');
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to update business. Please try again.');
      console.error('Error updating business:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryItem = useCallback(
    ({item}) => {
      // item is from masterCategories, e.g., { id: 'docId', name: 'Plumbers', category_id: 1, ... }
      const isSelected = selectedCategoryNames.includes(item.name);
      return (
        <TouchableOpacity
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
            backgroundColor: isSelected ? '#E8F5E9' : '#FFFFFF',
          }}
          onPress={() => handleCategorySelection(item.name)}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 2,
                  marginRight: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? '#FF4500' : 'transparent',
                  borderColor: isSelected ? '#FF4500' : '#D1D5DB',
                }}>
                {isSelected && <Icon name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text
                style={{
                  fontWeight: '500',
                  color: isSelected ? '#2E7D32' : '#374151',
                  fontSize: 16,
                }}>
                {item.name}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [selectedCategoryNames, handleCategorySelection],
  );

  const renderSubCategoryItem = useCallback(
    ({item}) => {
      // item is from filteredSubCategoriesForModal, e.g., { id: 'docId', name: 'Pipe Repair', sub_category_id: 101, parentCategoryId: 1, ... }
      const isSelected = selectedSubCategoryNames.includes(item.name);
      return (
        <TouchableOpacity
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
            backgroundColor: isSelected ? '#E8F5E9' : '#FFFFFF',
          }}
          onPress={() => handleSubCategorySelection(item.name)}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 2,
                  marginRight: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? '#FF4500' : 'transparent',
                  borderColor: isSelected ? '#FF4500' : '#D1D5DB',
                }}>
                {isSelected && <Icon name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text
                style={{
                  fontWeight: '500',
                  color: isSelected ? '#2E7D32' : '#374151',
                  fontSize: 16,
                }}>
                {item.name}
              </Text>
            </View>
            {/* Optional: Display parent category name if needed */}
            {/* <Text style={{color: '#9CA3AF', fontSize: 12}}>
            {masterCategories.find(cat => cat.category_id === item.parentCategoryId)?.name}
          </Text> */}
          </View>
        </TouchableOpacity>
      );
    },
    [selectedSubCategoryNames, handleSubCategorySelection, masterCategories],
  );

  if (dataLoading && !businessData) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF4500" />
        <Text className="text-gray-700 text-base mt-4 font-medium">
          Loading business data...
        </Text>
      </View>
    );
  }

  if (!businessData) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-red-500 text-lg mb-4">
          Error: Business data not found or failed to load.
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-xl px-6 py-3"
          onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#FF4500" />
      <SafeAreaView className="flex-1 bg-gray-50">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Header */}
          <View className="bg-primary px-6 py-4 shadow-xl">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="p-3 rounded-full bg-primary-dark shadow-lg">
                <Icon name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text className="text-white font-bold text-xl">
                Edit Business
              </Text>
              <View className="w-12" />
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 py-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 50}}>
            {/* Success Message */}
            {success ? (
              <View className="bg-green-50 border-l-4 border-green-400 rounded-r-xl p-4 mb-6 flex-row items-center">
                <Icon name="check-circle" size={20} color="#16A34A" />
                <Text className="ml-3 text-green-700 font-medium text-sm flex-1">
                  {success}
                </Text>
              </View>
            ) : null}

            {/* Error Message */}
            {error ? (
              <View className="bg-red-50 border-l-4 border-red-400 rounded-r-xl p-4 mb-6 flex-row items-center">
                <Icon name="error" size={20} color="#DC2626" />
                <Text className="ml-3 text-red-700 font-medium text-sm flex-1">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Business Information */}
            <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
              <View className="flex-row items-center mb-6">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="business" size={24} color="#689F38" />
                </View>
                <Text className="text-gray-800 font-bold text-lg">
                  Business Information
                </Text>
              </View>

              <View className="space-y-4">
                <View>
                  <Text className="text-gray-700 font-medium text-sm mb-2">
                    Business Name *
                  </Text>
                  <View className="bg-gray-50 rounded-xl border border-gray-200">
                    <TextInput
                      className="px-4 py-3 text-gray-800 font-medium"
                      placeholder="Enter business name"
                      placeholderTextColor="#9CA3AF"
                      value={businessName}
                      onChangeText={setBusinessName}
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-gray-700 font-medium text-sm mb-2">
                    Owner Name *
                  </Text>
                  <View className="bg-gray-50 rounded-xl border border-gray-200">
                    <TextInput
                      className="px-4 py-3 text-gray-800 font-medium"
                      placeholder="Enter owner name"
                      placeholderTextColor="#9CA3AF"
                      value={ownerName}
                      onChangeText={setOwnerName}
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-gray-700 font-medium text-sm mb-2">
                    Contact Number *
                  </Text>
                  <View className="bg-gray-50 rounded-xl border border-gray-200">
                    <TextInput
                      className="px-4 py-3 text-gray-800 font-medium"
                      placeholder="Enter contact number"
                      placeholderTextColor="#9CA3AF"
                      value={contactNumber}
                      onChangeText={setContactNumber}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-gray-700 font-medium text-sm mb-2">
                    Email Address *
                  </Text>
                  <View className="bg-gray-50 rounded-xl border border-gray-200">
                    <TextInput
                      className="px-4 py-3 text-gray-800 font-medium"
                      placeholder="Enter email address"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Categories */}
            <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
              <View className="flex-row items-center mb-6">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="category" size={24} color="#689F38" />
                </View>
                <Text className="text-gray-800 font-bold text-lg">
                  Categories
                </Text>
              </View>

              <TouchableOpacity
                className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4"
                onPress={() => {
                  setCategoryModalVisible(true);
                }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-700 font-medium">
                    {selectedCategoryNames.length > 0
                      ? `${selectedCategoryNames.length} categories selected`
                      : 'Select categories'}
                  </Text>
                  <Icon name="arrow-drop-down" size={24} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

              {selectedCategoryNames.length > 0 && (
                <View className="flex-row flex-wrap mb-4">
                  {selectedCategoryNames.map((categoryName, index) => (
                    <View
                      key={`selected-cat-${index}-${categoryName}`} // More unique key
                      className="bg-primary-light rounded-full px-4 py-2 mr-2 mb-2 flex-row items-center">
                      <Text className="text-primary-dark text-sm font-medium mr-2">
                        {categoryName}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleCategorySelection(categoryName)}>
                        <Icon name="close" size={16} color="#689F38" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Subcategories */}
              {selectedCategoryNames.length > 0 && (
                <>
                  <Text className="text-gray-700 font-medium text-sm mb-3">
                    Subcategories
                  </Text>
                  <TouchableOpacity
                    className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4"
                    onPress={() => {
                      setSubCategoryModalVisible(true);
                    }}>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-gray-700 font-medium">
                        {selectedSubCategoryNames.length > 0
                          ? `${selectedSubCategoryNames.length} subcategories selected`
                          : 'Select subcategories (optional)'}
                      </Text>
                      <Icon name="arrow-drop-down" size={24} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>

                  {selectedSubCategoryNames.length > 0 && (
                    <View className="flex-row flex-wrap">
                      {selectedSubCategoryNames.map(
                        (subCategoryName, index) => (
                          <View
                            key={`selected-subcat-${index}-${subCategoryName}`} // More unique key
                            className="bg-blue-100 rounded-full px-4 py-2 mr-2 mb-2 flex-row items-center">
                            <Text className="text-blue-700 text-sm font-medium mr-2">
                              {subCategoryName}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                handleSubCategorySelection(subCategoryName)
                              }>
                              <Icon name="close" size={16} color="#3B82F6" />
                            </TouchableOpacity>
                          </View>
                        ),
                      )}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Address, Images, Operating Hours, Update Button sections remain the same as previous correct version */}
            {/* ... Ensure those sections are correctly pasted here ... */}
            {/* Address */}
            <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
              <View className="flex-row items-center mb-6">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="location-on" size={24} color="#689F38" />
                </View>
                <Text className="text-gray-800 font-bold text-lg">Address</Text>
              </View>

              <View className="space-y-4">
                <View>
                  <Text className="text-gray-700 font-medium text-sm mb-2">
                    Street Address
                  </Text>
                  <View className="bg-gray-50 rounded-xl border border-gray-200">
                    <TextInput
                      className="px-4 py-3 text-gray-800 font-medium"
                      placeholder="Enter street address"
                      placeholderTextColor="#9CA3AF"
                      value={streetAddress}
                      onChangeText={setStreetAddress}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>

                <View className="flex-row space-x-3">
                  <View className="flex-1">
                    <Text className="text-gray-700 font-medium text-sm mb-2">
                      City *
                    </Text>
                    <View className="bg-gray-50 rounded-xl border border-gray-200">
                      <TextInput
                        className="px-4 py-3 text-gray-800 font-medium"
                        placeholder="Enter city"
                        placeholderTextColor="#9CA3AF"
                        value={city}
                        onChangeText={setCity}
                      />
                    </View>
                  </View>

                  <View className="flex-1">
                    <Text className="text-gray-700 font-medium text-sm mb-2">
                      Pin Code *
                    </Text>
                    <View className="bg-gray-50 rounded-xl border border-gray-200">
                      <TextInput
                        className="px-4 py-3 text-gray-800 font-medium"
                        placeholder="Enter pin code"
                        placeholderTextColor="#9CA3AF"
                        value={pinCode}
                        onChangeText={setPinCode}
                        keyboardType="numeric"
                        maxLength={6}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Business Images */}
            <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
              <View className="flex-row items-center justify-between mb-6">
                <View className="flex-row items-center">
                  <View className="bg-primary-light rounded-full p-3 mr-4">
                    <Icon name="photo-library" size={24} color="#689F38" />
                  </View>
                  <Text className="text-gray-800 font-bold text-lg">
                    Business Images
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-primary rounded-full px-4 py-2"
                  onPress={() => setImagePickerVisible(true)}>
                  <Text className="text-white font-medium text-sm">
                    Add Image
                  </Text>
                </TouchableOpacity>
              </View>

              {businessImages.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row space-x-3">
                    {businessImages.map((image, index) => (
                      <View key={image.id || index} className="relative">
                        <Image
                          source={{
                            uri: `data:image/jpeg;base64,${image.base64}`,
                          }}
                          className="w-24 h-24 rounded-xl"
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center shadow-lg"
                          onPress={() => removeImage(image.id)}>
                          <Icon name="close" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View className="items-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
                  <Icon name="add-photo-alternate" size={48} color="#9CA3AF" />
                  <Text className="text-gray-500 text-sm mt-2 font-medium">
                    No images added
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    Add photos to showcase your business
                  </Text>
                </View>
              )}
            </View>

            {/* Operating Hours */}
            <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
              <View className="flex-row items-center mb-6">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="schedule" size={24} color="#689F38" />
                </View>
                <Text className="text-gray-800 font-bold text-lg">
                  Operating Hours
                </Text>
              </View>

              {Object.keys(weeklyHours).map(day => (
                <View
                  key={day}
                  className="flex-row items-center justify-between py-4 border-b border-gray-100">
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
                        weeklyHours[day].isOpen
                          ? 'bg-primary border-primary'
                          : 'border-gray-300'
                      }`}
                      onPress={() => toggleDayStatus(day)}>
                      {weeklyHours[day].isOpen && (
                        <Icon name="check" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                    <Text className="text-gray-800 font-medium w-20">
                      {day}
                    </Text>
                  </View>

                  {weeklyHours[day].isOpen ? (
                    <View className="flex-row items-center space-x-2">
                      <TouchableOpacity
                        className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
                        onPress={() => {
                          setCurrentTimeField(`${day}-openTime`);
                          setTimePickerVisible(true);
                        }}>
                        <Text className="text-gray-700 text-sm font-medium">
                          {weeklyHours[day].openTime &&
                          weeklyHours[day].openTime.toLocaleTimeString
                            ? weeklyHours[day].openTime.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : '9:00 AM'}
                        </Text>
                      </TouchableOpacity>

                      <Text className="text-gray-500 font-medium">to</Text>

                      <TouchableOpacity
                        className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
                        onPress={() => {
                          setCurrentTimeField(`${day}-closeTime`);
                          setTimePickerVisible(true);
                        }}>
                        <Text className="text-gray-700 text-sm font-medium">
                          {weeklyHours[day].closeTime &&
                          weeklyHours[day].closeTime.toLocaleTimeString
                            ? weeklyHours[day].closeTime.toLocaleTimeString(
                                [],
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                },
                              )
                            : '6:00 PM'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text className="text-red-500 font-semibold">Closed</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Update Button */}
            <TouchableOpacity
              className="bg-primary rounded-2xl px-8 py-5 shadow-lg mb-6"
              style={{
                shadowColor: '#FF4500',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
              onPress={handleUpdateBusiness}
              disabled={loading}>
              {loading ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-bold text-base ml-2">
                    Updating...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-center text-base">
                  Update Business
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modals remain the same as the previous correct version */}
        {/* Ensure the modal sections for Category, Subcategory, and ImagePicker are correctly pasted here */}
        {/* Fixed Category Selection Modal */}
        <Modal
          visible={categoryModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setCategoryModalVisible(false);
          }}>
          <TouchableOpacity
            activeOpacity={1}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'flex-end',
            }}
            onPressOut={() => setCategoryModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={{width: '100%'}}>
              <View
                style={{
                  backgroundColor: 'white',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  maxHeight: '80%',
                  shadowColor: '#000',
                  shadowOffset: {width: 0, height: -4},
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 20,
                }}>
                <View
                  style={{
                    padding: 24,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: '#1F2937',
                      }}>
                      Select Categories
                    </Text>
                    <TouchableOpacity
                      onPress={() => setCategoryModalVisible(false)}
                      style={{
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: '#F3F4F6',
                      }}>
                      <Icon name="close" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={{
                      color: '#6B7280',
                      fontSize: 14,
                      marginTop: 8,
                    }}>
                    Choose one or more categories for your business
                  </Text>
                </View>

                {/* ✅ FIXED: Use masterCategories with correct field mapping */}
                {masterCategories.length > 0 ? (
                  <FlatList
                    data={masterCategories} // ✅ Use masterCategories for display
                    renderItem={renderCategoryItem}
                    keyExtractor={item => item.id} // ✅ Use Firebase document ID
                    showsVerticalScrollIndicator={false}
                    style={{maxHeight: 400}}
                    extraData={selectedCategoryNames}
                  />
                ) : (
                  <View style={{alignItems: 'center', paddingVertical: 48}}>
                    <ActivityIndicator size="small" color="#FF4500" />
                    <Text
                      style={{color: '#6B7280', fontSize: 14, marginTop: 8}}>
                      Loading categories...
                    </Text>
                  </View>
                )}

                <View
                  style={{
                    padding: 16,
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                  }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FF4500',
                      borderRadius: 12,
                      paddingVertical: 12,
                    }}
                    onPress={() => setCategoryModalVisible(false)}>
                    <Text
                      style={{
                        color: 'white',
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}>
                      Done ({selectedCategoryNames.length} selected)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Fixed Subcategory Selection Modal */}
        <Modal
          visible={subCategoryModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setSubCategoryModalVisible(false);
          }}>
          <TouchableOpacity
            activeOpacity={1}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'flex-end',
            }}
            onPressOut={() => setSubCategoryModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={{width: '100%'}}>
              <View
                style={{
                  backgroundColor: 'white',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  maxHeight: '80%',
                  shadowColor: '#000',
                  shadowOffset: {width: 0, height: -4},
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 20,
                }}>
                <View
                  style={{
                    padding: 24,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: '#1F2937',
                      }}>
                      Select Subcategories
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSubCategoryModalVisible(false)}
                      style={{
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: '#F3F4F6',
                      }}>
                      <Icon name="close" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={{
                      color: '#6B7280',
                      fontSize: 14,
                      marginTop: 8,
                    }}>
                    Choose specific services you offer
                  </Text>
                </View>

                {/* ✅ FIXED: Use filteredSubCategoriesForModal with correct field mapping */}
                {filteredSubCategoriesForModal.length > 0 ? (
                  <FlatList
                    data={filteredSubCategoriesForModal} // ✅ Use filtered list for modal
                    renderItem={renderSubCategoryItem}
                    keyExtractor={item => item.id} // ✅ Use Firebase document ID
                    showsVerticalScrollIndicator={false}
                    style={{maxHeight: 400}}
                    extraData={selectedSubCategoryNames}
                  />
                ) : (
                  <View style={{alignItems: 'center', paddingVertical: 48}}>
                    <Icon name="category" size={48} color="#D1D5DB" />
                    <Text
                      style={{color: '#6B7280', fontSize: 16, marginTop: 8}}>
                      No subcategories available
                    </Text>
                    <Text style={{color: '#9CA3AF', fontSize: 14}}>
                      Select relevant parent categories first
                    </Text>
                  </View>
                )}

                <View
                  style={{
                    padding: 16,
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                  }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FF4500',
                      borderRadius: 12,
                      paddingVertical: 12,
                    }}
                    onPress={() => setSubCategoryModalVisible(false)}>
                    <Text
                      style={{
                        color: 'white',
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}>
                      Done ({selectedSubCategoryNames.length} selected)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Image Picker Modal */}
        <Modal
          visible={imagePickerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImagePickerVisible(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              paddingHorizontal: 24,
            }}>
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 24,
                padding: 32,
                width: '100%',
                maxWidth: 400,
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 20,
              }}>
              <View style={{alignItems: 'center', marginBottom: 24}}>
                <View
                  style={{
                    backgroundColor: '#E8F5E9',
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 16,
                  }}>
                  <Icon name="add-photo-alternate" size={32} color="#689F38" />
                </View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: '#1F2937',
                  }}>
                  Add Business Image
                </Text>
                <Text
                  style={{
                    color: '#6B7280',
                    fontSize: 14,
                    marginTop: 8,
                    textAlign: 'center',
                  }}>
                  Choose how you'd like to add an image
                </Text>
              </View>

              <View style={{gap: 16}}>
                <TouchableOpacity
                  onPress={() => handleImagePicker('camera')}
                  style={{
                    backgroundColor: '#E8F5E9',
                    borderRadius: 16,
                    padding: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(139, 195, 74, 0.2)',
                  }}>
                  <View
                    style={{
                      backgroundColor: '#FF4500',
                      borderRadius: 12,
                      padding: 12,
                      marginRight: 16,
                    }}>
                    <Icon name="camera-alt" size={24} color="#FFFFFF" />
                  </View>
                  <View style={{flex: 1}}>
                    <Text
                      style={{
                        color: '#2E7D32',
                        fontWeight: 'bold',
                        fontSize: 16,
                      }}>
                      Take Photo
                    </Text>
                    <Text
                      style={{
                        color: '#6B7280',
                        fontSize: 14,
                      }}>
                      Use camera to take a new photo
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleImagePicker('gallery')}
                  style={{
                    backgroundColor: '#E8F5E9',
                    borderRadius: 16,
                    padding: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(139, 195, 74, 0.2)',
                  }}>
                  <View
                    style={{
                      backgroundColor: '#FF4500',
                      borderRadius: 12,
                      padding: 12,
                      marginRight: 16,
                    }}>
                    <Icon name="photo-library" size={24} color="#FFFFFF" />
                  </View>
                  <View style={{flex: 1}}>
                    <Text
                      style={{
                        color: '#2E7D32',
                        fontWeight: 'bold',
                        fontSize: 16,
                      }}>
                      Choose from Gallery
                    </Text>
                    <Text
                      style={{
                        color: '#6B7280',
                        fontSize: 14,
                      }}>
                      Select from your photo library
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setImagePickerVisible(false)}
                style={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: 16,
                  padding: 16,
                  marginTop: 24,
                }}>
                <Text
                  style={{
                    color: '#374151',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    fontSize: 16,
                  }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Time Picker */}
        <DateTimePickerModal
          isVisible={timePickerVisible}
          mode="time"
          onConfirm={handleTimeChange}
          onCancel={() => {
            setTimePickerVisible(false);
            setCurrentTimeField(null);
          }}
          is24Hour={false} // Or true based on your preference
          display="default" // Or "spinner", "clock"
        />
      </SafeAreaView>
    </>
  );
}
