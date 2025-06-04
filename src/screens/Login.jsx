import React, {useState, useEffect} from 'react';
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
  Modal,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {auth} from '../config/firebaseConfig';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
} from 'firebase/auth';

export default function Login() {
  const navigation = useNavigation();

  // Form States
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user && user.emailVerified) {
        navigation.replace('Main');
      }
    });

    return () => unsubscribe();
  }, [navigation]);

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

      // Check if email is verified
      if (!user.emailVerified) {
        Alert.alert(
          'Email Not Verified',
          'Please verify your email before logging in. Would you like us to send another verification email?',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Resend Email',
              onPress: async () => {
                try {
                  await sendEmailVerification(user);
                  Alert.alert(
                    'Verification Email Sent',
                    'Please check your email and click the verification link.',
                  );
                } catch (error) {
                  Alert.alert('Error', 'Failed to send verification email.');
                }
              },
            },
          ],
        );
        // Sign out the user since email is not verified
        await auth.signOut();
        return;
      }

      // If email is verified, navigate to main app
      navigation.replace('Main');
    } catch (err) {
      console.error('Login error:', err);

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

  const handleForgotPassword = async () => {
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
      Alert.alert(
        'Password Reset Email Sent',
        'Please check your email for password reset instructions.',
        [
          {
            text: 'OK',
            onPress: () => {
              setForgotPasswordVisible(false);
              setResetEmail('');
            },
          },
        ],
      );
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
        default:
          errorMessage = err.message || errorMessage;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View className="bg-primary px-6 py-8 shadow-xl">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-3 rounded-full bg-primary-dark shadow-sm">
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-xl">Welcome Back</Text>
          <View className="w-12" />
        </View>

        {/* Welcome Message */}
        <View className="mt-8">
          <Text className="text-white font-bold text-2xl mb-2">Sign In</Text>
          <Text className="text-primary-light text-base opacity-90">
            Access your account to discover amazing services
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 py-8"
        showsVerticalScrollIndicator={false}>
        {/* Login Form */}
        <View className="space-y-6">
          {/* Welcome Card */}
          <View className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <View className="items-center mb-6">
              <View className="bg-primary-light rounded-full p-4 mb-4">
                <Icon name="person" size={32} color="#689F38" />
              </View>
              <Text className="text-gray-700 font-bold text-xl">
                Login to ServeNest
              </Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Enter your credentials to access your account
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-accent-red bg-opacity-10 border border-accent-red border-opacity-30 rounded-xl p-4 mb-6">
                <View className="flex-row items-center">
                  <Icon name="error" size={20} color="#D32F2F" />
                  <Text className="text-accent-red text-sm ml-3 flex-1 font-medium">
                    {error}
                  </Text>
                </View>
              </View>
            ) : null}

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
              onPress={() => setForgotPasswordVisible(true)}
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

          {/* App Info */}
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

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotPasswordVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setForgotPasswordVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-3xl p-8 w-11/12 max-w-sm shadow-2xl">
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
                onPress={handleForgotPassword}
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
                onPress={() => {
                  setForgotPasswordVisible(false);
                  setResetEmail('');
                }}
                className="bg-gray-200 rounded-2xl p-4">
                <Text className="text-gray-700 font-bold text-center text-base">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
