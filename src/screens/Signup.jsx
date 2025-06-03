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

export default function SignUp() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleSignUp = async () => {
    // if (!name || !email || !password || !confirmPassword) {
    //   setError('Please fill in all fields');
    //   return;
    // }
    // if (password !== confirmPassword) {
    //   setError('Passwords do not match');
    //   return;
    // }
    // setLoading(true);
    // setError('');
    // try {
    //   await auth().createUserWithEmailAndPassword(email, password);
    //   // Optionally update user profile with name
    //   await auth().currentUser.updateProfile({displayName: name});
    //   navigation.navigate('Main'); // Navigate to Home after successful sign up
    // } catch (err) {
    //   setError(err.message || 'Sign up failed. Please try again.');
    // } finally {
    //   setLoading(false);
    // }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View
        className="flex-1 justify-center p-6"
        style={{opacity: fadeAnim}}>
        {/* Header */}
        <View className="items-center mb-6">
          <View className="bg-primary-light rounded-full p-4 mb-3 shadow-md">
            <Icon name="account-plus-outline" size={50} color="#8BC34A" />
          </View>
          <Text className="text-primary-dark font-bold text-3xl">
            Create Account
          </Text>
          <Text className="text-gray-600 text-base mt-2">
            Join ServeNest today
          </Text>
        </View>

        {/* Error Message */}
        {error ? (
          <View className="bg-red-100 rounded-lg p-3 mb-6">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        ) : null}

        {/* Input Fields */}
        <View className="space-y-4 mb-6">
          <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <View className="flex-row items-center">
              <Icon
                name="account-outline"
                size={20}
                color="#8BC34A"
                className="mr-2"
              />
              <TextInput
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                className="flex-1 text-gray-800 text-base"
                autoCapitalize="words"
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
          <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <View className="flex-row items-center">
              <Icon
                name="lock-check-outline"
                size={20}
                color="#8BC34A"
                className="mr-2"
              />
              <TextInput
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                className="flex-1 text-gray-800 text-base"
                secureTextEntry
              />
            </View>
          </View>
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity
          className="bg-primary rounded-xl p-4 shadow-md"
          onPress={handleSignUp}
          disabled={loading}>
          <Text className="text-white font-bold text-lg text-center">
            {loading ? 'Creating account...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        {/* Login Prompt */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600">Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-primary font-bold ml-1">Login</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
