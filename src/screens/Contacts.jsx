import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from '@react-native-firebase/firestore';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';

const db = getFirestore();

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const navigation = useNavigation();

  // Check admin status
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      setAdminLoading(true);
      const adminStatus = await AsyncStorage.getItem('userRole');
      console.log("ad",adminStatus);
      setIsAdmin(adminStatus === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch contacts after admin status is determined
    if (!adminLoading) {
      let unsubscribes = [];
      let isMounted = true;

      const fetchContacts = async () => {
        try {
          setLoading(true);

          // Get current user ID
          const userId =
            (await AsyncStorage.getItem('authToken')) || auth().currentUser?.uid;

          if (!userId) {
            Alert.alert('Error', 'User not authenticated');
            setLoading(false);
            return;
          }

          const userRef = doc(db, 'Users', userId);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            console.log('User document not found');
            setContacts([]);
            setLoading(false);
            return;
          }

          const chatIdsMap = userSnap.data().chatIds || {};
          const contactEntries = Object.entries(chatIdsMap);

          if (contactEntries.length === 0) {
            setContacts([]);
            setLoading(false);
            return;
          }

          const promises = contactEntries.map(async ([otherUserId, chatId]) => {
            try {
              // Fetch contact's data
              const contactRef = doc(db, 'Users', otherUserId);
              const contactSnap = await getDoc(contactRef);

              const contactData = contactSnap.exists() ? contactSnap.data() : {};
              const contactName =
                contactData.fullName || contactData.name || 'Unknown User';
              const contactEmail = contactData.email || '';
              const contactAvatar = contactData.profileImage || null;

              // Listen for the last message and unread count
              const messagesRef = collection(db, 'Chats', chatId, 'messages');
              const q = query(
                messagesRef,
                orderBy('createdAt', 'desc'),
                limit(10),
              );

              let initialData = {
                userId: otherUserId,
                name: contactName,
                email: contactEmail,
                avatar: contactAvatar,
                chatId,
                lastMessage: null,
                unreadCount: 0,
                lastMessageTime: null,
                isOnline: false, // You can implement online status later
              };

              const unsubscribe = onSnapshot(q, snap => {
                let lastMessage = null;
                let unreadCount = 0;
                let lastMessageTime = null;

                if (!snap.empty) {
                  const msgs = snap.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data(),
                  }));

                  lastMessage = msgs[0];
                  lastMessageTime = lastMessage?.createdAt?.toDate() || null;

                  unreadCount = msgs.filter(
                    msg =>
                      !(msg.readBy || []).includes(userId) &&
                      msg.sender !== userId,
                  ).length;
                }

                if (isMounted) {
                  setContacts(prev =>
                    prev.map(c =>
                      c.chatId === chatId
                        ? {...c, lastMessage, unreadCount, lastMessageTime}
                        : c,
                    ),
                  );
                }
              });

              unsubscribes.push(unsubscribe);
              return initialData;
            } catch (error) {
              console.error('Error fetching contact:', error);
              return null;
            }
          });

          const results = await Promise.all(promises);
          const validContacts = results.filter(contact => contact !== null);

          if (isMounted) {
            // Sort contacts by last message time
            const sortedContacts = validContacts.sort((a, b) => {
              if (!a.lastMessageTime && !b.lastMessageTime) return 0;
              if (!a.lastMessageTime) return 1;
              if (!b.lastMessageTime) return -1;
              return b.lastMessageTime - a.lastMessageTime;
            });

            setContacts(sortedContacts);
          }
        } catch (error) {
          console.error('Error fetching contacts:', error);
          Alert.alert('Error', 'Failed to load contacts');
        } finally {
          setLoading(false);
        }
      };

      fetchContacts();

      return () => {
        isMounted = false;
        unsubscribes.forEach(unsub => unsub && unsub());
      };
    }
  }, [adminLoading]); // Depend on adminLoading to ensure admin status is checked first

  const onRefresh = async () => {
    setRefreshing(true);
    // Re-check admin status and re-fetch contacts
    await checkAdminStatus();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const formatLastMessageTime = timestamp => {
    if (!timestamp) return '';

    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInHours < 48) {
      return 'yesterday';
    } else {
      return messageTime.toLocaleDateString();
    }
  };

  const renderLastMessage = msg => {
    if (!msg) {
      return <Text className="text-gray-400 text-sm">No messages yet</Text>;
    }

    if (msg.type === 'image') {
      return (
        <View className="flex-row items-center">
          <Icon name="image" size={14} color="#9CA3AF" />
          <Text className="text-gray-500 text-sm ml-1">Photo</Text>
        </View>
      );
    }

    return (
      <Text className="text-gray-600 text-sm" numberOfLines={1}>
        {msg.content}
      </Text>
    );
  };

  const getInitials = name => {
    if (!name) return '?';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

const handlePress = contact => {
  try {
      navigation.navigate('Chat', {
        name: contact.name,
        chatId: contact.chatId,
        recipientId: contact.userId,
      });
  
  } catch (error) {
    console.error('Navigation error:', error);
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Chat',
          params: {
            name: contact.name,
            chatId: contact.chatId,
            recipientId: contact.userId,
          },
        },
      ],
    });
  }
  
};



  const renderContactItem = ({item: contact}) => (
    <TouchableOpacity
      className="bg-white mx-4 mb-3 rounded-xl shadow-sm border border-gray-100"
      onPress={() => handlePress(contact)}
      activeOpacity={0.7}>
      <View className="flex-row items-center p-4">
        {/* Avatar */}
        <View className="relative">
          {contact.avatar ? (
            <Image
              source={{uri: contact.avatar}}
              className="w-14 h-14 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-14 h-14 rounded-full bg-primary items-center justify-center">
              <Text className="text-white font-bold text-lg">
                {getInitials(contact.name)}
              </Text>
            </View>
          )}

          {/* Online Status Indicator */}
          {contact.isOnline && (
            <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          )}
        </View>

        {/* Contact Info */}
        <View className="flex-1 ml-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-gray-800 font-bold text-base"
              numberOfLines={1}>
              {contact.name}
            </Text>

            {contact.lastMessageTime && (
              <Text className="text-gray-400 text-xs">
                {formatLastMessageTime(contact.lastMessageTime)}
              </Text>
            )}
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              {renderLastMessage(contact.lastMessage)}
            </View>

            {/* Unread Badge */}
            {contact.unreadCount > 0 && (
              <View className="bg-primary rounded-full min-w-6 h-6 items-center justify-center px-2">
                <Text className="text-white font-bold text-xs">
                  {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Chevron */}
        <View className="ml-2">
          <Icon name="chevron-right" size={20} color="#D1D5DB" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View className="bg-gray-100 rounded-full p-6 mb-4">
        <Icon name="chat-bubble-outline" size={48} color="#9CA3AF" />
      </View>

      <Text className="text-gray-700 text-xl font-bold mb-2">
        No Conversations Yet
      </Text>

      <Text className="text-gray-500 text-center text-base leading-6">
        {isAdmin 
          ? "Admin conversations will appear here when users contact support"
          : "Start a conversation by browsing services and contacting business owners"
        }
      </Text>

      {!isAdmin && (
        <TouchableOpacity
          className="bg-primary rounded-xl px-6 py-3 mt-6"
          onPress={() => navigation.navigate('Home')}>
          <Text className="text-white font-bold text-base">Explore Services</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View className="flex-row items-center justify-between bg-primary px-4 py-3 shadow-md">
      <View className="flex-row items-center flex-1">
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <View className="ml-4 flex-1">
          <Text className="text-white font-bold text-lg">
            {isAdmin ? 'Admin Messages' : 'Messages'}
          </Text>
          <Text className="text-gray-200 text-sm">
            {contacts.length} conversation{contacts.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      
      {/* Admin Badge */}
      {isAdmin && (
        <View className="bg-yellow-500 px-2 py-1 rounded-full">
          <Text className="text-white text-xs font-bold">ADMIN</Text>
        </View>
      )}
    </View>
  );

  // Show loading while checking admin status
  if (adminLoading || loading) {
    return (
      <View className="flex-1 bg-gray-50">
        {!adminLoading && renderHeader()}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8BC34A" />
          <Text className="text-gray-600 mt-4 text-base">
            {adminLoading ? 'Checking permissions...' : 'Loading conversations...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {renderHeader()}

      <FlatList
        data={contacts}
        keyExtractor={item => item.chatId}
        renderItem={renderContactItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8BC34A']}
            tintColor="#8BC34A"
          />
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 16,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default Contacts;
