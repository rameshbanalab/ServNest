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
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {DirectNotificationService} from '../services/directNotificationService';

export default function NotificationManager() {
  // Form states only (no database states)
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [targetType, setTargetType] = useState('all');
  const [imageUrl, setImageUrl] = useState('');
  const [sending, setSending] = useState(false);

  // ✅ No notification history - just sending interface
  const [sentNotifications, setSentNotifications] = useState([]);

  const notificationTypes = [
    {value: 'general', label: 'General'},
    {value: 'business_update', label: 'Business Update'},
    {value: 'service_request', label: 'Service Request'},
    {value: 'promotional', label: 'Promotional'},
  ];

  const targetTypes = [
    {value: 'all', label: 'All Users'},
    {value: 'customers', label: 'Customers Only'},
    {value: 'business_owners', label: 'Business Owners Only'},
  ];

  const resetForm = () => {
    setTitle('');
    setBody('');
    setType('general');
    setTargetType('all');
    setImageUrl('');
  };

  // ✅ Direct notification sending without database storage
  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Error', 'Please fill in title and body');
      return;
    }

    setSending(true);
    try {
      const notificationData = {
        title: title.trim(),
        body: body.trim(),
        type,
        targetType,
        imageUrl: imageUrl.trim() || null,
      };

      const result = await DirectNotificationService.sendDirectNotification(
        notificationData,
      );

      if (result.success) {
        // Add to local sent history (not stored in database)
        const sentNotification = {
          id: Date.now().toString(),
          ...notificationData,
          sentAt: new Date().toISOString(),
          sentCount: result.sentCount,
        };

        setSentNotifications(prev => [sentNotification, ...prev]);

        Alert.alert(
          'Success!',
          `Notification sent to ${result.sentCount} devices successfully!`,
        );

        setModalVisible(false);
        resetForm();
      } else {
        Alert.alert('Error', result.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />

      {/* Header */}
      <View className="bg-primary px-4 py-4 shadow-lg">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 items-center">
            <Text className="text-white font-bold text-xl">
              Send Notifications
            </Text>
            <Text className="text-green-100 text-sm">Direct FCM messaging</Text>
          </View>

          <TouchableOpacity
            onPress={openCreateModal}
            className="p-2 rounded-full bg-white shadow-lg">
            <Icon name="add" size={24} color="#8BC34A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recently Sent Notifications (Local History) */}
      <ScrollView className="flex-1 p-4">
        {sentNotifications.length === 0 ? (
          <View className="items-center py-12">
            <View className="bg-primary-light rounded-full p-6 mb-4">
              <Icon name="send" size={64} color="#8BC34A" />
            </View>
            <Text className="text-gray-500 text-lg font-medium mt-4">
              No notifications sent yet
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              Send your first notification to engage users
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
                      {notification.sentCount} devices
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

            {/* Target */}
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
    </SafeAreaView>
  );
}
