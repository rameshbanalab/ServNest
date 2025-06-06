import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {auth, db} from '../config/firebaseConfig';
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import {doc, getDoc, updateDoc} from 'firebase/firestore';

export default function Profile() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // User data state
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    city: '',
    state: '',
    pinCode: '',
    profilePicture: null,
  });

  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  // Image picker modal
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  // Password change modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const genderOptions = ['Male', 'Female', 'Other'];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'Users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            fullName: data.fullName || '',
            email: data.email || user.email || '',
            phoneNumber: data.phoneNumber || '',
            gender: data.gender || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            pinCode: data.address?.pinCode || '',
            profilePicture: data.profilePicture || null,
          });
          setEditData({
            fullName: data.fullName || '',
            phoneNumber: data.phoneNumber || '',
            gender: data.gender || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            pinCode: data.address?.pinCode || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
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
        const newImage = {
          uri: response.assets[0].uri,
          base64: response.assets[0].base64,
        };
        setUserData(prev => ({...prev, profilePicture: newImage}));
        updateProfilePicture(newImage);
      }
      setImagePickerVisible(false);
    };

    if (type === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  const updateProfilePicture = async imageData => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, {photoURL: imageData.uri});
        await updateDoc(doc(db, 'Users', user.uid), {
          profilePicture: imageData.base64,
        });
        setSuccess('Profile picture updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      setError('Failed to update profile picture');
    }
  };

  const handleSaveProfile = async () => {
    setUpdating(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, {
          displayName: editData.fullName,
        });

        await updateDoc(doc(db, 'Users', user.uid), {
          fullName: editData.fullName,
          phoneNumber: editData.phoneNumber,
          gender: editData.gender,
          address: {
            city: editData.city,
            state: editData.state,
            pinCode: editData.pinCode,
          },
        });

        setUserData(prev => ({...prev, ...editData}));
        setEditMode(false);
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (user) {
        const credential = EmailAuthProvider.credential(
          user.email,
          passwordData.currentPassword,
        );
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwordData.newPassword);

        setPasswordModalVisible(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setSuccess('Password updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
      } else {
        setError('Failed to update password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth.signOut();
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem("userRole");
            navigation.replace('Landing');
          } catch (error) {
            console.error('Error during logout:', error);
          }
        },
      },
    ]);
  };

  // Add this useEffect to set header options
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setEditMode(!editMode)}
          style={{
            backgroundColor: '#689F38',
            borderRadius: 20,
            padding: 8,
            marginRight: 10,
          }}>
          <Icon name={editMode ? 'close' : 'edit'} size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, editMode]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="text-gray-700 text-base mt-4">Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        className="flex-1 px-6 py-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 50}}>
        {/* Success Message */}
        {success ? (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex-row items-center">
            <Icon name="check-circle" size={20} color="#16A34A" />
            <Text className="ml-3 text-green-700 font-medium text-sm flex-1">
              {success}
            </Text>
          </View>
        ) : null}

        {/* Error Message */}
        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex-row items-center">
            <Icon name="error" size={20} color="#DC2626" />
            <Text className="ml-3 text-red-700 font-medium text-sm flex-1">
              {error}
            </Text>
          </View>
        ) : null}

        {/* Profile Picture Section */}
        <View className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
          <Text className="text-gray-700 font-bold text-lg mb-4">
            Profile Picture
          </Text>
          <View className="items-center">
            <TouchableOpacity
              onPress={() => setImagePickerVisible(true)}
              className="w-32 h-32 rounded-full bg-gray-100 items-center justify-center border-4 border-dashed border-gray-300 shadow-sm">
              {userData.profilePicture ? (
                <Image
                  source={{
                    uri:
                      userData.profilePicture.uri ||
                      `data:image/jpeg;base64,${userData.profilePicture}`,
                  }}
                  className="w-full h-full rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <>
                  <Icon name="camera-alt" size={32} color="#8BC34A" />
                  <Text className="text-gray-400 text-sm mt-2">Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
            <Text className="text-gray-400 text-sm mt-3">
              Tap to change profile picture
            </Text>
          </View>
        </View>

        {/* Personal Information */}
        <View className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-700 font-bold text-lg">
              Personal Information
            </Text>
            {!editMode && (
              <TouchableOpacity
                onPress={() => setEditMode(!editMode)}
                className="bg-primary-light rounded-full px-4 py-2">
                <Text className="text-primary-dark font-medium text-sm">
                  Edit
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Full Name */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm mb-2">Full Name</Text>
            {editMode ? (
              <TextInput
                value={editData.fullName}
                onChangeText={text =>
                  setEditData(prev => ({...prev, fullName: text}))
                }
                className="bg-gray-50 rounded-xl p-4 text-gray-700 border border-gray-200"
                placeholder="Enter your full name"
              />
            ) : (
              <Text className="text-gray-800 text-base font-medium">
                {userData.fullName || 'Not provided'}
              </Text>
            )}
          </View>

          {/* Email (Read-only) */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm mb-2">Email Address</Text>
            <Text className="text-gray-800 text-base font-medium">
              {userData.email}
            </Text>
          </View>

          {/* Phone Number */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm mb-2">Phone Number</Text>
            {editMode ? (
              <TextInput
                value={editData.phoneNumber}
                onChangeText={text =>
                  setEditData(prev => ({...prev, phoneNumber: text}))
                }
                className="bg-gray-50 rounded-xl p-4 text-gray-700 border border-gray-200"
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text className="text-gray-800 text-base font-medium">
                {userData.phoneNumber || 'Not provided'}
              </Text>
            )}
          </View>

          {/* Gender */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm mb-2">Gender</Text>
            {editMode ? (
              <View className="flex-row flex-wrap">
                {genderOptions.map(gender => (
                  <TouchableOpacity
                    key={gender}
                    onPress={() => setEditData(prev => ({...prev, gender}))}
                    className={`px-4 py-2 rounded-full mr-3 mb-2 ${
                      editData.gender === gender ? 'bg-primary' : 'bg-gray-100'
                    }`}>
                    <Text
                      className={`font-medium ${
                        editData.gender === gender
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}>
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text className="text-gray-800 text-base font-medium">
                {userData.gender || 'Not provided'}
              </Text>
            )}
          </View>
        </View>

        {/* Address Information */}
        <View className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
          <Text className="text-gray-700 font-bold text-lg mb-4">
            Address Information
          </Text>

          {/* City */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm mb-2">City</Text>
            {editMode ? (
              <TextInput
                value={editData.city}
                onChangeText={text =>
                  setEditData(prev => ({...prev, city: text}))
                }
                className="bg-gray-50 rounded-xl p-4 text-gray-700 border border-gray-200"
                placeholder="Enter your city"
              />
            ) : (
              <Text className="text-gray-800 text-base font-medium">
                {userData.city || 'Not provided'}
              </Text>
            )}
          </View>

          {/* State */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm mb-2">State</Text>
            {editMode ? (
              <TextInput
                value={editData.state}
                onChangeText={text =>
                  setEditData(prev => ({...prev, state: text}))
                }
                className="bg-gray-50 rounded-xl p-4 text-gray-700 border border-gray-200"
                placeholder="Enter your state"
              />
            ) : (
              <Text className="text-gray-800 text-base font-medium">
                {userData.state || 'Not provided'}
              </Text>
            )}
          </View>

          {/* Pin Code */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm mb-2">Pin Code</Text>
            {editMode ? (
              <TextInput
                value={editData.pinCode}
                onChangeText={text =>
                  setEditData(prev => ({...prev, pinCode: text}))
                }
                className="bg-gray-50 rounded-xl p-4 text-gray-700 border border-gray-200"
                placeholder="Enter your pin code"
                keyboardType="numeric"
                maxLength={6}
              />
            ) : (
              <Text className="text-gray-800 text-base font-medium">
                {userData.pinCode || 'Not provided'}
              </Text>
            )}
          </View>
        </View>

        {/* Save Button (Edit Mode) */}
        {editMode && (
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={updating}
            className="bg-primary rounded-2xl px-8 py-5 shadow-lg mb-6"
            style={{
              shadowColor: '#8BC34A',
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}>
            {updating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-center text-base">
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <View className="space-y-4">
          <TouchableOpacity
            onPress={() => setPasswordModalVisible(true)}
            className="bg-white rounded-2xl px-8 py-4 border border-gray-200 shadow-sm">
            <Text className="text-gray-700 font-bold text-center text-base">
              Change Password
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-500 rounded-2xl px-8 py-4 shadow-lg">
            <Text className="text-white font-bold text-center text-base">
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image Picker Modal */}
        <Modal
          visible={imagePickerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImagePickerVisible(false)}>
          <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
            <View className="bg-white rounded-3xl p-8 w-11/12 max-w-sm shadow-2xl">
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

        {/* Password Change Modal */}
        <Modal
          visible={passwordModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPasswordModalVisible(false)}>
          <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
            <View className="bg-white rounded-3xl p-8 w-11/12 max-w-sm shadow-2xl">
              <Text className="text-gray-700 font-bold text-xl mb-6 text-center">
                Change Password
              </Text>

              <View className="space-y-4">
                <TextInput
                  placeholder="Current Password"
                  placeholderTextColor="#9CA3AF"
                  value={passwordData.currentPassword}
                  onChangeText={text =>
                    setPasswordData(prev => ({...prev, currentPassword: text}))
                  }
                  className="bg-gray-50 rounded-xl p-4 text-gray-700 border border-gray-200"
                  secureTextEntry
                />

                <TextInput
                  placeholder="New Password"
                  placeholderTextColor="#9CA3AF"
                  value={passwordData.newPassword}
                  onChangeText={text =>
                    setPasswordData(prev => ({...prev, newPassword: text}))
                  }
                  className="bg-gray-50 rounded-xl p-4 text-gray-700 border border-gray-200"
                  secureTextEntry
                />

                <TextInput
                  placeholder="Confirm New Password"
                  placeholderTextColor="#9CA3AF"
                  value={passwordData.confirmPassword}
                  onChangeText={text =>
                    setPasswordData(prev => ({...prev, confirmPassword: text}))
                  }
                  className="bg-gray-50 rounded-xl p-4 text-gray-700 border border-gray-200"
                  secureTextEntry
                />
              </View>

              <View className="space-y-3 mt-6">
                <TouchableOpacity
                  onPress={handlePasswordChange}
                  disabled={passwordLoading}
                  className="bg-primary rounded-2xl p-4">
                  {passwordLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-bold text-center text-base">
                      Update Password
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setPasswordModalVisible(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setError('');
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
