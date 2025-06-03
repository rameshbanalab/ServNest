import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';

export default function Login() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth().signInWithEmailAndPassword(email, password);
      navigation.navigate('Main'); // Navigate to Home after successful login
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View
        className="flex-1 justify-center p-6"
        style={{opacity: fadeAnim}}>
        {/* Header */}
        <View className="items-center mb-8">
          <View className="bg-primary-light rounded-full p-4 mb-3 shadow-md">
            <Icon name="lock-outline" size={50} color="#8BC34A" />
          </View>
          <Text className="text-primary-dark font-bold text-3xl">
            Welcome Back
          </Text>
          <Text className="text-gray-600 text-base mt-2">
            Sign in to continue
          </Text>
        </View>

        {/* Error Message */}
        {error ? (
          <View className="bg-red-100 rounded-lg p-3 mb-6">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        ) : null}

        {/* Input Fields */}
        <View className="space-y-5 mb-6">
          <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <View className="flex-row items-center">
              <Icon
                name="email-outline"
                size={20}
                color="#8BC34A"
                className="mr-2"
              />
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                className="flex-1 text-gray-800 text-base"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
          <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <View className="flex-row items-center">
              <Icon
                name="lock-outline"
                size={20}
                color="#8BC34A"
                className="mr-2"
              />
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                className="flex-1 text-gray-800 text-base"
                secureTextEntry
              />
            </View>
          </View>
        </View>

        {/* Forgot Password */}
        <TouchableOpacity className="self-end mb-6">
          <Text className="text-primary font-medium">Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          className="bg-primary rounded-xl p-4 shadow-md"
          onPress={handleLogin}
          disabled={loading}>
          <Text className="text-white font-bold text-lg text-center">
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>

        {/* Sign Up Prompt */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600">Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text className="text-primary font-bold ml-1">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
