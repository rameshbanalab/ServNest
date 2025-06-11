/* eslint-disable no-catch-shadow */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Cache management
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CONTACTS_CACHE_KEY = 'contacts_cache';
const CACHE_TIMESTAMP_KEY = 'contacts_cache_timestamp';

// Image cache for base64 to URI conversion
const imageCache = new Map();

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  const unsubscribesRef = useRef([]);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef(0);
  const isDataFreshRef = useRef(false);

  // Convert base64 to blob URL for better performance
  const convertBase64ToUri = useCallback(base64String => {
    if (!base64String) return null;

    // Check cache first
    if (imageCache.has(base64String)) {
      return imageCache.get(base64String);
    }

    try {
      // For React Native, we can use the base64 directly but with optimization
      const optimizedUri = base64String.startsWith('data:')
        ? base64String
        : `data:image/jpeg;base64,${base64String}`;

      // Cache the result
      imageCache.set(base64String, optimizedUri);

      // Limit cache size to prevent memory issues
      if (imageCache.size > 50) {
        const firstKey = imageCache.keys().next().value;
        imageCache.delete(firstKey);
      }

      return optimizedUri;
    } catch (error) {
      console.error('Error converting base64:', error);
      return null;
    }
  }, []);

  // Cache management functions
  const saveToCache = useCallback(async data => {
    try {
      await AsyncStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }, []);

  const loadFromCache = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CONTACTS_CACHE_KEY);
      const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        const now = Date.now();

        // Check if cache is still valid
        if (now - timestamp < CACHE_DURATION) {
          const parsedData = JSON.parse(cachedData);
          console.log('✅ Loaded contacts from cache:', parsedData.length);
          return parsedData;
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return null;
    }
  }, []);

  // Enhanced admin status check with caching
  const checkAdminStatus = useCallback(async () => {
    try {
      setAdminLoading(true);
      setError(null);

      // Check cache first
      const cachedAdminStatus = await AsyncStorage.getItem(
        'admin_status_cache',
      );
      if (cachedAdminStatus !== null) {
        const isAdminCached = cachedAdminStatus === 'true';
        setIsAdmin(isAdminCached);
        setAdminLoading(false);
        return isAdminCached;
      }

      const adminStatus = await AsyncStorage.getItem('userRole');
      const isAdminUser = adminStatus === 'admin';

      // Cache the result
      await AsyncStorage.setItem('admin_status_cache', isAdminUser.toString());

      if (isMountedRef.current) {
        setIsAdmin(isAdminUser);
      }

      return isAdminUser;
    } catch (error) {
      console.error('Error checking admin status:', error);
      if (isMountedRef.current) {
        setIsAdmin(false);
        setError('Failed to check user permissions');
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setAdminLoading(false);
      }
    }
  }, []);

  // Optimized contacts fetching with smart caching
  const fetchContacts = useCallback(
    async (forceRefresh = false) => {
      if (adminLoading || !isMountedRef.current) return;

      const now = Date.now();

      // Prevent multiple simultaneous fetches
      if (!forceRefresh && now - lastFetchTimeRef.current < 2000) {
        console.log('⏭️ Skipping fetch - too recent');
        return;
      }

      // Check if data is already fresh
      if (!forceRefresh && isDataFreshRef.current && contacts.length > 0) {
        console.log('✅ Using existing fresh data');
        setInitialLoading(false);
        return;
      }

      try {
        if (!forceRefresh) {
          setLoading(true);
        }
        setError(null);
        lastFetchTimeRef.current = now;

        // Try to load from cache first (only if not force refreshing)
        if (!forceRefresh) {
          const cachedContacts = await loadFromCache();
          if (cachedContacts && cachedContacts.length > 0) {
            setContacts(cachedContacts);
            setInitialLoading(false);
            setLoading(false);
            isDataFreshRef.current = true;

            // Set up listeners for cached data
            setupMessageListeners(cachedContacts);
            return;
          }
        }

        // Cleanup existing listeners
        cleanupListeners();

        const userId =
          (await AsyncStorage.getItem('authToken')) || auth().currentUser?.uid;
        if (!userId) {
          throw new Error('User not authenticated');
        }

        // Get user document with timeout
        const userRef = firestore().collection('Users').doc(userId);
        const userSnap = await Promise.race([
          userRef.get(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Timeout getting user data')),
              10000,
            ),
          ),
        ]);

        if (!userSnap.exists) {
          console.log('User document not found');
          if (isMountedRef.current) {
            setContacts([]);
            setInitialLoading(false);
          }
          return;
        }

        const chatIdsMap = userSnap.data()?.chatIds || {};
        const contactEntries = Object.entries(chatIdsMap);

        if (contactEntries.length === 0) {
          if (isMountedRef.current) {
            setContacts([]);
            setInitialLoading(false);
          }
          return;
        }

        // Fetch contact data in batches for better performance
        const batchSize = 5;
        const contactPromises = [];

        for (let i = 0; i < contactEntries.length; i += batchSize) {
          const batch = contactEntries.slice(i, i + batchSize);
          const batchPromise = Promise.all(
            batch.map(async ([otherUserId, chatId]) => {
              try {
                const contactRef = firestore()
                  .collection('Users')
                  .doc(otherUserId);
                const contactSnap = await Promise.race([
                  contactRef.get(),
                  new Promise((_, reject) =>
                    setTimeout(
                      () => reject(new Error('Contact timeout')),
                      5000,
                    ),
                  ),
                ]);

                const contactData = contactSnap.exists()
                  ? contactSnap.data()
                  : {};

                // Optimize image handling
                let optimizedAvatar = null;
                if (contactData.profileImage || contactData.profilePicture) {
                  optimizedAvatar = convertBase64ToUri(
                    contactData.profileImage || contactData.profilePicture,
                  );
                }

                return {
                  userId: otherUserId,
                  name:
                    contactData.fullName || contactData.name || 'Unknown User',
                  email: contactData.email || '',
                  avatar: optimizedAvatar,
                  chatId,
                  lastMessage: null,
                  unreadCount: 0,
                  lastMessageTime: null,
                  isOnline: false,
                };
              } catch (error) {
                console.error('Error fetching contact:', otherUserId, error);
                return null;
              }
            }),
          );
          contactPromises.push(batchPromise);
        }

        // Process batches sequentially to avoid overwhelming Firebase
        const allResults = [];
        for (const batchPromise of contactPromises) {
          const batchResults = await batchPromise;
          allResults.push(...batchResults);
        }

        const validContacts = allResults.filter(contact => contact !== null);

        if (isMountedRef.current) {
          // Sort contacts by last message time
          const sortedContacts = validContacts.sort((a, b) => {
            if (!a.lastMessageTime && !b.lastMessageTime) return 0;
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return b.lastMessageTime - a.lastMessageTime;
          });

          setContacts(sortedContacts);
          isDataFreshRef.current = true;

          // Cache the results
          await saveToCache(sortedContacts);

          // Set up message listeners
          setupMessageListeners(sortedContacts);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
        if (isMountedRef.current) {
          setError('Failed to load conversations');
          Alert.alert(
            'Connection Error',
            'Failed to load conversations. Please check your internet connection.',
            [{text: 'Retry', onPress: () => fetchContacts(true)}, {text: 'OK'}],
          );
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      adminLoading,
      contacts.length,
      loadFromCache,
      saveToCache,
      convertBase64ToUri,
    ],
  );

  // Separate function to set up message listeners
  const setupMessageListeners = useCallback(contactsList => {
    contactsList.forEach(contact => {
      try {
        const messagesRef = firestore()
          .collection('Chats')
          .doc(contact.chatId)
          .collection('messages')
          .orderBy('createdAt', 'desc')
          .limit(5); // Reduced limit for better performance

        const unsubscribe = messagesRef.onSnapshot(
          snap => {
            if (!isMountedRef.current) return;

            try {
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

                const userId = auth().currentUser?.uid;
                unreadCount = msgs.filter(
                  msg =>
                    !(msg.readBy || []).includes(userId) &&
                    msg.sender !== userId,
                ).length;
              }

              // Batch update to prevent excessive re-renders
              setContacts(prev =>
                prev.map(c =>
                  c.chatId === contact.chatId
                    ? {...c, lastMessage, unreadCount, lastMessageTime}
                    : c,
                ),
              );
            } catch (error) {
              console.error('Error in message listener:', error);
            }
          },
          error => {
            console.error('Message listener error:', error);
          },
        );

        unsubscribesRef.current.push(unsubscribe);
      } catch (error) {
        console.error(
          'Error setting up listener for contact:',
          contact.chatId,
          error,
        );
      }
    });
  }, []);

  // Cleanup function
  const cleanupListeners = useCallback(() => {
    unsubscribesRef.current.forEach(unsub => {
      if (typeof unsub === 'function') {
        try {
          unsub();
        } catch (error) {
          console.error('Error cleaning up listener:', error);
        }
      }
    });
    unsubscribesRef.current = [];
  }, []);

  // Smart refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    isDataFreshRef.current = false; // Mark data as stale
    await checkAdminStatus();
    await fetchContacts(true); // Force refresh
  }, [checkAdminStatus, fetchContacts]);

  // Optimized navigation with error handling
  const handlePress = useCallback(
    contact => {
      try {
        if (!contact?.chatId || !contact?.userId || !contact?.name) {
          Alert.alert('Error', 'Invalid contact information');
          return;
        }

        console.log('Navigating to chat:', {
          name: contact.name,
          chatId: contact.chatId,
          recipientId: contact.userId,
        });

        navigation.navigate('UserChat', {
          name: contact.name,
          chatId: contact.chatId,
          recipientId: contact.userId,
        });
      } catch (error) {
        console.error('Navigation error:', error);
        Alert.alert('Error', 'Failed to open chat. Please try again.');
      }
    },
    [navigation],
  );

  // Utility functions
  const formatLastMessageTime = useCallback(timestamp => {
    if (!timestamp) return '';

    try {
      const now = new Date();
      const messageTime = new Date(timestamp);
      const diffInHours = (now - messageTime) / (1000 * 60 * 60);

      if (diffInHours < 1) return 'now';
      if (diffInHours < 24) {
        return messageTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      if (diffInHours < 48) return 'yesterday';
      return messageTime.toLocaleDateString();
    } catch (error) {
      return '';
    }
  }, []);

  const renderLastMessage = useCallback(msg => {
    if (!msg) {
      return <Text style={styles.noMessageText}>No messages yet</Text>;
    }

    if (msg.type === 'image') {
      return (
        <View style={styles.imageMessageContainer}>
          <Icon name="image" size={14} color="#9CA3AF" />
          <Text style={styles.imageMessageText}>Photo</Text>
        </View>
      );
    }

    return (
      <Text style={styles.lastMessageText} numberOfLines={1}>
        {msg.content || 'Message'}
      </Text>
    );
  }, []);

  const getInitials = useCallback(name => {
    if (!name) return '?';
    try {
      const words = name.split(' ');
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return name[0].toUpperCase();
    } catch (error) {
      return '?';
    }
  }, []);

  // Enhanced contact item rendering
  const renderContactItem = useCallback(
    ({item: contact}) => (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handlePress(contact)}
        activeOpacity={0.7}>
        <View style={styles.contactContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {contact.avatar ? (
              <Image
                source={{uri: contact.avatar}}
                style={styles.avatar}
                onError={() => console.log('Avatar load error')}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {getInitials(contact.name)}
                </Text>
              </View>
            )}

            {/* Online Status Indicator */}
            {contact.isOnline && <View style={styles.onlineIndicator} />}
          </View>

          {/* Contact Info */}
          <View style={styles.contactInfo}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactName} numberOfLines={1}>
                {contact.name}
              </Text>

              {contact.lastMessageTime && (
                <Text style={styles.messageTime}>
                  {formatLastMessageTime(contact.lastMessageTime)}
                </Text>
              )}
            </View>

            <View style={styles.messageRow}>
              <View style={styles.lastMessageContainer}>
                {renderLastMessage(contact.lastMessage)}
              </View>

              {/* Unread Badge */}
              {contact.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Chevron */}
          <View style={styles.chevronContainer}>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handlePress, formatLastMessageTime, renderLastMessage, getInitials],
  );

  // Enhanced empty state
  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Icon name="chat-bubble-outline" size={48} color="#9CA3AF" />
        </View>

        <Text style={styles.emptyTitle}>No Conversations Yet</Text>

        <Text style={styles.emptyDescription}>
          {isAdmin
            ? 'Admin conversations will appear here when users contact support'
            : 'Start a conversation by browsing services and contacting business owners'}
        </Text>

        {!isAdmin && (
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Home')}>
            <Text style={styles.exploreButtonText}>Explore Services</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [isAdmin, navigation],
  );

  // Enhanced header
  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              {isAdmin ? 'Admin Messages' : 'Messages'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {contacts.length} conversation{contacts.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Admin Badge */}
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        )}
      </View>
    ),
    [isAdmin, contacts.length, navigation],
  );

  // Initialize on mount
  useEffect(() => {
    isMountedRef.current = true;

    const initializeContacts = async () => {
      await checkAdminStatus();
    };

    initializeContacts();

    return () => {
      isMountedRef.current = false;
      cleanupListeners();
      isDataFreshRef.current = false;
    };
  }, [checkAdminStatus, cleanupListeners]);

  // Fetch contacts when admin status is determined
  useEffect(() => {
    if (!adminLoading) {
      fetchContacts();
    }
  }, [adminLoading, fetchContacts]);

  // Smart focus effect - only refresh if data is stale
  useFocusEffect(
    useCallback(() => {
      // Only fetch if data is older than 2 minutes or empty
      const shouldRefresh =
        !isDataFreshRef.current ||
        contacts.length === 0 ||
        Date.now() - lastFetchTimeRef.current > 2 * 60 * 1000;

      if (shouldRefresh && !adminLoading) {
        console.log('🔄 Refreshing contacts on focus');
        fetchContacts();
      } else {
        console.log('✅ Using cached contacts data');
      }
    }, [fetchContacts, contacts.length, adminLoading]),
  );

  // Show loading while checking admin status
  if (adminLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />
        {renderHeader()}
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#8BC34A" />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />
      {renderHeader()}

      {error ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={item => item.chatId}
          renderItem={renderContactItem}
          ListEmptyComponent={loading ? null : renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8BC34A']}
              tintColor="#8BC34A"
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 80, // Approximate height of each contact item
            offset: 80 * index,
            index,
          })}
        />
      )}

      {loading && !refreshing && (
        <View style={styles.initialLoadingContainer}>
          <ActivityIndicator size="large" color="#8BC34A" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// ✅ Enhanced styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#8BC34A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8BC34A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContainer: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 20,
  },
  contactItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8BC34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    backgroundColor: '#10B981',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 16,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageContainer: {
    flex: 1,
    marginRight: 8,
  },
  noMessageText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  imageMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageMessageText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  lastMessageText: {
    fontSize: 14,
    color: '#6B7280',
  },
  unreadBadge: {
    backgroundColor: '#8BC34A',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  chevronContainer: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 32,
    padding: 24,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#8BC34A',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Contacts;
