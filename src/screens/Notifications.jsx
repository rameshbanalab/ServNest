import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {db} from '../config/firebaseConfig';
import {collection, query, where, orderBy, getDocs} from 'firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // ✅ FIXED: Fetch directly from Notifications collection like admin
  const fetchNotifications = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        console.log('No authenticated user found');
        setLoading(false);
        return;
      }

      console.log('Fetching notifications for user:', user.uid);

      // ✅ FIXED: Get notifications from Notifications collection directly
      // Filter by targetType to show relevant notifications to users
      const notificationsQuery = query(
        collection(db, 'Notifications'),
        where('targetType', 'in', ['all', 'customers']), // Show 'all' and 'customers' notifications to users
        orderBy('createdAt', 'desc'),
      );

      const notificationsSnapshot = await getDocs(notificationsQuery);
      console.log('Found notifications:', notificationsSnapshot.size);

      if (notificationsSnapshot.empty) {
        console.log('No notifications found');
        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const notificationsData = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Add user-specific read status (you can store this in AsyncStorage or separate collection later)
        isRead: false, // Default to unread for now
        receivedAt: doc.data().createdAt, // Use createdAt as receivedAt
      }));

      console.log('Valid notifications:', notificationsData.length);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ SIMPLIFIED: Mark as read locally (you can enhance this later with AsyncStorage)
  const markAsRead = async notificationId => {
    try {
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? {...notif, isRead: true, readAt: new Date()}
            : notif,
        ),
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const getTypeIcon = type => {
    switch (type) {
      case 'general':
        return 'notifications';
      case 'business_update':
        return 'business';
      case 'service_request':
        return 'build';
      case 'promotional':
        return 'local-offer';
      default:
        return 'notifications';
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'sent':
        return 'text-green-600 bg-green-100';
      case 'scheduled':
        return 'text-blue-600 bg-blue-100';
      case 'draft':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="mt-4 text-gray-600">Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* ✅ REMOVED: Custom header that was causing navigation context error */}

      {/* Notifications List */}
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {notifications.length === 0 ? (
          <View className="items-center py-12">
            <View className="bg-primary-light rounded-full p-6 mb-4">
              <Icon name="notifications-none" size={64} color="#8BC34A" />
            </View>
            <Text className="text-gray-500 text-lg font-medium mt-4">
              No notifications yet
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              You'll see notifications here when you receive them
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {notifications.map(notification => (
              <TouchableOpacity
                key={notification.id}
                onPress={() =>
                  !notification.isRead && markAsRead(notification.id)
                }
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                {/* Header */}
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`rounded-full p-2 mr-3 ${
                        notification.isRead ? 'bg-gray-100' : 'bg-primary-light'
                      }`}>
                      <Icon
                        name={getTypeIcon(notification.type)}
                        size={20}
                        color={notification.isRead ? '#6B7280' : '#689F38'}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-bold text-base ${
                          notification.isRead
                            ? 'text-gray-600'
                            : 'text-gray-800'
                        }`}>
                        {notification.title}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        {notification.type} • {notification.targetType}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    {!notification.isRead && (
                      <View className="w-2 h-2 bg-primary rounded-full ml-2" />
                    )}
                    {notification.status && (
                      <View
                        className={`px-2 py-1 rounded-full ml-2 ${getStatusColor(
                          notification.status,
                        )}`}>
                        <Text className="text-xs font-medium">
                          {notification.status}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Body */}
                <Text
                  className={`text-sm mb-3 ${
                    notification.isRead ? 'text-gray-500' : 'text-gray-700'
                  }`}
                  numberOfLines={3}>
                  {notification.body}
                </Text>

                {/* Image */}
                {notification.imageUrl && (
                  <Image
                    source={{uri: notification.imageUrl}}
                    className="w-full h-32 rounded-lg mb-3"
                    resizeMode="cover"
                  />
                )}

                {/* Stats and Date */}
                <View className="flex-row justify-between items-center">
                  <View className="flex-row space-x-4">
                    {notification.sentCount !== undefined && (
                      <View className="flex-row items-center">
                        <Icon name="send" size={14} color="#6B7280" />
                        <Text className="text-gray-500 text-xs ml-1">
                          {notification.sentCount || 0} sent
                        </Text>
                      </View>
                    )}
                    {notification.readCount !== undefined && (
                      <View className="flex-row items-center">
                        <Icon name="visibility" size={14} color="#6B7280" />
                        <Text className="text-gray-500 text-xs ml-1">
                          {notification.readCount || 0} read
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text className="text-gray-400 text-xs">
                    {notification.createdAt?.toDate?.()?.toLocaleString() ||
                      'Just now'}
                  </Text>
                </View>

                {/* Read Status Indicator */}
                {notification.isRead && notification.readAt && (
                  <View className="mt-2 pt-2 border-t border-gray-100">
                    <Text className="text-gray-400 text-xs">
                      Read on {new Date(notification.readAt).toLocaleString()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
