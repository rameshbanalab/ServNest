/* eslint-disable no-catch-shadow */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {updateDoc} from 'firebase/firestore';

import {triggerAuthCheck} from '../navigation/RootNavigation';

// Hybrid Firebase imports
import auth from '@react-native-firebase/auth'; // React Native Firebase for Auth
import {db} from '../config/firebaseConfig'; // Firebase Web SDK for Firestore
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {useTranslation} from 'react-i18next';
// Phone Auth Service
import {PhoneAuthService} from './services/phoneAuthService';

export default function Login({route}) {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const {setIsLoggedIn} = route.params || {};

  // Form states
  const [formData, setFormData] = useState({email: '', password: ''});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login method toggle
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'

  // Phone Auth states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // Email verification states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [resending, setResending] = useState(false);

  // Forgot password states
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // OTP Timer effect
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(timer => timer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      PhoneAuthService.cleanup();
    };
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(user => {
      if (user && user.emailVerified && setIsLoggedIn) {
        setIsLoggedIn(true);
      }
    });
    return () => unsubscribe();
  }, [setIsLoggedIn]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
    setError('');
  };

  const validateForm = () => {
    if (loginMethod === 'email') {
      if (!formData.email.trim()) return 'Email is required';
      if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Invalid email format';
      if (!formData.password) return 'Password is required';
    } else {
      if (!phoneNumber.trim()) return 'Phone number is required';
      if (phoneNumber.length < 10) return 'Invalid phone number';
    }
    return null;
  };

  const handleSuccessfulLogin = async user => {
    try {
      console.log('🔄 Starting successful login process for:', user.uid);
      setLoading(true);

      // ✅ Store token (user ID) in AsyncStorage
      const token = user.uid;
      await AsyncStorage.setItem('authToken', token);
      console.log('💾 Token stored successfully');

      // ✅ Check user document from Firestore
      const userDocRef = doc(db, 'Users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('📄 User data retrieved:', {
          uid: user.uid,
          isAdmin: userData.isAdmin,
          role: userData.role,
          isActive: userData.isActive,
          fullName: userData.fullName,
        });

        // ✅ Check if user account is active
        if (userData.isActive === false) {
          console.log('❌ User account is inactive');
          await AsyncStorage.multiRemove(['authToken', 'userRole']);
          Alert.alert(
            'Account Inactive',
            'Your account has been deactivated. Please contact support.',
            [{text: 'OK'}],
          );
          setLoading(false);
          return;
        }

        // ✅ Set admin role in AsyncStorage if admin
        if (userData.isAdmin === true || userData.role === 'admin') {
          await AsyncStorage.setItem('userRole', 'admin');
          console.log('👑 Admin role set successfully');
        } else {
          await AsyncStorage.removeItem('userRole');
          console.log('👤 Regular user confirmed');
        }

        // ✅ Update user's last login timestamp
        try {
          await updateDoc(userDocRef, {
            lastLogin: new Date().toISOString(),
            lastLoginMethod: loginMethod || 'email',
          });
          console.log('📅 Last login timestamp updated');
        } catch (updateError) {
          console.warn('⚠️ Failed to update last login:', updateError);
          // Don't fail login for this
        }
      } else {
        console.log('📄 No user document found');

        // ✅ For phone auth users, create user document
        if (loginMethod === 'phone') {
          console.log('📱 Creating user document for phone auth');
          try {
            await setDoc(userDocRef, {
              uid: user.uid,
              phoneNumber: user.phoneNumber,
              fullName: user.displayName || '',
              email: user.email || '',
              emailVerified: user.emailVerified || false,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              isActive: true,
              loginMethod: 'phone',
              isAdmin: false,
              role: 'user',
              profilePicture: user.photoURL || null,
            });
            console.log('📄 User document created for phone auth');

            // Ensure no admin role for new phone users
            await AsyncStorage.removeItem('userRole');
          } catch (createError) {
            console.error('❌ Error creating user document:', createError);
            // Continue with login even if document creation fails
          }
        } else {
          // ✅ For email auth users without document, create basic document
          console.log('📧 Creating user document for email auth');
          try {
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              fullName: user.displayName || '',
              phoneNumber: user.phoneNumber || '',
              emailVerified: user.emailVerified || false,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              isActive: true,
              loginMethod: 'email',
              isAdmin: false,
              role: 'user',
              profilePicture: user.photoURL || null,
            });
            console.log('📄 User document created for email auth');
          } catch (createError) {
            console.error('❌ Error creating user document:', createError);
          }

          // Ensure no admin role for new users
          await AsyncStorage.removeItem('userRole');
        }
      }

      // ✅ Clear any previous error states
      setError('');

      console.log('✅ Login process completed successfully');
      console.log(
        '🎯 RootNavigation will handle routing based on token and role',
      );

      // ✅ Optional: Show success message
      // Alert.alert('Success', 'Login successful!', [{text: 'OK'}]);
      setTimeout(() => {
        triggerAuthCheck();
      }, 100);
    } catch (error) {
      console.error('❌ Error in successful login:', error);

      // ✅ Clean up on error
      try {
        await AsyncStorage.multiRemove(['authToken', 'userRole', 'userInfo']);
      } catch (cleanupError) {
        console.error('❌ Error cleaning up after failed login:', cleanupError);
      }

      // ✅ Show user-friendly error message
      let errorMessage = 'Failed to complete login process. Please try again.';

      if (error.code === 'firestore/permission-denied') {
        errorMessage = 'Access denied. Please check your account permissions.';
      } else if (error.code === 'firestore/unavailable') {
        errorMessage =
          'Service temporarily unavailable. Please try again later.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      Alert.alert('Login Error', errorMessage, [{text: 'OK'}]);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Email login using React Native Firebase
  const handleEmailLogin = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await auth().signInWithEmailAndPassword(
        formData.email,
        formData.password,
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        setShowVerifyModal(true);
        await auth().signOut();
        return;
      }

      await handleSuccessfulLogin(user);
    } catch (err) {
      let errorMessage = 'Failed to login. Please try again.';

      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'auth/invalid-credential':
          errorMessage =
            'Invalid credentials. Please check your email and password.';
          break;
        default:
          errorMessage =
            err.message || 'An unexpected error occurred. Please try again.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Phone OTP login using React Native Firebase
  const handlePhoneLogin = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSendingOTP(true);
    setError('');

    try {
      const result = await PhoneAuthService.sendOTP(phoneNumber);

      if (result.success) {
        setConfirmationResult(result.confirmationResult);
        setShowOTPModal(true);
        setOtpTimer(60);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleOTPVerification = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setOtpLoading(true);
    setError('');

    try {
      const result = await PhoneAuthService.verifyOTP(
        confirmationResult,
        otpCode,
      );

      if (result.success) {
        setShowOTPModal(false);
        await handleSuccessfulLogin(result.user);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('OTP verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpTimer > 0) return;

    setSendingOTP(true);
    try {
      const result = await PhoneAuthService.sendOTP(phoneNumber);

      if (result.success) {
        setConfirmationResult(result.confirmationResult);
        setOtpTimer(60);
        setOtpCode('');
        Alert.alert('OTP Sent', 'A new OTP has been sent to your phone.');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to resend OTP.');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const userCredential = await auth().signInWithEmailAndPassword(
        formData.email,
        formData.password,
      );
      const user = userCredential.user;
      await auth().sendEmailVerification(user);
      Alert.alert(
        'Verification Sent',
        'A new verification email has been sent. Please check your inbox and spam folder.',
      );
      await auth().signOut();
    } catch (err) {
      Alert.alert(
        'Error',
        'Could not resend verification email. Please check your credentials or try again later.',
      );
    }
    setResending(false);
  };

  const handleForgotPassword = () => {
    setResetEmail(formData.email);
    setShowForgotPasswordModal(true);
    setResetSuccess(false);
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setResetLoading(true);

    try {
      await auth().sendPasswordResetEmail(resetEmail);
      setResetSuccess(true);
    } catch (err) {
      let errorMessage = 'Failed to send password reset email.';

      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        default:
          errorMessage = err.message || errorMessage;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setResetEmail('');
    setResetSuccess(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        className="flex-1 px-6 py-10"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 50}}>
        <View className="space-y-6">
          {/* Welcome Section */}
          <View className="items-center mb-8 mt-10">
            <View className="bg-primary-light rounded-full p-5 mb-5 shadow-md">
              <Icon name="lock-outline" size={40} color="#689F38" />
            </View>
            <Text className="text-gray-700 font-bold text-3xl mb-2">
              {t('welcome_title')}
            </Text>
            <Text className="text-gray-400 text-base text-center px-4">
              {t('welcome_subtitle')}
            </Text>
          </View>

          {/* Login Method Toggle */}
          <View className="bg-white rounded-2xl p-2 border border-gray-200 shadow-sm mb-4">
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => {
                  setLoginMethod('email');
                  setError('');
                }}
                className={`flex-1 py-3 rounded-xl ${
                  loginMethod === 'email' ? 'bg-primary' : 'bg-transparent'
                }`}>
                <Text
                  className={`text-center font-bold ${
                    loginMethod === 'email' ? 'text-white' : 'text-gray-600'
                  }`}>
                  {t('email_login')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setLoginMethod('phone');
                  setError('');
                }}
                className={`flex-1 py-3 rounded-xl ${
                  loginMethod === 'phone' ? 'bg-primary' : 'bg-transparent'
                }`}>
                <Text
                  className={`text-center font-bold ${
                    loginMethod === 'phone' ? 'text-white' : 'text-gray-600'
                  }`}>
                  {t('phone_otp')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 flex-row items-center">
              <Icon name="error" size={20} color="#DC2626" />
              <Text className="ml-3 text-red-700 font-medium text-sm flex-1">
                {error}
              </Text>
            </View>
          ) : null}

          {/* Login Form */}
          <View className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            {loginMethod === 'email' ? (
              // Email Login Form
              <>
                {/* Email Input */}
                <View className="bg-gray-50 rounded-2xl p-5 border border-gray-200 mb-4">
                  <View className="flex-row items-center">
                    <View className="bg-primary-light rounded-full p-3 mr-4">
                      <Icon name="email" size={20} color="#689F38" />
                    </View>
                    <TextInput
                      placeholder={t('email_placeholder')}
                      placeholderTextColor="#9CA3AF"
                      value={formData.email}
                      onChangeText={text => updateFormData('email', text)}
                      className="flex-1 text-gray-700 text-base font-medium"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View className="bg-gray-50 rounded-2xl p-5 border border-gray-200 mb-6">
                  <View className="flex-row items-center">
                    <View className="bg-primary-light rounded-full p-3 mr-4">
                      <Icon name="lock" size={20} color="#689F38" />
                    </View>
                    <TextInput
                      placeholder={t('password_placeholder')}
                      placeholderTextColor="#9CA3AF"
                      value={formData.password}
                      onChangeText={text => updateFormData('password', text)}
                      className="flex-1 text-gray-700 text-base font-medium"
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="p-2">
                      <Icon
                        name={showPassword ? 'visibility-off' : 'visibility'}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Forgot Password Link */}
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  className="items-end mb-6">
                  <Text className="text-primary font-semibold text-sm">
                    {t('forgot_password')}
                  </Text>
                </TouchableOpacity>

                {/* Email Login Button */}
                <TouchableOpacity
                  onPress={handleEmailLogin}
                  disabled={loading}
                  className="bg-primary rounded-2xl px-8 py-5 shadow-lg"
                  style={{
                    shadowColor: '#8BC34A',
                    shadowOffset: {width: 0, height: 4},
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-bold text-center text-base">
                      {t('sign_in_email')}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              // Phone Login Form
              <>
                {/* Phone Input */}
                <View className="bg-gray-50 rounded-2xl p-5 border border-gray-200 mb-6">
                  <View className="flex-row items-center">
                    <View className="bg-primary-light rounded-full p-3 mr-4">
                      <Icon name="phone" size={20} color="#689F38" />
                    </View>
                    <Text className="text-gray-600 font-medium mr-2">+91</Text>
                    <TextInput
                      placeholder={t('phone_placeholder')}
                      placeholderTextColor="#9CA3AF"
                      value={phoneNumber}
                      onChangeText={text => {
                        setPhoneNumber(text);
                        setError('');
                      }}
                      className="flex-1 text-gray-700 text-base font-medium"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                {/* Phone Login Button */}
                <TouchableOpacity
                  onPress={handlePhoneLogin}
                  disabled={sendingOTP}
                  className="bg-primary rounded-2xl px-8 py-5 shadow-lg"
                  style={{
                    shadowColor: '#8BC34A',
                    shadowOffset: {width: 0, height: 4},
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}>
                  {sendingOTP ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-bold text-center text-base">
                      {t('send_otp')}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Sign Up Link */}
          <View className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <Text className="text-gray-600 text-center text-sm mb-4">
              {t('no_account')}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Signup')}
              className="bg-gray-100 rounded-2xl px-8 py-4 border border-gray-200">
              <Text className="text-gray-700 font-bold text-center text-base">
                {t('create_account')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View className="bg-primary-light bg-opacity-30 rounded-2xl p-6 border border-primary border-opacity-30">
            <View className="flex-row items-center">
              <Icon name="info" size={20} color="#689F38" />
              <Text className="text-primary-dark text-sm ml-3 flex-1">
                {loginMethod === 'email' ? t('email_info') : t('phone_info')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOTPModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOTPModal(false)}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-3xl p-8 w-11/12 max-w-sm shadow-2xl">
            <View className="items-center mb-6">
              <View className="bg-primary-light rounded-full p-4 mb-4">
                <Icon name="sms" size={32} color="#689F38" />
              </View>
              <Text className="text-gray-700 font-bold text-xl mb-2">
                {t('enter_otp')}
              </Text>
              <Text className="text-gray-500 text-sm text-center">
                {t('otp_sent_message')}{' '}
                <Text className="font-semibold">+91{phoneNumber}</Text>
              </Text>
            </View>

            {/* OTP Input */}
            <View className="bg-gray-50 rounded-2xl p-5 border border-gray-200 mb-4">
              <TextInput
                placeholder={t('otp_placeholder')}
                placeholderTextColor="#9CA3AF"
                value={otpCode}
                onChangeText={setOtpCode}
                className="text-gray-700 text-center text-lg font-bold tracking-widest"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={true}
              />
            </View>

            {/* Timer and Resend */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-gray-500 text-sm">
                {otpTimer > 0
                  ? t('resend_timer', {seconds: otpTimer})
                  : t('didnt_receive_otp')}
              </Text>
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={otpTimer > 0 || sendingOTP}
                className={`px-4 py-2 rounded-lg ${
                  otpTimer > 0 ? 'bg-gray-200' : 'bg-primary'
                }`}>
                {sendingOTP ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    className={`font-medium ${
                      otpTimer > 0 ? 'text-gray-500' : 'text-white'
                    }`}>
                    {t('resend')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              onPress={handleOTPVerification}
              disabled={otpLoading || otpCode.length !== 6}
              className={`rounded-2xl py-4 mb-3 ${
                otpCode.length === 6 ? 'bg-primary' : 'bg-gray-300'
              }`}>
              {otpLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-center text-base">
                  {t('verify_otp')}
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => {
                setShowOTPModal(false);
                setOtpCode('');
                setOtpTimer(0);
              }}
              className="bg-gray-200 rounded-2xl py-4">
              <Text className="text-gray-700 font-bold text-center text-base">
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Email Verification Modal */}
      <Modal
        visible={showVerifyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVerifyModal(false)}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-3xl p-8 w-11/12 max-w-sm shadow-2xl items-center">
            <View className="bg-primary-light rounded-full p-4 mb-4">
              <Icon name="mark-email-unread" size={32} color="#689F38" />
            </View>
            <Text className="text-gray-700 font-bold text-xl mb-2 text-center">
              {t('verify_email_title')}
            </Text>
            <Text className="text-gray-500 text-base text-center mb-4">
              {t('verify_email_message')}
            </Text>
            <TouchableOpacity
              onPress={handleResendVerification}
              disabled={resending}
              className="bg-primary rounded-2xl px-8 py-4 shadow-md mb-3 w-full">
              {resending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-center text-base">
                  {t('resend_verification')}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowVerifyModal(false)}
              className="bg-gray-200 rounded-2xl px-8 py-4 w-full">
              <Text className="text-gray-700 font-bold text-center text-base">
                {t('back_to_login')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeForgotPasswordModal}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-3xl p-8 w-11/12 max-w-sm shadow-2xl">
            {!resetSuccess ? (
              <>
                <View className="items-center mb-6">
                  <View className="bg-primary-light rounded-full p-4 mb-4">
                    <Icon name="lock-reset" size={32} color="#689F38" />
                  </View>
                  <Text className="text-gray-700 font-bold text-xl mb-2">
                    {t('reset_password_title')}
                  </Text>
                  <Text className="text-gray-500 text-sm text-center">
                    {t('reset_password_message')}
                  </Text>
                </View>

                <View className="bg-gray-50 rounded-2xl p-5 border border-gray-200 mb-6">
                  <View className="flex-row items-center">
                    <View className="bg-primary-light rounded-full p-3 mr-4">
                      <Icon name="email" size={20} color="#689F38" />
                    </View>
                    <TextInput
                      placeholder={t('enter_email')}
                      placeholderTextColor="#9CA3AF"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      className="flex-1 text-gray-700 text-base font-medium"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handlePasswordReset}
                  disabled={resetLoading}
                  className="bg-primary rounded-2xl p-4 mb-3">
                  {resetLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-bold text-center text-base">
                      {t('send_reset_email')}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={closeForgotPasswordModal}
                  className="bg-gray-200 rounded-2xl p-4">
                  <Text className="text-gray-700 font-bold text-center text-base">
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View className="items-center mb-6">
                  <View className="bg-primary-light rounded-full p-4 mb-4">
                    <Icon name="check-circle" size={32} color="#689F38" />
                  </View>
                  <Text className="text-gray-700 font-bold text-xl mb-2">
                    {t('email_sent_title')}
                  </Text>
                  <Text className="text-gray-500 text-sm text-center">
                    {t('email_sent_message')}{' '}
                    <Text className="font-semibold text-gray-700">
                      {resetEmail}
                    </Text>
                  </Text>
                </View>

                <View className="bg-primary-light bg-opacity-30 rounded-xl p-4 mb-6">
                  <Text className="text-primary-dark text-sm text-center">
                    {t('check_email_instruction')}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={closeForgotPasswordModal}
                  className="bg-primary rounded-2xl p-4">
                  <Text className="text-white font-bold text-center text-base">
                    {t('back_to_login')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
