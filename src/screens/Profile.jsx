import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  StatusBar,
  RefreshControl,
  SafeAreaView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchImageLibrary} from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import {db} from '../config/firebaseConfig';
import {doc, getDoc, updateDoc} from 'firebase/firestore';
import {useTranslation} from 'react-i18next';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

export default function Profile() {
  const navigation = useNavigation();
  const {t} = useTranslation();

  // State management
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');

  // Enhanced formatDate function
  const formatDate = dateValue => {
    try {
      if (!dateValue) return t('profile.not_available');

      let date;
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      } else {
        return t('profile.invalid_date');
      }

      if (isNaN(date.getTime())) return t('profile.invalid_date');

      return date.toLocaleDateString('te-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return t('profile.date_unavailable');
    }
  };

  // Fetch user data
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const currentUser = auth().currentUser;

      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'Users', currentUser.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();

          let joinedDate = new Date();
          if (userData.createdAt) {
            joinedDate = userData.createdAt;
          } else if (currentUser.metadata?.creationTime) {
            joinedDate = new Date(currentUser.metadata.creationTime);
          }

          setUser({
            uid: currentUser.uid,
            name:
              userData.fullName ||
              userData.name ||
              currentUser.displayName ||
              'User',
            email: userData.email || currentUser.email || t('profile.not_available'),
            phone: userData.phoneNumber || userData.phone || t('profile.not_provided'),
            profilePicture: userData.profilePicture || currentUser.photoURL,
            joinedDate: joinedDate,
            location: userData.address
              ? `${userData.address.city}, ${userData.address.state}`
              : t('profile.not_set'),
            bio: userData.bio || t('profile.tell_about'),
            gender: userData.gender || t('profile.not_specified'),
            totalBookings: userData.totalBookings || 0,
            totalDonations: userData.totalDonations || 0,
          });
        } else {
          let joinedDate = new Date();
          if (currentUser.metadata?.creationTime) {
            joinedDate = new Date(currentUser.metadata.creationTime);
          }

          setUser({
            uid: currentUser.uid,
            name: currentUser.displayName || 'User',
            email: currentUser.email || t('profile.not_available'),
            phone: t('profile.not_provided'),
            profilePicture: currentUser.photoURL,
            joinedDate: joinedDate,
            location: t('profile.not_set'),
            bio: t('profile.tell_about'),
            gender: t('profile.not_specified'),
            totalBookings: 0,
            totalDonations: 0,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert(t('profile.error'), t('profile.failed_to_load'));
    } finally {
      setLoading(false);
    }
  };

  // Handle profile picture change with base64 conversion
  const handleProfilePictureChange = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8,
    };

    launchImageLibrary(options, async response => {
      if (response.didCancel || response.error) return;

      if (response.assets && response.assets[0]) {
        try {
          setUploadingImage(true);
          const asset = response.assets[0];

          // Convert to base64 format for display
          const base64Image = `data:${asset.type};base64,${asset.base64}`;

          // Update in Firestore
          const currentUser = auth().currentUser;
          if (currentUser) {
            await updateDoc(doc(db, 'Users', currentUser.uid), {
              profilePicture: base64Image,
            });

            setUser(prev => ({...prev, profilePicture: base64Image}));
            Alert.alert(t('profile.success'), t('profile.picture_updated'));
          }
        } catch (error) {
          console.error('Error updating profile picture:', error);
          Alert.alert(t('profile.error'), t('profile.failed_picture'));
        } finally {
          setUploadingImage(false);
        }
      }
    });
  };

  // Handle inline editing
  const startEditing = (field, currentValue) => {
    setEditingField(field);
    setTempValue(currentValue);
    setEditMode(true);
  };

  const saveEdit = async () => {
    try {
      const currentUser = auth().currentUser;
      if (currentUser && editingField && tempValue.trim()) {
        const updateData = {};

        // Map fields to Firestore structure
        switch (editingField) {
          case 'name':
            updateData.fullName = tempValue.trim();
            break;
          case 'phone':
            updateData.phoneNumber = tempValue.trim();
            break;
          case 'bio':
            updateData.bio = tempValue.trim();
            break;
          case 'location':
            updateData.address = {
              city: tempValue.trim(),
              state: '',
            };
            break;
          case 'gender':
            updateData.gender = tempValue.trim();
            break;
        }

        await updateDoc(doc(db, 'Users', currentUser.uid), updateData);

        setUser(prev => ({
          ...prev,
          [editingField]: tempValue.trim(),
        }));

        Alert.alert(t('profile.success'), t('profile.profile_updated'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(t('profile.error'), t('profile.failed_update'));
    } finally {
      setEditMode(false);
      setEditingField(null);
      setTempValue('');
    }
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditingField(null);
    setTempValue('');
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.logout_confirm'), [
      {text: t('profile.cancel'), style: 'cancel'},
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await auth().signOut();
            await AsyncStorage.removeItem('authToken');
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          } catch (error) {
            Alert.alert(t('profile.error'), 'Failed to logout');
          }
        },
      },
    ]);
  };

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="mt-4 text-gray-700">{t('profile.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <Icon name="error-outline" size={64} color="#D32F2F" />
        <Text className="mt-4 text-gray-700">{t('profile.failed_to_load')}</Text>
        <TouchableOpacity
          className="bg-primary rounded-xl px-6 py-3 mt-4"
          onPress={fetchUserData}>
          <Text className="text-white font-bold">{t('profile.retry')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8BC34A']}
            tintColor="#8BC34A"
          />
        }>
        {/* Profile Picture Section */}
        <View className="items-center pt-8 pb-6 bg-white">
          <TouchableOpacity
            onPress={() => setImageModalVisible(true)}
            className="relative">
            <View
              className="rounded-full shadow-lg"
              style={{
                width: SCREEN_WIDTH * 0.32,
                height: SCREEN_WIDTH * 0.32,
              }}>
              {user?.profilePicture ? (
                <Image
                  source={{
                    uri: user.profilePicture.startsWith('data:')
                      ? user.profilePicture
                      : `data:image/jpeg;base64,${user.profilePicture}`,
                  }}
                  className="w-full h-full rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full rounded-full bg-gray-200 items-center justify-center">
                  <Icon
                    name="camera-alt"
                    size={SCREEN_WIDTH * 0.08}
                    color="#8BC34A"
                  />
                </View>
              )}
            </View>

            {/* Camera Icon Overlay */}
            <TouchableOpacity
              onPress={handleProfilePictureChange}
              className="absolute bottom-2 right-2 bg-primary rounded-full shadow-lg"
              style={{padding: SCREEN_WIDTH * 0.02}}
              disabled={uploadingImage}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="camera-alt" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>

          {/* User Name - Editable */}
          <View className="items-center mt-4">
            {editingField === 'name' ? (
              <View className="flex-row items-center">
                <TextInput
                  className="text-2xl font-bold text-gray-700 text-center border-b border-primary px-4"
                  value={tempValue}
                  onChangeText={setTempValue}
                  autoFocus
                  style={{minWidth: 200}}
                />
                <TouchableOpacity onPress={saveEdit} className="ml-2 p-1">
                  <Icon name="check" size={24} color="#8BC34A" />
                </TouchableOpacity>
                <TouchableOpacity onPress={cancelEdit} className="ml-1 p-1">
                  <Icon name="close" size={24} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => startEditing('name', user?.name)}
                className="flex-row items-center">
                <Text className="text-2xl font-bold text-gray-700 text-center">
                  {user?.name}
                </Text>
                <Icon name="edit" size={20} color="#8BC34A" className="ml-2" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View className="px-4 mb-6">
          <View className="bg-white rounded-2xl shadow-sm p-6">
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-2xl font-bold text-primary">
                  {user?.totalBookings || 0}
                </Text>
                <Text className="text-gray-400 text-sm">{t('profile.bookings')}</Text>
              </View>
              <View className="w-px bg-gray-300" />
              <View className="items-center">
                <Text className="text-2xl font-bold text-primary">
                  {user?.totalDonations || 0}
                </Text>
                <Text className="text-gray-400 text-sm">{t('profile.donations')}</Text>
              </View>
              <View className="w-px bg-gray-300" />
              <View className="items-center">
                <Text className="text-2xl font-bold text-primary">4.8</Text>
                <Text className="text-gray-400 text-sm">{t('profile.rating')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Personal Information - Editable */}
        <View className="px-4 mb-6">
          <Text className="text-gray-700 font-bold text-lg mb-4">
            {t('profile.personal_information')}
          </Text>

          <View className="bg-white rounded-2xl shadow-sm">
            {/* Email - Non-editable */}
            <View className="flex-row items-center p-4 border-b border-gray-100">
              <View className="w-10 h-10 bg-primary-light rounded-full items-center justify-center">
                <Icon name="email" size={20} color="#8BC34A" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-gray-400 text-sm">{t('profile.email')}</Text>
                <Text className="text-gray-700 font-medium">{user?.email}</Text>
              </View>
            </View>

            {/* Phone - Editable */}
            <View className="flex-row items-center p-4 border-b border-gray-100">
              <View className="w-10 h-10 bg-primary-light rounded-full items-center justify-center">
                <Icon name="phone" size={20} color="#8BC34A" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-gray-400 text-sm">{t('profile.phone')}</Text>
                {editingField === 'phone' ? (
                  <View className="flex-row items-center">
                    <TextInput
                      className="text-gray-700 font-medium border-b border-primary flex-1"
                      value={tempValue}
                      onChangeText={setTempValue}
                      keyboardType="phone-pad"
                      autoFocus
                    />
                    <TouchableOpacity onPress={saveEdit} className="ml-2 p-1">
                      <Icon name="check" size={20} color="#8BC34A" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={cancelEdit} className="ml-1 p-1">
                      <Icon name="close" size={20} color="#D32F2F" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => startEditing('phone', user?.phone)}
                    className="flex-row items-center">
                    <Text className="text-gray-700 font-medium flex-1">
                      {user?.phone}
                    </Text>
                    <Icon name="edit" size={16} color="#8BC34A" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Gender - Editable */}
            <View className="flex-row items-center p-4 border-b border-gray-100">
              <View className="w-10 h-10 bg-primary-light rounded-full items-center justify-center">
                <Icon name="person" size={20} color="#8BC34A" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-gray-400 text-sm">{t('profile.gender')}</Text>
                {editingField === 'gender' ? (
                  <View className="flex-row items-center">
                    <TextInput
                      className="text-gray-700 font-medium border-b border-primary flex-1"
                      value={tempValue}
                      onChangeText={setTempValue}
                      autoFocus
                    />
                    <TouchableOpacity onPress={saveEdit} className="ml-2 p-1">
                      <Icon name="check" size={20} color="#8BC34A" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={cancelEdit} className="ml-1 p-1">
                      <Icon name="close" size={20} color="#D32F2F" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => startEditing('gender', user?.gender)}
                    className="flex-row items-center">
                    <Text className="text-gray-700 font-medium flex-1">
                      {user?.gender}
                    </Text>
                    <Icon name="edit" size={16} color="#8BC34A" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Location - Editable */}
            <View className="flex-row items-center p-4 border-b border-gray-100">
              <View className="w-10 h-10 bg-primary-light rounded-full items-center justify-center">
                <Icon name="location-on" size={20} color="#8BC34A" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-gray-400 text-sm">{t('profile.location')}</Text>
                {editingField === 'location' ? (
                  <View className="flex-row items-center">
                    <TextInput
                      className="text-gray-700 font-medium border-b border-primary flex-1"
                      value={tempValue}
                      onChangeText={setTempValue}
                      autoFocus
                    />
                    <TouchableOpacity onPress={saveEdit} className="ml-2 p-1">
                      <Icon name="check" size={20} color="#8BC34A" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={cancelEdit} className="ml-1 p-1">
                      <Icon name="close" size={20} color="#D32F2F" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => startEditing('location', user?.location)}
                    className="flex-row items-center">
                    <Text className="text-gray-700 font-medium flex-1">
                      {user?.location}
                    </Text>
                    <Icon name="edit" size={16} color="#8BC34A" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Joined Date - Non-editable */}
            <View className="flex-row items-center p-4">
              <View className="w-10 h-10 bg-primary-light rounded-full items-center justify-center">
                <Icon name="calendar-today" size={20} color="#8BC34A" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-gray-400 text-sm">{t('profile.member_since')}</Text>
                <Text className="text-gray-700 font-medium">
                  {formatDate(user?.joinedDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bio Section - Editable */}
        <View className="px-4 mb-6">
          <Text className="text-gray-700 font-bold text-lg mb-4">{t('profile.about')}</Text>
          <View className="bg-white rounded-2xl shadow-sm p-4">
            {editingField === 'bio' ? (
              <View>
                <TextInput
                  className="text-gray-700 leading-6 border border-primary rounded-lg p-3"
                  value={tempValue}
                  onChangeText={setTempValue}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  autoFocus
                />
                <View className="flex-row justify-end mt-3">
                  <TouchableOpacity
                    onPress={saveEdit}
                    className="bg-primary rounded-lg px-4 py-2 mr-2">
                    <Text className="text-white font-medium">{t('profile.save')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={cancelEdit}
                    className="bg-gray-300 rounded-lg px-4 py-2">
                    <Text className="text-gray-700 font-medium">{t('profile.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => startEditing('bio', user?.bio)}
                className="flex-row items-start">
                <Text className="text-gray-700 leading-6 flex-1">
                  {user?.bio}
                </Text>
                <Icon
                  name="edit"
                  size={16}
                  color="#8BC34A"
                  className="ml-2 mt-1"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 mb-6">
          <Text className="text-gray-700 font-bold text-lg mb-4">
            {t('profile.quick_actions')}
          </Text>

          <View className="bg-white rounded-2xl shadow-sm">
            {/* My Bookings */}
            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-gray-100"
              onPress={() => navigation.navigate('MyEventBookings')}>
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                <Icon name="confirmation-number" size={20} color="#1976D2" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-gray-700 font-medium">{t('profile.my_bookings')}</Text>
                <Text className="text-gray-400 text-sm">
                  {t('profile.view_bookings')}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* My Donations */}
            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-gray-100"
              onPress={() => navigation.navigate('MyDonations')}>
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
                <Icon name="favorite" size={20} color="#8BC34A" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-gray-700 font-medium">{t('profile.my_donations')}</Text>
                <Text className="text-gray-400 text-sm">
                  {t('profile.view_donations')}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity
              className="flex-row items-center p-4"
              onPress={handleLogout}>
              <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center">
                <Icon name="logout" size={20} color="#D32F2F" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-red-600 font-medium">{t('profile.logout')}</Text>
                <Text className="text-gray-400 text-sm">
                  {t('profile.sign_out')}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{height: 20}} />
      </ScrollView>

      {/* Profile Picture Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}>
        <View className="flex-1 bg-black bg-opacity-90 justify-center items-center">
          <StatusBar
            barStyle="light-content"
            backgroundColor="rgba(0,0,0,0.9)"
          />

          {/* Close Button */}
          <TouchableOpacity
            className="absolute top-12 right-6 z-10"
            onPress={() => setImageModalVisible(false)}>
            <View className="w-10 h-10 bg-white bg-opacity-20 rounded-full items-center justify-center">
              <Icon name="close" size={24} color="#000000" />
            </View>
          </TouchableOpacity>

          {/* Profile Picture */}
          <View className="items-center">
            {user?.profilePicture ? (
              <Image
                source={{
                  uri: user.profilePicture.startsWith('data:')
                    ? user.profilePicture
                    : `data:image/jpeg;base64,${user.profilePicture}`,
                }}
                style={{
                  width: SCREEN_WIDTH - 40,
                  height: SCREEN_WIDTH - 40,
                  borderRadius: (SCREEN_WIDTH - 40) / 2,
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                className="bg-gray-200 items-center justify-center"
                style={{
                  width: SCREEN_WIDTH - 40,
                  height: SCREEN_WIDTH - 40,
                  borderRadius: (SCREEN_WIDTH - 40) / 2,
                }}>
                <Icon name="camera-alt" size={120} color="#8BC34A" />
              </View>
            )}

            {/* User Name */}
            <Text className="text-white text-2xl font-bold mt-6">
              {user?.name}
            </Text>

            {/* Change Picture Button */}
            <TouchableOpacity
              className="bg-primary rounded-xl px-6 py-3 mt-6 flex-row items-center"
              onPress={() => {
                setImageModalVisible(false);
                setTimeout(handleProfilePictureChange, 300);
              }}>
              <Icon name="camera-alt" size={20} color="#FFFFFF" />
              <Text className="text-white font-bold ml-2">{t('profile.change_picture')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
