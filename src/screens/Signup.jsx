/* eslint-disable react-native/no-inline-styles */
/* eslint-disable curly */
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
  Modal,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';

// ✅ FIXED: Use only React Native Firebase for auth
import auth from '@react-native-firebase/auth';

// ✅ Keep Firebase Web SDK for Firestore
import {db} from '../config/firebaseConfig';
import {doc, setDoc} from 'firebase/firestore';

const {height: screenHeight} = Dimensions.get('window');

export default function Signup() {
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);

  // Form States
  const [currentStep, setCurrentStep] = useState(1);
  const [progressAnim] = useState(new Animated.Value(0));
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    gender: '',
    profilePicture: null,
    city: '',
    state: '',
    pinCode: '',
  });
  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const cityRef = useRef(null);
  const stateRef = useRef(null);
  const pinCodeRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  const genderOptions = ['Male', 'Female', 'Other'];

  const updateFormData = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
    setError('');
  };
  // ✅ FIXED: Improved input focus handler
  // ✅ FIXED: Improved input focus handler
  const handleInputFocus = inputRef => {
    setTimeout(() => {
      if (scrollViewRef.current && inputRef?.current) {
        // ✅ FIXED: Access ref through .current property
        inputRef.current.measure((x, y, width, height, pageX, pageY) => {
          const scrollToY = Math.max(0, pageY - 200);
          scrollViewRef.current.scrollTo({
            y: scrollToY,
            animated: true,
          });
        });
      } else {
        // Fallback: scroll to end
        scrollViewRef.current?.scrollToEnd({animated: true});
      }
    }, 100);
  };

  const updateProgressBar = step => {
    const progressPercentage = ((step - 1) / 2) * 100;
    Animated.timing(progressAnim, {
      toValue: progressPercentage,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const validateStep = step => {
    switch (step) {
      case 1:
        if (!formData.fullName.trim()) return 'Full name is required';
        if (!formData.email.trim()) return 'Email is required';
        if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Invalid email format';
        if (!formData.phoneNumber.trim()) return 'Phone number is required';
        if (formData.phoneNumber.length < 10) return 'Invalid phone number';
        if (!formData.password) return 'Password is required';
        if (formData.password.length < 6)
          return 'Password must be at least 6 characters';
        if (formData.password !== formData.confirmPassword)
          return 'Passwords do not match';
        return null;
      case 2:
        if (!formData.gender) return 'Please select your gender';
        return null;
      case 3:
        if (!formData.city.trim()) return 'City is required';
        if (!formData.pinCode.trim()) return 'Pin code is required';
        return null;
      default:
        return null;
    }
  };

  const nextStep = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (currentStep < 3) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      updateProgressBar(newStep);
      setError('');
      // Scroll to top when changing steps
      scrollViewRef.current?.scrollTo({y: 0, animated: true});
    } else {
      handleSignup();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      updateProgressBar(newStep);
      setError('');
      // Scroll to top when changing steps
      scrollViewRef.current?.scrollTo({y: 0, animated: true});
    }
  };

  const selectProfilePicture = () => {
    setImagePickerVisible(true);
  };

  const handleImagePicker = type => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 400,
      maxWidth: 400,
      quality: 0.8,
    };

    const callback = response => {
      if (response.didCancel || response.error) return;

      if (response.assets && response.assets[0]) {
        updateFormData('profilePicture', {
          uri: response.assets[0].uri,
          base64: response.assets[0].base64,
        });
      }
      setImagePickerVisible(false);
    };

    if (type === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError('');

    try {
      // ✅ Use React Native Firebase createUserWithEmailAndPassword
      const userCredential = await auth().createUserWithEmailAndPassword(
        formData.email,
        formData.password,
      );

      const user = userCredential.user;

      // ✅ Use React Native Firebase updateProfile
      await user.updateProfile({
        displayName: formData.fullName,
        photoURL: formData.profilePicture?.uri || null,
      });

      // ✅ Use React Native Firebase sendEmailVerification
      await user.sendEmailVerification();

      const userData = {
        uid: user.uid,
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        profilePicture: formData.profilePicture?.base64 || null,
        address: {
          city: formData.city,
          state: formData.state,
          pinCode: formData.pinCode,
        },
        emailVerified: false,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      // ✅ Use Firebase Web SDK for Firestore (this is correct)
      await setDoc(doc(db, 'Users', user.uid), userData);

      Alert.alert(
        'Account Created!',
        'Please check your email and verify your account before logging in.',
        [{text: 'OK', onPress: () => navigation.replace('Login')}],
      );
    } catch (err) {
      console.error('Signup error:', err);

      // ✅ Better error handling for React Native Firebase
      let errorMessage = 'Failed to create account. Please try again.';

      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email address is already registered.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = err.message || errorMessage;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View className="space-y-5">
            <View className="text-center mb-8">
              <Text className="text-3xl font-bold text-gray-700 mb-2">
                Create Account
              </Text>
              <Text className="text-gray-400 text-base">
                Join ServeNest to discover amazing services
              </Text>
            </View>

            {/* ✅ FIXED: Full Name Input */}
            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm my-1">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="person" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={fullNameRef}
                  placeholder="Full Name"
                  placeholderTextColor="#9CA3AF"
                  value={formData.fullName}
                  onChangeText={text => updateFormData('fullName', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  autoCapitalize="words"
                  onFocus={() => handleInputFocus(fullNameRef)}
                />
              </View>
            </View>

            {/* ✅ FIXED: Email Input */}
            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm my-1">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="email" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={emailRef}
                  placeholder="Email Address"
                  placeholderTextColor="#9CA3AF"
                  value={formData.email}
                  onChangeText={text => updateFormData('email', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => handleInputFocus(emailRef)}
                />
              </View>
            </View>

            {/* ✅ FIXED: Phone Input */}
            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm my-1">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="phone" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={phoneRef}
                  placeholder="Phone Number"
                  placeholderTextColor="#9CA3AF"
                  value={formData.phoneNumber}
                  onChangeText={text => updateFormData('phoneNumber', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  keyboardType="phone-pad"
                  maxLength={10}
                  onFocus={() => handleInputFocus(phoneRef)}
                />
              </View>
            </View>

            {/* ✅ FIXED: Password Input */}
            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm my-1">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="lock" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={passwordRef}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={formData.password}
                  onChangeText={text => updateFormData('password', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  secureTextEntry
                  onFocus={() => handleInputFocus(passwordRef)}
                />
              </View>
            </View>

            {/* ✅ FIXED: Confirm Password Input */}
            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="lock" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={confirmPasswordRef}
                  placeholder="Confirm Password"
                  placeholderTextColor="#9CA3AF"
                  value={formData.confirmPassword}
                  onChangeText={text => updateFormData('confirmPassword', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  secureTextEntry
                  onFocus={() => handleInputFocus(confirmPasswordRef)}
                />
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View className="space-y-5">
            {/* Step 2 content remains the same - no inputs with refs */}
            <View className="text-center mb-8">
              <Text className="text-3xl font-bold text-gray-700 mb-2">
                Personal Details
              </Text>
              <Text className="text-gray-400 text-base">
                Help us personalize your experience
              </Text>
            </View>

            <View className="items-center mb-8">
              <TouchableOpacity
                onPress={selectProfilePicture}
                className="w-32 h-32 rounded-full bg-gray-100 items-center justify-center border-4 border-dashed border-gray-300 shadow-sm">
                {formData.profilePicture ? (
                  <Image
                    source={{uri: formData.profilePicture.uri}}
                    className="w-full h-full rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Icon name="camera-alt" size={32} color="#8BC34A" />
                    <Text className="text-gray-400 text-sm mt-2">
                      Add Photo
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text className="text-gray-400 text-sm mt-3">
                Optional - Add a profile picture
              </Text>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <Text className="text-gray-700 font-bold text-lg mb-4">
                Gender
              </Text>
              <View className="flex-row flex-wrap">
                {genderOptions.map(gender => (
                  <TouchableOpacity
                    key={gender}
                    onPress={() => updateFormData('gender', gender)}
                    className={`px-6 py-3 rounded-full mr-3 mb-3 ${
                      formData.gender === gender ? 'bg-primary' : 'bg-gray-100'
                    }`}>
                    <Text
                      className={`font-medium ${
                        formData.gender === gender
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}>
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View className="space-y-5">
            <View className="text-center mb-8">
              <Text className="text-3xl font-bold text-gray-700 mb-2">
                Location Details
              </Text>
              <Text className="text-gray-400 text-base">
                Help us show you nearby services
              </Text>
            </View>

            {/* ✅ FIXED: City Input */}
            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="location-city" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={cityRef}
                  placeholder="City"
                  placeholderTextColor="#9CA3AF"
                  value={formData.city}
                  onChangeText={text => updateFormData('city', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  onFocus={() => handleInputFocus(cityRef)}
                />
              </View>
            </View>

            {/* ✅ FIXED: State Input */}
            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="map" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={stateRef}
                  placeholder="State"
                  placeholderTextColor="#9CA3AF"
                  value={formData.state}
                  onChangeText={text => updateFormData('state', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  onFocus={() => handleInputFocus(stateRef)}
                />
              </View>
            </View>

            {/* ✅ FIXED: Pin Code Input */}
            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="pin-drop" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={pinCodeRef}
                  placeholder="Pin Code"
                  placeholderTextColor="#9CA3AF"
                  value={formData.pinCode}
                  onChangeText={text => updateFormData('pinCode', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  keyboardType="numeric"
                  maxLength={6}
                  onFocus={() => handleInputFocus(pinCodeRef)}
                />
              </View>
            </View>

            <View className="bg-primary-light bg-opacity-30 rounded-2xl p-5 border border-primary border-opacity-30">
              <View className="flex-row items-center">
                <Icon name="info" size={20} color="#689F38" />
                <Text className="text-primary-dark text-sm ml-3 flex-1">
                  We'll send a verification email to confirm your account.
                  Please check your inbox after signing up.
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    // ✅ FIXED: Simplified KeyboardAvoidingView configuration
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1">
          {/* ✅ FIXED: Improved ScrollView configuration */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-6 py-10"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 100, // Fixed padding instead of dynamic
            }}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            enableOnAndroid={true}>
            {/* Welcome Section */}
            <View className="items-center mb-8 mt-6">
              <View className="bg-primary-light rounded-full p-5 mb-5 shadow-md">
                <Icon name="person-add" size={40} color="#689F38" />
              </View>
              <Text className="text-gray-700 font-bold text-3xl mb-2">
                Join ServeNest
              </Text>
              <Text className="text-gray-400 text-base text-center px-4">
                Create your account to discover amazing services near you
              </Text>
            </View>

            {/* Progress Section */}
            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-gray-700 font-bold text-lg">
                    Step {currentStep} of 3
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {currentStep === 1
                      ? 'Basic Information'
                      : currentStep === 2
                      ? 'Personal Details'
                      : 'Location & Finish'}
                  </Text>
                </View>
                <View className="bg-primary-light rounded-full px-4 py-2">
                  <Text className="text-primary-dark text-sm font-bold">
                    {Math.round(((currentStep - 1) / 2) * 100)}%
                  </Text>
                </View>
              </View>

              <View className="relative mb-2">
                <View className="bg-gray-200 rounded-full h-2 w-full" />
                <Animated.View
                  className="absolute top-0 left-0 rounded-full h-2"
                  style={{
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                    backgroundColor: '#8BC34A',
                    shadowColor: '#8BC34A',
                    shadowOffset: {width: 0, height: 0},
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                />

                <View className="absolute -top-1 left-0 right-0 flex-row justify-between">
                  {[1, 2, 3].map((step, index) => (
                    <View
                      key={step}
                      className={`w-4 h-4 rounded-full border-2 ${
                        currentStep >= step
                          ? 'bg-primary border-primary shadow-lg'
                          : 'bg-gray-200 border-gray-300'
                      }`}
                      style={{
                        left: index === 0 ? 0 : index === 1 ? '50%' : 'auto',
                        right: index === 2 ? 0 : 'auto',
                        transform: index === 1 ? [{translateX: -8}] : [],
                        elevation: currentStep >= step ? 4 : 0,
                      }}
                    />
                  ))}
                </View>
              </View>

              <View className="flex-row justify-between mt-3">
                {['Basic', 'Personal', 'Location'].map((label, index) => (
                  <Text
                    key={label}
                    className={`text-xs ${
                      currentStep >= index + 1
                        ? 'text-primary-dark font-semibold'
                        : 'text-gray-400'
                    }`}>
                    {label}
                  </Text>
                ))}
              </View>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-slate-100 bg-opacity-10 border border-accent-red border-opacity-30 rounded-xl p-4 mb-6">
                <View className="flex-row items-center">
                  <Icon name="error" size={20} color="#D32F2F" />
                  <Text className="text-accent-red text-sm ml-3 flex-1 font-medium">
                    {error}
                  </Text>
                </View>
              </View>
            ) : null}

            {renderStep()}

            {/* Navigation Buttons */}
            <View className="flex-row justify-between mt-8 mb-6">
              {currentStep > 1 && (
                <TouchableOpacity
                  onPress={prevStep}
                  className="bg-gray-200 rounded-2xl px-8 py-4 flex-1 mr-3">
                  <Text className="text-gray-700 font-bold text-center text-base">
                    Previous
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={nextStep}
                disabled={loading}
                className={`bg-primary rounded-2xl px-8 py-4 ${
                  currentStep === 1 ? 'flex-1' : 'flex-1 ml-3'
                }`}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-center text-base">
                    {currentStep === 3 ? 'Create Account' : 'Next'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-400">Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text className="text-primary font-bold">Login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {/* Image Picker Modal */}
      <Modal
        visible={imagePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImagePickerVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-2xl p-6 w-11/12 max-w-sm">
            <Text className="text-gray-700 font-bold text-xl mb-6 text-center">
              Select Profile Picture
            </Text>
            <View className="space-y-4">
              <TouchableOpacity
                onPress={() => handleImagePicker('camera')}
                className="bg-primary-light rounded-xl p-4 flex-row items-center">
                <View className="bg-primary rounded-full p-3 mr-4">
                  <Icon name="camera-alt" size={20} color="#FFFFFF" />
                </View>
                <Text className="text-primary-dark font-medium text-base">
                  Take Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleImagePicker('gallery')}
                className="bg-primary-light rounded-xl p-4 flex-row items-center">
                <View className="bg-primary rounded-full p-3 mr-4">
                  <Icon name="photo-library" size={20} color="#FFFFFF" />
                </View>
                <Text className="text-primary-dark font-medium text-base">
                  Choose from Gallery
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setImagePickerVisible(false)}
              className="bg-gray-200 rounded-xl p-4 mt-6">
              <Text className="text-gray-700 font-bold text-center">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
