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
import {auth, db} from '../config/firebaseConfig';
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import {doc, getDoc} from 'firebase/firestore';

export default function Login({route}) {
  const navigation = useNavigation();
  const {setIsLoggedIn} = route.params || {};

  const [formData, setFormData] = useState({email: '', password: ''});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [resending, setResending] = useState(false);

  // Forgot Password States
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
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
    if (!formData.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Invalid email format';
    if (!formData.password) return 'Password is required';
    return null;
  };

  const handleLogin = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        setShowVerifyModal(true);
        await auth.signOut();
        return;
      }

      // Store token in AsyncStorage
      const token = user.uid;
      await AsyncStorage.setItem('authToken', token);

      // Check if user is admin by fetching user document
      try {
        const userDocRef = doc(db, 'Users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Check isAdmin field and navigate accordingly
          if (userData.isAdmin === true) {
            // User is admin - navigate to Admin interface
            navigation.replace('Admin');
          } else {
            // User is regular user - navigate to Main interface
            navigation.replace('Main');
          }
        } else {
          // User document doesn't exist, default to Main
          console.log('User document not found, defaulting to Main');
          navigation.replace('Main');
        }
      } catch (roleError) {
        console.error('Error checking user role:', roleError);
        // On error, default to Main
        navigation.replace('Main');
      }
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
        default:
          errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );
      const user = userCredential.user;
      await sendEmailVerification(user);
      Alert.alert(
        'Verification Sent',
        'A new verification email has been sent. Please check your inbox and spam folder.',
      );
      await auth.signOut();
    } catch (err) {
      Alert.alert(
        'Error',
        'Could not resend verification email. Please check your credentials or try again later.',
      );
    }
    setResending(false);
  };

  // Forgot Password Functions
  const handleForgotPassword = () => {
    setResetEmail(formData.email); // Pre-fill with login email if available
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
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);

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

          {/* Error Message */}
          {error ? (
            <View className="bg-accent-red bg-opacity-10 border border-accent-red border-opacity-30 rounded-xl p-4 flex-row items-center">
              <Icon name="error" size={20} color="#D32F2F" />
              <Text className="ml-3 text-accent-red font-medium text-sm flex-1">
                {error}
              </Text>
            </View>
          ) : null}

          {/* Login Card */}
          <View className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
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

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
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
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Additional Options */}
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
                Your account must be verified via email before you can access
                all features.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

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
              // Password Reset Form
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

                <View className="space-y-3">
                  <TouchableOpacity
                    onPress={handlePasswordReset}
                    disabled={resetLoading}
                    className="bg-primary rounded-2xl p-4">
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
                </View>
              </>
            ) : (
              // Success Message
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
