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
import auth from '@react-native-firebase/auth';
import {db} from '../config/firebaseConfig';
import {doc, setDoc} from 'firebase/firestore';
import {useTranslation} from 'react-i18next';

const {height: screenHeight} = Dimensions.get('window');

export default function Signup() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  
  const genderOptions = [
    {key: 'male', label: t('male')},
    {key: 'female', label: t('female')},
    {key: 'other', label: t('other')}
  ];

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, []);

  const updateFormData = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
    setError('');
  };

  const handleInputFocus = (inputRef, extraOffset = 0) => {
    setTimeout(() => {
      if (scrollViewRef.current && inputRef?.current) {
        inputRef.current.measureInWindow((x, y, width, height) => {
          const screenHeight = Dimensions.get('window').height;
          const keyboardHeight = Platform.OS === 'ios' ? 300 : 250;
          const availableHeight = screenHeight - keyboardHeight;
          
          if (y + height > availableHeight) {
            const scrollToY = y - availableHeight + height + 100 + extraOffset;
            scrollViewRef.current.scrollTo({
              y: Math.max(0, scrollToY),
              animated: true,
            });
          }
        });
      }
    }, 150);
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
        if (!formData.fullName.trim()) return t('full_name_required');
        if (!formData.email.trim()) return t('email_required');
        if (!/\S+@\S+\.\S+/.test(formData.email)) return t('invalid_email_format');
        if (!formData.phoneNumber.trim()) return t('phone_number_required');
        if (formData.phoneNumber.length < 10) return t('invalid_phone_number');
        if (!formData.password) return t('password_required');
        if (formData.password.length < 6) return t('password_min_length');
        if (formData.password !== formData.confirmPassword) return t('passwords_not_match');
        return null;
      case 2:
        if (!formData.gender) return t('select_gender');
        return null;
      case 3:
        if (!formData.city.trim()) return t('city_required');
        if (!formData.pinCode.trim()) return t('pin_code_required');
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
      const userCredential = await auth().createUserWithEmailAndPassword(
        formData.email,
        formData.password,
      );

      const user = userCredential.user;

      await user.updateProfile({
        displayName: formData.fullName,
        photoURL: formData.profilePicture?.uri || null,
      });

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

      await setDoc(doc(db, 'Users', user.uid), userData);

      Alert.alert(
        t('account_created_title'),
        t('account_created_message'),
        [{text: t('ok'), onPress: () => navigation.replace('Login')}],
      );
    } catch (err) {
      console.error('Signup error:', err);

      let errorMessage = t('signup_failed');

      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = t('email_already_in_use');
          break;
        case 'auth/invalid-email':
          errorMessage = t('invalid_email_address');
          break;
        case 'auth/weak-password':
          errorMessage = t('weak_password');
          break;
        case 'auth/network-request-failed':
          errorMessage = t('network_error');
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
                {t('create_account')}
              </Text>
              <Text className="text-gray-400 text-base">
                {t('join_servenest_subtitle')}
              </Text>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm my-1">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="person" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={fullNameRef}
                  placeholder={t('full_name')}
                  placeholderTextColor="#9CA3AF"
                  value={formData.fullName}
                  onChangeText={text => updateFormData('fullName', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  autoCapitalize="words"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  onFocus={() => handleInputFocus(fullNameRef)}
                />
              </View>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm my-1">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="email" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={emailRef}
                  placeholder={t('email_address')}
                  placeholderTextColor="#9CA3AF"
                  value={formData.email}
                  onChangeText={text => updateFormData('email', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  onFocus={() => handleInputFocus(emailRef)}
                />
              </View>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm my-1">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="phone" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={phoneRef}
                  placeholder={t('phone_number')}
                  placeholderTextColor="#9CA3AF"
                  value={formData.phoneNumber}
                  onChangeText={text => updateFormData('phoneNumber', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onFocus={() => handleInputFocus(phoneRef)}
                />
              </View>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm my-1">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="lock" size={20} color="#689F38" />
                </View>
  <TextInput
    ref={passwordRef}
    placeholder={t('password')}
    placeholderTextColor="#9CA3AF"
    value={formData.password}
    onChangeText={text => updateFormData('password', text)}
    className="flex-1 text-gray-700 text-base font-medium"
    secureTextEntry={!passwordVisible}
    returnKeyType="next"
    blurOnSubmit={false}
    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
    onFocus={() => handleInputFocus(passwordRef)}
  />
  <TouchableOpacity onPress={() => setPasswordVisible(v => !v)}>
    <Icon name={passwordVisible ? "visibility-off" : "visibility"} size={22} color="#9CA3AF" />
  </TouchableOpacity>

              </View>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="lock" size={20} color="#689F38" />
                </View>
  <TextInput
    ref={confirmPasswordRef}
    placeholder={t('confirm_password')}
    placeholderTextColor="#9CA3AF"
    value={formData.confirmPassword}
    onChangeText={text => updateFormData('confirmPassword', text)}
    className="flex-1 text-gray-700 text-base font-medium"
    secureTextEntry={!confirmPasswordVisible}
    returnKeyType="done"
    onSubmitEditing={() => Keyboard.dismiss()}
    onFocus={() => handleInputFocus(confirmPasswordRef, 100)}
  />
  <TouchableOpacity onPress={() => setConfirmPasswordVisible(v => !v)}>
    <Icon name={confirmPasswordVisible ? "visibility-off" : "visibility"} size={22} color="#9CA3AF" />
  </TouchableOpacity>

              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View className="space-y-5">
            <View className="text-center mb-8">
              <Text className="text-3xl font-bold text-gray-700 mb-2">
                {t('personal_details')}
              </Text>
              <Text className="text-gray-400 text-base">
                {t('personalize_experience')}
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
                      {t('add_photo')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text className="text-gray-400 text-sm mt-3">
                {t('optional_profile_picture')}
              </Text>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <Text className="text-gray-700 font-bold text-lg mb-4">
                {t('gender')}
              </Text>
              <View className="flex-row flex-wrap">
                {genderOptions.map(option => (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => updateFormData('gender', option.key)}
                    className={`px-6 py-3 rounded-full mr-3 mb-3 ${
                      formData.gender === option.key ? 'bg-primary' : 'bg-gray-100'
                    }`}>
                    <Text
                      className={`font-medium ${
                        formData.gender === option.key
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}>
                      {option.label}
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
                {t('location_details')}
              </Text>
              <Text className="text-gray-400 text-base">
                {t('show_nearby_services')}
              </Text>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="location-city" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={cityRef}
                  placeholder={t('city')}
                  placeholderTextColor="#9CA3AF"
                  value={formData.city}
                  onChangeText={text => updateFormData('city', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => stateRef.current?.focus()}
                  onFocus={() => handleInputFocus(cityRef)}
                />
              </View>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="map" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={stateRef}
                  placeholder={t('state')}
                  placeholderTextColor="#9CA3AF"
                  value={formData.state}
                  onChangeText={text => updateFormData('state', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => pinCodeRef.current?.focus()}
                  onFocus={() => handleInputFocus(stateRef)}
                />
              </View>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <View className="flex-row items-center">
                <View className="bg-primary-light rounded-full p-3 mr-4">
                  <Icon name="pin-drop" size={20} color="#689F38" />
                </View>
                <TextInput
                  ref={pinCodeRef}
                  placeholder={t('pin_code')}
                  placeholderTextColor="#9CA3AF"
                  value={formData.pinCode}
                  onChangeText={text => updateFormData('pinCode', text)}
                  className="flex-1 text-gray-700 text-base font-medium"
                  keyboardType="numeric"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  onFocus={() => handleInputFocus(pinCodeRef, 150)}
                />
              </View>
            </View>

            <View className="bg-primary-light bg-opacity-30 rounded-2xl p-5 border border-primary border-opacity-30">
              <View className="flex-row items-center">
                <Icon name="info" size={20} color="#689F38" />
                <Text className="text-primary-dark text-sm ml-3 flex-1">
                  {t('verification_email_info')}
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
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      style={{ flex: 1 }}>
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingVertical: 40,
            paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 150,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          nestedScrollEnabled={true}>
          
          <View className="items-center mb-8 mt-6">
            <View className="bg-primary-light rounded-full p-5 mb-5 shadow-md">
              <Icon name="person-add" size={40} color="#689F38" />
            </View>
            <Text className="text-gray-700 font-bold text-3xl mb-2">
              {t('join_servenest')}
            </Text>
            <Text className="text-gray-400 text-base text-center px-4">
              {t('create_account_subtitle')}
            </Text>
          </View>

          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-gray-700 font-bold text-lg">
                  {t('step_of', {current: currentStep, total: 3})}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {currentStep === 1
                    ? t('basic_information')
                    : currentStep === 2
                    ? t('personal_details')
                    : t('location_finish')}
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
              {[t('basic'), t('personal'), t('location')].map((label, index) => (
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

          <View className="flex-row justify-between mt-8 mb-6">
            {currentStep > 1 && (
              <TouchableOpacity
                onPress={prevStep}
                className="bg-gray-200 rounded-2xl px-8 py-4 flex-1 mr-3">
                <Text className="text-gray-700 font-bold text-center text-base">
                  {t('previous')}
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
                  {currentStep === 3 ? t('create_account') : t('next')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-400">{t('already_have_account')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text className="text-primary font-bold">{t('login')}</Text>
            </TouchableOpacity>
          </View>

          {/* Extra space for keyboard */}
          <View className="h-20" />
        </ScrollView>
      </TouchableWithoutFeedback>

      <Modal
        visible={imagePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImagePickerVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-2xl p-6 w-11/12 max-w-sm">
            <Text className="text-gray-700 font-bold text-xl mb-6 text-center">
              {t('select_profile_picture')}
            </Text>
            <View className="space-y-4">
              <TouchableOpacity
                onPress={() => handleImagePicker('camera')}
                className="bg-primary-light rounded-xl p-4 flex-row items-center">
                <View className="bg-primary rounded-full p-3 mr-4">
                  <Icon name="camera-alt" size={20} color="#FFFFFF" />
                </View>
                <Text className="text-primary-dark font-medium text-base">
                  {t('take_photo')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleImagePicker('gallery')}
                className="bg-primary-light rounded-xl p-4 flex-row items-center">
                <View className="bg-primary rounded-full p-3 mr-4">
                  <Icon name="photo-library" size={20} color="#FFFFFF" />
                </View>
                <Text className="text-primary-dark font-medium text-base">
                  {t('choose_from_gallery')}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setImagePickerVisible(false)}
              className="bg-gray-200 rounded-xl p-4 mt-6">
              <Text className="text-gray-700 font-bold text-center">
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
