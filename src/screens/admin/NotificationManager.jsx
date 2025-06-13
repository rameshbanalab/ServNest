import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  FlatList,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {DirectNotificationService} from '../services/directNotificationService';

export default function NotificationManager() {
  // Form states
  const [modalVisible, setModalVisible] = useState(false);
  const [userSelectionModal, setUserSelectionModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [targetType, setTargetType] = useState('all');
  const [imageUrl, setImageUrl] = useState('');
  const [sending, setSending] = useState(false);

  // ✅ NEW: Navigation and user selection states
  const [navigationType, setNavigationType] = useState('home');
  const [itemId, setItemId] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [sentNotifications, setSentNotifications] = useState([]);

  // ✅ NEW: Navigation types for deep linking
  const navigationTypes = [
    {value: 'home', label: 'Home Screen', icon: 'home'},
    {value: 'events', label: 'Events List', icon: 'event'},
    {value: 'event_details', label: 'Event Details', icon: 'event-note'},
    {value: 'business', label: 'My Businesses', icon: 'business'},
    {value: 'business_details', label: 'Business Details', icon: 'store'},
    {value: 'donations', label: 'Donations', icon: 'volunteer-activism'},
    {value: 'donation_details', label: 'Donation Details', icon: 'favorite'},
    {value: 'profile', label: 'User Profile', icon: 'person'},
    {value: 'jobs', label: 'Jobs', icon: 'work'},
    {value: 'help', label: 'Help & Support', icon: 'help'},
  ];

  const notificationTypes = [
    {value: 'general', label: 'General'},
    {value: 'business_update', label: 'Business Update'},
    {value: 'service_request', label: 'Service Request'},
    {value: 'promotional', label: 'Promotional'},
    {value: 'event_announcement', label: 'Event Announcement'},
    {value: 'donation_campaign', label: 'Donation Campaign'},
  ];

  const targetTypes = [
    {value: 'all', label: 'All Users'},
    {value: 'customers', label: 'Customers Only'},
    {value: 'business_owners', label: 'Business Owners Only'},
    {value: 'individual', label: 'Individual Users'},
  ];

  // ✅ NEW: Load users for individual targeting
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const userList = await DirectNotificationService.getUserList();
      setUsers(userList.filter(user => !user.isAdmin)); // Exclude admins
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setType('general');
    setTargetType('all');
    setImageUrl('');
    setNavigationType('home');
    setItemId('');
    setSelectedUsers([]);
  };

  const sendNotification = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'Please login as admin to send notifications');
      return;
    }

    if (!title.trim() || !body.trim()) {
      Alert.alert('Error', 'Please fill in title and body');
      return;
    }

    if (targetType === 'individual' && selectedUsers.length === 0) {
      Alert.alert(
        'Error',
        'Please select at least one user for individual targeting',
      );
      return;
    }

    setSending(true);
    try {
      console.log('📤 Sending admin notification with navigation...');

      const notificationData = {
        title: title.trim(),
        body: body.trim(),
        type,
        targetType,
        imageUrl: imageUrl.trim() || null,
        // ✅ NEW: Navigation data
        navigationType,
        itemId: itemId.trim() || null,
        // ✅ NEW: Individual user targeting
        targetUsers:
          targetType === 'individual' ? selectedUsers.map(u => u.id) : null,
      };

      const result = await DirectNotificationService.sendAdminNotification(
        notificationData,
      );

      if (result.success) {
        const sentNotification = {
          id: Date.now().toString(),
          ...notificationData,
          sentAt: new Date().toISOString(),
          sentCount: result.sentCount || 'All users',
        };

        setSentNotifications(prev => [sentNotification, ...prev]);

        Alert.alert(
          '✅ Success!',
          result.message || 'Notification sent successfully!',
        );

        setModalVisible(false);
        resetForm();
      } else {
        Alert.alert('❌ Error', result.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      Alert.alert('❌ Error', 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openUserSelection = () => {
    loadUsers();
    setUserSelectionModal(true);
  };

  const toggleUserSelection = user => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  // ✅ NEW: User Selection Modal
  const renderUserSelectionModal = () => (
    <Modal
      visible={userSelectionModal}
      animationType="slide"
      presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="bg-primary px-4 py-4">
          <View className="flex-row justify-between items-center">
            <TouchableOpacity
              onPress={() => setUserSelectionModal(false)}
              className="p-2 rounded-full bg-primary-dark">
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">Select Users</Text>
            <TouchableOpacity
              onPress={() => setUserSelectionModal(false)}
              className="bg-white rounded-full px-4 py-2">
              <Text className="text-primary font-bold">Done</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="p-4">
          <Text className="text-gray-600 mb-4">
            Selected: {selectedUsers.length} users
          </Text>

          {loadingUsers ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#FF4500" />
              <Text className="text-gray-600 mt-2">Loading users...</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <TouchableOpacity
                  onPress={() => toggleUserSelection(item)}
                  className="bg-white rounded-lg p-4 mb-2 border border-gray-200">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-bold text-gray-800">
                        {item.name}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {item.email}
                      </Text>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        selectedUsers.find(u => u.id === item.id)
                          ? 'bg-primary border-primary'
                          : 'border-gray-300'
                      }`}>
                      {selectedUsers.find(u => u.id === item.id) && (
                        <Icon name="check" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#FF4500" />

      {/* Header */}
      <View className="bg-primary px-4 py-4 shadow-lg">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 items-center">
            <Text className="text-white font-bold text-xl">
              Send Notifications
            </Text>
            <Text className="text-green-100 text-sm">
              With deep linking support
            </Text>
          </View>

          <TouchableOpacity
            onPress={openCreateModal}
            className="p-2 rounded-full bg-white shadow-lg">
            <Icon name="add" size={24} color="#FF4500" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recently Sent Notifications */}
      <ScrollView className="flex-1 p-4">
        {sentNotifications.length === 0 ? (
          <View className="items-center py-12">
            <View className="bg-primary-light rounded-full p-6 mb-4">
              <Icon name="send" size={64} color="#FF4500" />
            </View>
            <Text className="text-gray-500 text-lg font-medium mt-4">
              No notifications sent yet
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              Send your first notification with deep linking to engage users
            </Text>
            <TouchableOpacity
              onPress={openCreateModal}
              className="bg-primary rounded-full px-6 py-3 mt-6">
              <Text className="text-white font-bold">Send Notification</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-4">
            <Text className="text-lg font-bold text-gray-800 mb-4">
              Recently Sent ({sentNotifications.length})
            </Text>

            {sentNotifications.map(notification => (
              <View
                key={notification.id}
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="font-bold text-gray-800 text-base">
                      {notification.title}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      {notification.type} • {notification.targetType}
                    </Text>
                    {/* ✅ NEW: Show navigation info */}
                    <Text className="text-primary text-xs mt-1">
                      📍{' '}
                      {navigationTypes.find(
                        n => n.value === notification.navigationType,
                      )?.label || 'Home'}
                      {notification.itemId && ` (ID: ${notification.itemId})`}
                    </Text>
                  </View>

                  <View className="bg-green-100 px-2 py-1 rounded-full">
                    <Text className="text-green-600 text-xs font-medium">
                      Sent
                    </Text>
                  </View>
                </View>

                <Text className="text-gray-600 text-sm mb-3" numberOfLines={2}>
                  {notification.body}
                </Text>

                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <Icon name="send" size={16} color="#6B7280" />
                    <Text className="text-gray-500 text-sm ml-1">
                      {notification.sentCount} recipients
                    </Text>
                  </View>

                  <Text className="text-gray-400 text-xs">
                    {new Date(notification.sentAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Send Notification Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50">
          {/* Modal Header */}
          <View className="bg-primary px-4 py-4">
            <View className="flex-row justify-between items-center">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="p-2 rounded-full bg-primary-dark">
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View className="flex-1 items-center">
                <Text className="text-white font-bold text-lg">
                  Send Notification
                </Text>
              </View>

              <View className="w-10" />
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Title */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Enter notification title"
                className="bg-white rounded-lg p-3 border border-gray-200 text-gray-800"
                maxLength={100}
              />
              <Text className="text-gray-400 text-xs mt-1">
                {title.length}/100
              </Text>
            </View>

            {/* Body */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Message *</Text>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Enter notification message"
                className="bg-white rounded-lg p-3 border border-gray-200 text-gray-800"
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text className="text-gray-400 text-xs mt-1">
                {body.length}/500
              </Text>
            </View>

            {/* Type */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Type</Text>
              <View className="flex-row flex-wrap">
                {notificationTypes.map(typeOption => (
                  <TouchableOpacity
                    key={typeOption.value}
                    onPress={() => setType(typeOption.value)}
                    className={`px-4 py-2 rounded-lg mr-2 mb-2 ${
                      type === typeOption.value
                        ? 'bg-primary'
                        : 'bg-white border border-gray-200'
                    }`}>
                    <Text
                      className={`font-medium ${
                        type === typeOption.value
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}>
                      {typeOption.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ✅ NEW: Navigation Type */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">
                Navigate to Screen
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {navigationTypes.map(navType => (
                    <TouchableOpacity
                      key={navType.value}
                      onPress={() => setNavigationType(navType.value)}
                      className={`px-4 py-3 rounded-lg mr-2 items-center min-w-24 ${
                        navigationType === navType.value
                          ? 'bg-primary'
                          : 'bg-white border border-gray-200'
                      }`}>
                      <Icon
                        name={navType.icon}
                        size={20}
                        color={
                          navigationType === navType.value
                            ? '#FFFFFF'
                            : '#FF4500'
                        }
                      />
                      <Text
                        className={`text-xs mt-1 text-center ${
                          navigationType === navType.value
                            ? 'text-white'
                            : 'text-gray-700'
                        }`}>
                        {navType.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* ✅ NEW: Item ID for specific navigation */}
            {['event_details', 'business_details', 'donation_details'].includes(
              navigationType,
            ) && (
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Item ID (Optional)
                </Text>
                <TextInput
                  value={itemId}
                  onChangeText={setItemId}
                  placeholder="Enter specific item ID for navigation"
                  className="bg-white rounded-lg p-3 border border-gray-200 text-gray-800"
                />
                <Text className="text-gray-400 text-xs mt-1">
                  Used for navigating to specific event, business, or donation
                </Text>
              </View>
            )}

            {/* Target Audience */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">
                Target Audience
              </Text>
              <View className="flex-row flex-wrap">
                {targetTypes.map(targetOption => (
                  <TouchableOpacity
                    key={targetOption.value}
                    onPress={() => setTargetType(targetOption.value)}
                    className={`px-4 py-2 rounded-lg mr-2 mb-2 ${
                      targetType === targetOption.value
                        ? 'bg-primary'
                        : 'bg-white border border-gray-200'
                    }`}>
                    <Text
                      className={`font-medium ${
                        targetType === targetOption.value
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}>
                      {targetOption.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ✅ NEW: Individual User Selection */}
            {targetType === 'individual' && (
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-700 font-medium">
                    Selected Users ({selectedUsers.length})
                  </Text>
                  <TouchableOpacity
                    onPress={openUserSelection}
                    className="bg-primary rounded-lg px-3 py-1">
                    <Text className="text-white text-sm font-medium">
                      Select Users
                    </Text>
                  </TouchableOpacity>
                </View>

                {selectedUsers.length > 0 && (
                  <View className="bg-white rounded-lg p-3 border border-gray-200">
                    {selectedUsers.slice(0, 3).map(user => (
                      <Text key={user.id} className="text-gray-600 text-sm">
                        • {user.name}
                      </Text>
                    ))}
                    {selectedUsers.length > 3 && (
                      <Text className="text-gray-500 text-sm">
                        ... and {selectedUsers.length - 3} more
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Image URL */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">
                Image URL (Optional)
              </Text>
              <TextInput
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://example.com/image.jpg"
                className="bg-white rounded-lg p-3 border border-gray-200 text-gray-800"
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Send Button */}
            <TouchableOpacity
              onPress={sendNotification}
              disabled={sending || !title.trim() || !body.trim()}
              className={`rounded-lg py-4 mb-6 ${
                sending || !title.trim() || !body.trim()
                  ? 'bg-gray-300'
                  : 'bg-primary'
              }`}>
              {sending ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white font-bold ml-2">Sending...</Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-center">
                  Send Notification Now
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ✅ NEW: User Selection Modal */}
      {renderUserSelectionModal()}
    </SafeAreaView>
  );
}
