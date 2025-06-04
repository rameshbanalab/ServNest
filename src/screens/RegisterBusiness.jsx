/* eslint-disable no-catch-shadow */
import React, {useState, useEffect, useRef} from 'react';
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
  ActivityIndicator,
  Switch,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from 'react-native-geolocation-service';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import {db, auth} from '../config/firebaseConfig';
import {collection, getDocs, addDoc, query} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width} = Dimensions.get('window');

export default function RegisterBusiness() {
  const navigation = useNavigation();
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [location, setLocation] = useState({latitude: null, longitude: null});
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationFetched, setLocationFetched] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subCategoryModalVisible, setSubCategoryModalVisible] = useState(false);
  const [hoursModalVisible, setHoursModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [currentTimeSelection, setCurrentTimeSelection] = useState({
    day: '',
    type: '',
  });

  // Image Upload States
  const [businessImages, setBusinessImages] = useState([]);
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);
  const [imagePreviewModalVisible, setImagePreviewModalVisible] =
    useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const scrollViewRef = useRef(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const firebaseUser = auth.currentUser;

        if (token && firebaseUser) {
          // User is authenticated and token exists
          setCurrentUser(firebaseUser);
        } else {
          // No token or no Firebase user - redirect to login
          Alert.alert(
            'Authentication Required',
            'Please login to register a business.',
            [
              {
                text: 'Login',
                onPress: () => navigation.navigate('Login'),
              },
            ],
          );
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        Alert.alert('Authentication Error', 'Please login to continue.', [
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login'),
          },
        ]);
      } finally {
        setUserLoading(false);
      }
    };

    checkAuthentication();
  }, [navigation]);

  // Operating hours state - EMPTY BY DEFAULT
  const [weeklyHours, setWeeklyHours] = useState({
    Monday: {
      isOpen: false,
      openTime: new Date(2024, 0, 1, 9, 0),
      closeTime: new Date(2024, 0, 1, 17, 0),
    },
    Tuesday: {
      isOpen: false,
      openTime: new Date(2024, 0, 1, 9, 0),
      closeTime: new Date(2024, 0, 1, 17, 0),
    },
    Wednesday: {
      isOpen: false,
      openTime: new Date(2024, 0, 1, 9, 0),
      closeTime: new Date(2024, 0, 1, 17, 0),
    },
    Thursday: {
      isOpen: false,
      openTime: new Date(2024, 0, 1, 9, 0),
      closeTime: new Date(2024, 0, 1, 17, 0),
    },
    Friday: {
      isOpen: false,
      openTime: new Date(2024, 0, 1, 9, 0),
      closeTime: new Date(2024, 0, 1, 17, 0),
    },
    Saturday: {
      isOpen: false,
      openTime: new Date(2024, 0, 1, 10, 0),
      closeTime: new Date(2024, 0, 1, 16, 0),
    },
    Sunday: {
      isOpen: false,
      openTime: new Date(2024, 0, 1, 10, 0),
      closeTime: new Date(2024, 0, 1, 16, 0),
    },
  });

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Automatically fetch location on component mount
  useEffect(() => {
    const checkAndRequestLocationPermission = async () => {
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      const status = await check(permission);
      if (status === RESULTS.GRANTED) {
        fetchCurrentLocation();
      } else {
        const newStatus = await request(permission);
        if (newStatus === RESULTS.GRANTED) {
          fetchCurrentLocation();
        } else {
          setLocationError(
            'Location permission denied. Please enter address manually.',
          );
        }
      }
    };

    checkAndRequestLocationPermission();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCategoriesLoading(true);
        const categoriesQuery = query(collection(db, 'Categories'));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        if (!categoriesSnapshot.empty) {
          const categoriesData = categoriesSnapshot.docs.map(doc => ({
            id: doc.data().category_id,
            name: doc.data().category_name,
          }));
          setCategories(categoriesData);
        } else {
          console.log('No categories found in Firestore.');
        }

        const subCategoriesQuery = query(collection(db, 'SubCategories'));
        const subCategoriesSnapshot = await getDocs(subCategoriesQuery);
        if (!subCategoriesSnapshot.empty) {
          const subCategoriesData = subCategoriesSnapshot.docs.map(doc => ({
            id: doc.data().sub_category_id,
            name: doc.data().sub_category_name,
            category_id: doc.data().category_id,
          }));
          setSubCategories(subCategoriesData);
        } else {
          console.log('No subcategories found in Firestore.');
        }
      } catch (err) {
        console.error('Error fetching data from Firestore:', err.message);
        setError('Failed to load categories. Please try again.');
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setSelectedSubCategories(prev =>
      prev.filter(subName =>
        subCategories.some(
          sub =>
            sub.name === subName &&
            selectedCategories.some(catName => {
              const cat = categories.find(c => c.name === catName);
              return cat && sub.category_id === cat.id;
            }),
        ),
      ),
    );
  }, [selectedCategories, subCategories, categories]);

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

  const filteredSubCategories = subCategories.filter(sub => {
    const selectedCategoryIds = selectedCategories
      .map(catName => {
        const cat = categories.find(c => c.name === catName);
        return cat ? cat.id : null;
      })
      .filter(id => id !== null);
    return selectedCategoryIds.includes(sub.category_id);
  });

  // Image Upload Functions
  const requestCameraPermission = async () => {
    try {
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.CAMERA
          : PERMISSIONS.ANDROID.CAMERA;
      const status = await check(permission);
      if (status === RESULTS.GRANTED) {
        return true;
      } else {
        const newStatus = await request(permission);
        return newStatus === RESULTS.GRANTED;
      }
    } catch (err) {
      console.error('Camera permission error:', err);
      return false;
    }
  };

  const convertToBase64 = uri => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        const reader = new FileReader();
        reader.onloadend = function () {
          resolve(reader.result.split(',')[1]);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.open('GET', uri);
      xhr.responseType = 'blob';
      xhr.send();
    });
  };

  const pickImageFromGallery = () => {
    if (businessImages.length >= 5) {
      Alert.alert('Maximum Images', 'You can only upload up to 5 images.');
      return;
    }

    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, async response => {
      if (response.didCancel || response.error) {
        console.log('Image picker cancelled or error:', response.error);
        return;
      }

      if (response.assets && response.assets[0]) {
        try {
          const asset = response.assets[0];
          const base64 = await convertToBase64(asset.uri);

          const imageData = {
            id: Date.now().toString(),
            uri: asset.uri,
            base64: base64,
            fileName: asset.fileName || `image_${Date.now()}.jpg`,
            fileSize: asset.fileSize,
            type: asset.type,
          };

          setBusinessImages(prev => [...prev, imageData]);
          setImagePickerModalVisible(false);
        } catch (error) {
          console.error('Error converting image to base64:', error);
          Alert.alert('Error', 'Failed to process the selected image.');
        }
      }
    });
  };

  const takePhotoWithCamera = async () => {
    if (businessImages.length >= 5) {
      Alert.alert('Maximum Images', 'You can only upload up to 5 images.');
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to take photos.',
      );
      return;
    }

    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchCamera(options, async response => {
      if (response.didCancel || response.error) {
        console.log('Camera cancelled or error:', response.error);
        return;
      }

      if (response.assets && response.assets[0]) {
        try {
          const asset = response.assets[0];
          const base64 = await convertToBase64(asset.uri);

          const imageData = {
            id: Date.now().toString(),
            uri: asset.uri,
            base64: base64,
            fileName: asset.fileName || `photo_${Date.now()}.jpg`,
            fileSize: asset.fileSize,
            type: asset.type,
          };

          setBusinessImages(prev => [...prev, imageData]);
          setImagePickerModalVisible(false);
        } catch (error) {
          console.error('Error converting image to base64:', error);
          Alert.alert('Error', 'Failed to process the captured image.');
        }
      }
    });
  };

  const removeImage = imageId => {
    Alert.alert('Remove Image', 'Are you sure you want to remove this image?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setBusinessImages(prev => prev.filter(img => img.id !== imageId));
        },
      },
    ]);
  };

  const previewImage = index => {
    setSelectedImageIndex(index);
    setImagePreviewModalVisible(true);
  };

  const fetchCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError('');
    try {
      Geolocation.getCurrentPosition(
        position => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationFetched(true);
          setLocationLoading(false);
        },
        error => {
          setLocationError(
            'Failed to fetch location automatically. Please enter address manually.',
          );
          setLocationLoading(false);
          console.error('Location error:', error);
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    } catch (err) {
      setLocationError('Error fetching location: ' + err.message);
      setLocationLoading(false);
    }
  };

  const formatTime = date => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const toggleDayOpen = day => {
    setWeeklyHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen,
      },
    }));
  };

  const openTimePicker = (day, type) => {
    setCurrentTimeSelection({day, type});
    setTimePickerVisible(true);
  };

  const handleTimeConfirm = selectedTime => {
    const {day, type} = currentTimeSelection;
    setWeeklyHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type === 'open' ? 'openTime' : 'closeTime']: selectedTime,
      },
    }));
    setTimePickerVisible(false);
  };

  const saveOperatingHours = () => {
    setHoursModalVisible(false);
  };

  // Generate operating hours display with better formatting
  const generateOperatingHoursDisplay = () => {
    const openDays = daysOfWeek.filter(day => weeklyHours[day].isOpen);

    if (openDays.length === 0) {
      return null; // Return null instead of "Closed all days"
    }

    if (openDays.length <= 2) {
      return openDays
        .map(day => {
          const dayHours = weeklyHours[day];
          return `${day}: ${formatTime(dayHours.openTime)} - ${formatTime(
            dayHours.closeTime,
          )}`;
        })
        .join(', ');
    }

    return `${openDays.length} days configured`;
  };

  const copyToAllDays = sourceDay => {
    const sourceHours = weeklyHours[sourceDay];
    const updatedHours = {};
    daysOfWeek.forEach(day => {
      updatedHours[day] = {
        isOpen: sourceHours.isOpen,
        openTime: new Date(sourceHours.openTime),
        closeTime: new Date(sourceHours.closeTime),
      };
    });
    setWeeklyHours(updatedHours);
  };

  const resetFormToDefaults = () => {
    setBusinessName('');
    setOwnerName('');
    setContactNumber('');
    setEmail('');
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setStreetAddress('');
    setCity('');
    setPinCode('');
    setLocation({latitude: null, longitude: null});
    setLocationError('');
    setLocationFetched(false);
    setError('');
    setBusinessImages([]);

    // Reset to empty operating hours
    setWeeklyHours({
      Monday: {
        isOpen: false,
        openTime: new Date(2024, 0, 1, 9, 0),
        closeTime: new Date(2024, 0, 1, 17, 0),
      },
      Tuesday: {
        isOpen: false,
        openTime: new Date(2024, 0, 1, 9, 0),
        closeTime: new Date(2024, 0, 1, 17, 0),
      },
      Wednesday: {
        isOpen: false,
        openTime: new Date(2024, 0, 1, 9, 0),
        closeTime: new Date(2024, 0, 1, 17, 0),
      },
      Thursday: {
        isOpen: false,
        openTime: new Date(2024, 0, 1, 9, 0),
        closeTime: new Date(2024, 0, 1, 17, 0),
      },
      Friday: {
        isOpen: false,
        openTime: new Date(2024, 0, 1, 9, 0),
        closeTime: new Date(2024, 0, 1, 17, 0),
      },
      Saturday: {
        isOpen: false,
        openTime: new Date(2024, 0, 1, 10, 0),
        closeTime: new Date(2024, 0, 1, 16, 0),
      },
      Sunday: {
        isOpen: false,
        openTime: new Date(2024, 0, 1, 10, 0),
        closeTime: new Date(2024, 0, 1, 16, 0),
      },
    });
  };

  const handleRegister = async () => {
    // Check if user is authenticated
    if (!currentUser) {
      Alert.alert('Error', 'Please login to register a business.');
      navigation.navigate('Login');
      return;
    }

    if (
      !businessName ||
      !ownerName ||
      !contactNumber ||
      !email ||
      selectedCategories.length === 0 ||
      selectedSubCategories.length === 0 ||
      !streetAddress ||
      !city ||
      !pinCode
    ) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const processedWeeklyHours = {};
      Object.keys(weeklyHours).forEach(day => {
        processedWeeklyHours[day] = {
          isOpen: weeklyHours[day].isOpen,
          openTime:
            weeklyHours[day].openTime instanceof Date
              ? weeklyHours[day].openTime
              : new Date(weeklyHours[day].openTime),
          closeTime:
            weeklyHours[day].closeTime instanceof Date
              ? weeklyHours[day].closeTime
              : new Date(weeklyHours[day].closeTime),
        };
      });

      const imagesData = businessImages.map(img => ({
        id: img.id,
        fileName: img.fileName,
        base64: img.base64,
        fileSize: img.fileSize,
        type: img.type,
      }));

      const businessData = {
        // Add user information from currentUser
        userId: currentUser.uid,
        userEmail: currentUser.email,
        businessName,
        ownerName,
        contactNumber,
        email,
        categories: selectedCategories,
        subCategories: selectedSubCategories,
        address: {
          street: streetAddress,
          city,
          pinCode,
        },
        weeklySchedule: processedWeeklyHours,
        images: imagesData,
        location: {
          latitude: location.latitude || 0,
          longitude: location.longitude || 0,
        },
        status: 'pending', // Add business status
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'Businesses'), businessData);

      resetFormToDefaults();

      Alert.alert(
        'Success',
        'Business registered successfully! It will be reviewed and activated soon.',
        [
          {
            text: 'View My Businesses',
            onPress: () => navigation.navigate('My Businesses'),
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (err) {
      setError(err.message || 'Failed to register business. Please try again.');
      console.error('Error registering business:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (userLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="text-gray-700 text-base mt-4">
          Checking authentication...
        </Text>
      </View>
    );
  }

  // Show login prompt if not authenticated
  if (!currentUser) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-6">
        <Icon name="store-plus" size={64} color="#8BC34A" />
        <Text className="text-gray-700 font-bold text-xl mt-4 mb-2">
          Authentication Required
        </Text>
        <Text className="text-gray-500 text-center mb-6">
          Please login to register your business with ServeNest
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-xl px-8 py-4"
          onPress={() => navigation.navigate('Login')}>
          <Text className="text-white font-bold text-base">Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleHoursModalOpen = () => {
    setHoursModalVisible(true);
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({y: 0, animated: false});
      }
    }, 100);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View className="flex-1" style={{opacity: fadeAnim}}>
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {error ? (
            <View className="bg-red-100 rounded-lg p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : null}

          <View className="space-y-4 mb-6">
            {/* Business Details */}
            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <Icon name="store" size={20} color="#8BC34A" className="mr-2" />
                <TextInput
                  placeholder="Business Name *"
                  placeholderTextColor="#9CA3AF"
                  value={businessName}
                  onChangeText={setBusinessName}
                  className="flex-1 text-gray-800 text-base"
                />
              </View>
            </View>

            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <Icon
                  name="account-outline"
                  size={20}
                  color="#8BC34A"
                  className="mr-2"
                />
                <TextInput
                  placeholder="Owner Name *"
                  placeholderTextColor="#9CA3AF"
                  value={ownerName}
                  onChangeText={setOwnerName}
                  className="flex-1 text-gray-800 text-base"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <Icon
                  name="phone-outline"
                  size={20}
                  color="#8BC34A"
                  className="mr-2"
                />
                <TextInput
                  placeholder="Contact Number *"
                  placeholderTextColor="#9CA3AF"
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  className="flex-1 text-gray-800 text-base"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <Icon
                  name="email-outline"
                  size={20}
                  color="#8BC34A"
                  className="mr-2"
                />
                <TextInput
                  placeholder="Email Address *"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  className="flex-1 text-gray-800 text-base"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Categories */}
            {categoriesLoading ? (
              <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm justify-center items-center">
                <ActivityIndicator size="small" color="#8BC34A" />
                <Text className="text-gray-600 text-sm mt-2">
                  Loading categories...
                </Text>
              </View>
            ) : (
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
                    className="flex-1 text-base"
                    style={
                      selectedCategories.length > 0
                        ? {color: '#1F2937'}
                        : {color: '#9CA3AF'}
                    }>
                    {renderSelectedText(
                      selectedCategories,
                      'Select Categories *',
                    )}
                  </Text>
                  <Icon name="chevron-down" size={20} color="#8BC34A" />
                </View>
              </TouchableOpacity>
            )}

            {/* Subcategories */}
            {selectedCategories.length > 0 && !categoriesLoading ? (
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
                    className="flex-1 text-base"
                    style={
                      selectedSubCategories.length > 0
                        ? {color: '#1F2937'}
                        : {color: '#9CA3AF'}
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

            {/* Business Images Upload */}
            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Icon
                    name="camera"
                    size={20}
                    color="#8BC34A"
                    className="mr-2"
                  />
                  <Text className="text-gray-800 text-base font-medium">
                    Business Images
                  </Text>
                </View>
                <Text className="text-gray-500 text-sm">
                  {businessImages.length}/5
                </Text>
              </View>

              <TouchableOpacity
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 items-center justify-center mb-3"
                onPress={() => setImagePickerModalVisible(true)}
                disabled={businessImages.length >= 5}>
                <Icon
                  name="cloud-upload"
                  size={32}
                  color={businessImages.length >= 5 ? '#9CA3AF' : '#8BC34A'}
                />
                <Text
                  className={`text-sm mt-2 ${
                    businessImages.length >= 5
                      ? 'text-gray-400'
                      : 'text-gray-600'
                  }`}>
                  {businessImages.length >= 5
                    ? 'Maximum 5 images reached'
                    : 'Tap to add business images'}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  JPG, PNG up to 2MB each
                </Text>
              </TouchableOpacity>

              {businessImages.length > 0 && (
                <View className="flex-row flex-wrap">
                  {businessImages.map((image, index) => (
                    <View key={image.id} className="w-1/3 p-1">
                      <View className="relative">
                        <TouchableOpacity onPress={() => previewImage(index)}>
                          <Image
                            source={{uri: image.uri}}
                            className="w-full h-20 rounded-lg"
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                          onPress={() => removeImage(image.id)}>
                          <Icon name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Address Fields */}
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
                  placeholderTextColor="#9CA3AF"
                  value={streetAddress}
                  onChangeText={setStreetAddress}
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
                    placeholderTextColor="#9CA3AF"
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
                    placeholderTextColor="#9CA3AF"
                    value={pinCode}
                    onChangeText={setPinCode}
                    className="flex-1 text-gray-800 text-base"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Enhanced Operating Hours Display */}
            <TouchableOpacity
              className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
              onPress={handleHoursModalOpen}>
              <View className="flex-row items-center">
                <Icon
                  name="clock-outline"
                  size={20}
                  color="#8BC34A"
                  className="mr-2"
                />
                <View className="flex-1">
                  {generateOperatingHoursDisplay() ? (
                    <View>
                      <Text className="text-gray-800 text-base font-medium">
                        Operating Hours
                      </Text>
                      <Text className="text-gray-600 text-sm mt-1">
                        {generateOperatingHoursDisplay()}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-gray-400 text-base">
                      Set Operating Hours (Optional)
                    </Text>
                  )}
                </View>
                <Icon name="chevron-down" size={20} color="#8BC34A" />
              </View>
            </TouchableOpacity>

            {/* Enhanced Location Display */}
            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Icon
                    name="map-marker-check"
                    size={20}
                    color="#8BC34A"
                    className="mr-2"
                  />
                  <View className="flex-1">
                    {locationFetched ? (
                      <View>
                        <Text className="text-gray-800 text-base font-medium">
                          Location Detected
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          Lat: {location.latitude?.toFixed(4)}, Lng:{' '}
                          {location.longitude?.toFixed(4)}
                        </Text>
                      </View>
                    ) : locationLoading ? (
                      <View className="flex-row items-center">
                        <ActivityIndicator size="small" color="#8BC34A" />
                        <Text className="text-gray-600 text-base ml-2">
                          Detecting location...
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-gray-400 text-base">
                        {locationError || 'Location not detected'}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={fetchCurrentLocation}
                  disabled={locationLoading}
                  className="bg-primary-light px-3 py-2 rounded-lg">
                  <Text className="text-primary-dark text-sm font-medium">
                    {locationFetched ? 'Refresh' : 'Detect'}
                  </Text>
                </TouchableOpacity>
              </View>
              {locationError && (
                <Text className="text-red-600 text-sm mt-2">
                  {locationError}
                </Text>
              )}
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
          <View className="h-10" />
        </ScrollView>
      </Animated.View>

      {/* Image Picker Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={imagePickerModalVisible}
        onRequestClose={() => setImagePickerModalVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-xl p-5 w-11/12 shadow-lg">
            <Text className="text-gray-800 font-bold text-xl mb-4 text-center">
              Add Business Image
            </Text>
            <View className="space-y-3">
              <TouchableOpacity
                className="bg-primary-light rounded-lg p-4 flex-row items-center"
                onPress={pickImageFromGallery}>
                <Icon name="image" size={24} color="#8BC34A" className="mr-3" />
                <Text className="text-primary-dark font-medium text-base">
                  Choose from Gallery
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              className="bg-gray-300 rounded-lg p-3 mt-4"
              onPress={() => setImagePickerModalVisible(false)}>
              <Text className="text-gray-800 font-bold text-center">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={imagePreviewModalVisible}
        onRequestClose={() => setImagePreviewModalVisible(false)}>
        <View className="flex-1 bg-black">
          <View className="flex-row justify-between items-center p-4 bg-black bg-opacity-80">
            <TouchableOpacity
              onPress={() => setImagePreviewModalVisible(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text className="text-white font-medium">
              {selectedImageIndex + 1} of {businessImages.length}
            </Text>
            <TouchableOpacity
              onPress={() =>
                removeImage(businessImages[selectedImageIndex]?.id)
              }>
              <Icon name="delete" size={24} color="#ff4444" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 justify-center items-center">
            {businessImages[selectedImageIndex] && (
              <Image
                source={{uri: businessImages[selectedImageIndex].uri}}
                style={{width: width, height: width}}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

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
              keyExtractor={item => item.id}
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
            {filteredSubCategories.length > 0 ? (
              <FlatList
                data={filteredSubCategories}
                keyExtractor={item => item.id}
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
                No subcategories available for selected categories
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

      {/* Enhanced Operating Hours Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={hoursModalVisible}
        onRequestClose={() => setHoursModalVisible(false)}>
        <View className="flex-1 justify-end bg-black bg-opacity-50">
          <View className="bg-white rounded-t-xl p-5 h-5/6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-800 font-bold text-xl">
                Operating Hours
              </Text>
              <TouchableOpacity onPress={() => setHoursModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Quick Setup Options */}
            <View className="flex-row mb-4 space-x-2">
              <TouchableOpacity
                className="flex-1 bg-primary-light rounded-lg p-3"
                onPress={() => {
                  const standardHours = {};
                  daysOfWeek.forEach(day => {
                    standardHours[day] = {
                      isOpen: day !== 'Sunday',
                      openTime: new Date(2024, 0, 1, 9, 0),
                      closeTime: new Date(2024, 0, 1, 17, 0),
                    };
                  });
                  setWeeklyHours(standardHours);
                }}>
                <Text className="text-primary-dark text-center font-medium">
                  Mon-Sat 9-5
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-primary-light rounded-lg p-3"
                onPress={() => {
                  const allDaysHours = {};
                  daysOfWeek.forEach(day => {
                    allDaysHours[day] = {
                      isOpen: true,
                      openTime: new Date(2024, 0, 1, 8, 0),
                      closeTime: new Date(2024, 0, 1, 20, 0),
                    };
                  });
                  setWeeklyHours(allDaysHours);
                }}>
                <Text className="text-primary-dark text-center font-medium">
                  All Days 8-8
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-lg p-3"
                onPress={() => {
                  const closedHours = {};
                  daysOfWeek.forEach(day => {
                    closedHours[day] = {
                      isOpen: false,
                      openTime: new Date(2024, 0, 1, 9, 0),
                      closeTime: new Date(2024, 0, 1, 17, 0),
                    };
                  });
                  setWeeklyHours(closedHours);
                }}>
                <Text className="text-gray-700 text-center font-medium">
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{paddingBottom: 20}}>
              {daysOfWeek.map((day, index) => (
                <View key={day} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-gray-800 font-semibold text-base">
                      {day}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-gray-600 text-sm mr-2">
                        {weeklyHours[day].isOpen ? 'Open' : 'Closed'}
                      </Text>
                      <Switch
                        value={weeklyHours[day].isOpen}
                        onValueChange={() => toggleDayOpen(day)}
                        trackColor={{false: '#D1D5DB', true: '#8BC34A'}}
                        thumbColor={
                          weeklyHours[day].isOpen ? '#fff' : '#f4f3f4'
                        }
                      />
                    </View>
                  </View>

                  {weeklyHours[day].isOpen && (
                    <View className="flex-row justify-between items-center">
                      <TouchableOpacity
                        className="bg-white rounded-lg p-3 flex-1 mr-2 border border-gray-200"
                        onPress={() => openTimePicker(day, 'open')}>
                        <Text className="text-gray-600 text-xs mb-1">
                          Opening Time
                        </Text>
                        <Text className="text-gray-800 font-medium">
                          {formatTime(weeklyHours[day].openTime)}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="bg-white rounded-lg p-3 flex-1 ml-2 border border-gray-200"
                        onPress={() => openTimePicker(day, 'close')}>
                        <Text className="text-gray-600 text-xs mb-1">
                          Closing Time
                        </Text>
                        <Text className="text-gray-800 font-medium">
                          {formatTime(weeklyHours[day].closeTime)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {index === 0 && (
                    <TouchableOpacity
                      className="mt-3 bg-primary-light rounded-lg p-2"
                      onPress={() => copyToAllDays(day)}>
                      <Text className="text-primary-dark text-center text-sm font-medium">
                        Copy to All Days
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>

            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                className="bg-gray-300 rounded-lg p-4 flex-1 mr-2"
                onPress={() => setHoursModalVisible(false)}>
                <Text className="text-gray-800 font-bold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-primary rounded-lg p-4 flex-1 ml-2"
                onPress={saveOperatingHours}>
                <Text className="text-white font-bold text-center">
                  Save Hours
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <DateTimePickerModal
        isVisible={timePickerVisible}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={() => setTimePickerVisible(false)}
        is24Hour={false}
        date={
          currentTimeSelection.day && currentTimeSelection.type
            ? weeklyHours[currentTimeSelection.day][
                currentTimeSelection.type === 'open' ? 'openTime' : 'closeTime'
              ]
            : new Date()
        }
      />
    </KeyboardAvoidingView>
  );
}
