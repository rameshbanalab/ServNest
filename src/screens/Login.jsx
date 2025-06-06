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

// Hybrid Firebase imports
import auth from '@react-native-firebase/auth'; // React Native Firebase for Auth
import {db} from '../config/firebaseConfig'; // Firebase Web SDK for Firestore
import {doc, getDoc, setDoc} from 'firebase/firestore';

// Phone Auth Service
import {PhoneAuthService} from './services/phoneAuthService';

export default function Login({route}) {
  const navigation = useNavigation();
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
      const token = user.uid;
      await AsyncStorage.setItem('authToken', token);

      // Use Firebase Web SDK for Firestore operations
      const userDocRef = doc(db, 'Users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.isAdmin === true) {
          navigation.replace('Admin');
        } else {
          navigation.replace('Main');
        }
      } else {
        // Create user document for phone auth users
        if (loginMethod === 'phone') {
          await setDoc(userDocRef, {
            uid: user.uid,
            phoneNumber: user.phoneNumber,
            emailVerified: false,
            createdAt: new Date().toISOString(),
            isActive: true,
            loginMethod: 'phone',
          });
        }
        navigation.replace('Main');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      navigation.replace('Main');
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
              Welcome to ServeNest
            </Text>
            <Text className="text-gray-400 text-base text-center px-4">
              Sign in to access your personalized services and exclusive
              features
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
                  Email Login
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
                  Phone OTP
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
                      placeholder="Email Address"
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
                      placeholder="Password"
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
                    Forgot Password?
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
                      Sign In with Email
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
                      placeholder="Phone Number"
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
                      Send OTP
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Sign Up Link */}
          <View className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <Text className="text-gray-600 text-center text-sm mb-4">
              Don't have an account?
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Signup')}
              className="bg-gray-100 rounded-2xl px-8 py-4 border border-gray-200">
              <Text className="text-gray-700 font-bold text-center text-base">
                Create New Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View className="bg-primary-light bg-opacity-30 rounded-2xl p-6 border border-primary border-opacity-30">
            <View className="flex-row items-center">
              <Icon name="info" size={20} color="#689F38" />
              <Text className="text-primary-dark text-sm ml-3 flex-1">
                {loginMethod === 'email'
                  ? 'Your account must be verified via email before you can access all features.'
                  : 'We will send you a one-time password to verify your phone number.'}
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
                Enter OTP
              </Text>
              <Text className="text-gray-500 text-sm text-center">
                We've sent a 6-digit code to{' '}
                <Text className="font-semibold">+91{phoneNumber}</Text>
              </Text>
            </View>

            {/* OTP Input */}
            <View className="bg-gray-50 rounded-2xl p-5 border border-gray-200 mb-4">
              <TextInput
                placeholder="Enter 6-digit OTP"
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
                  ? `Resend in ${otpTimer}s`
                  : "Didn't receive OTP?"}
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
                    Resend
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
                  Verify OTP
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
                Cancel
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
              Verify Your Email
            </Text>
            <Text className="text-gray-500 text-base text-center mb-4">
              Please check your email inbox and click the verification link to
              activate your account.
            </Text>
            <TouchableOpacity
              onPress={handleResendVerification}
              disabled={resending}
              className="bg-primary rounded-2xl px-8 py-4 shadow-md mb-3 w-full">
              {resending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-center text-base">
                  Resend Verification Email
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowVerifyModal(false)}
              className="bg-gray-200 rounded-2xl px-8 py-4 w-full">
              <Text className="text-gray-700 font-bold text-center text-base">
                Back to Login
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
                    Reset Password
                  </Text>
                  <Text className="text-gray-500 text-sm text-center">
                    Enter your email address and we'll send you a password reset
                    link
                  </Text>
                </View>

                <View className="bg-gray-50 rounded-2xl p-5 border border-gray-200 mb-6">
                  <View className="flex-row items-center">
                    <View className="bg-primary-light rounded-full p-3 mr-4">
                      <Icon name="email" size={20} color="#689F38" />
                    </View>
                    <TextInput
                      placeholder="Enter your email"
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
                      Send Reset Email
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={closeForgotPasswordModal}
                  className="bg-gray-200 rounded-2xl p-4">
                  <Text className="text-gray-700 font-bold text-center text-base">
                    Cancel
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
                    Email Sent!
                  </Text>
                  <Text className="text-gray-500 text-sm text-center">
                    Password reset email has been sent to{' '}
                    <Text className="font-semibold text-gray-700">
                      {resetEmail}
                    </Text>
                  </Text>
                </View>

                <View className="bg-primary-light bg-opacity-30 rounded-xl p-4 mb-6">
                  <Text className="text-primary-dark text-sm text-center">
                    Please check your email inbox and spam folder. Click the
                    link in the email to reset your password.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={closeForgotPasswordModal}
                  className="bg-primary rounded-2xl p-4">
                  <Text className="text-white font-bold text-center text-base">
                    Back to Login
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
