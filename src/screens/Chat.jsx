/* eslint-disable no-unused-vars */
/* eslint-disable curly */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable no-trailing-spaces */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
  BackHandler,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PAGE_SIZE = 20;

// ✅ Error Boundary Component
class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(error) {
    return {hasError: true, error};
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chat Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Chat temporarily unavailable</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              this.setState({hasError: false, error: null});
              this.props.navigation.goBack();
            }}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const Chat = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // ✅ Enhanced parameter validation
  const params = route?.params;
  const [paramError, setParamError] = useState(null);

  useEffect(() => {
    if (!params || !params.chatId || !params.name || !params.recipientId) {
      setParamError('Chat information missing');
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    }
  }, [params]);

  if (paramError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="error-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{paramError}</Text>
        <Text style={styles.errorSubtext}>Returning to previous screen...</Text>
      </SafeAreaView>
    );
  }

  const {name, chatId, recipientId} = params;

  // ✅ Optimized state management
  const userId = useRef(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const unsubscribeRef = useRef(null);
  const flatListRef = useRef(null);
  const isMountedRef = useRef(true);

  // ✅ Enhanced user initialization with error handling
  const initializeUser = useCallback(async () => {
    try {
      setInitialLoading(true);

      // Get user ID with fallbacks
      const authToken = await AsyncStorage.getItem('authToken');
      const currentUser = auth().currentUser;
      const uid = authToken || currentUser?.uid;

      if (!uid) {
        throw new Error('User not authenticated');
      }

      userId.current = uid;
      console.log('✅ Chat initialized for user:', uid);

      // Get current user data with timeout
      const userDocRef = firestore().collection('Users').doc(uid);
      const userDoc = await Promise.race([
        userDocRef.get(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000),
        ),
      ]);

      if (userDoc.exists && isMountedRef.current) {
        const userData = userDoc.data();
        setCurrentUserData(userData);
        console.log('✅ User data loaded:', userData?.fullName || 'Unknown');
      }

      // Initialize messages after user is set
      if (isMountedRef.current) {
        await fetchMessages();
      }
    } catch (error) {
      console.error('❌ Error initializing user:', error);
      if (isMountedRef.current) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to chat. Please check your internet connection.',
          [
            {text: 'Retry', onPress: initializeUser},
            {text: 'Go Back', onPress: () => navigation.goBack()},
          ],
        );
      }
    } finally {
      if (isMountedRef.current) {
        setInitialLoading(false);
      }
    }
  }, [chatId]);

  // ✅ Optimized message fetching with React Native Firebase
  const fetchMessages = useCallback(async () => {
    if (!userId.current || !isMountedRef.current) return;

    try {
      setLoading(true);

      // Cleanup existing listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      const messagesRef = firestore()
        .collection('Chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(PAGE_SIZE);

      // Get initial messages
      const snapshot = await messagesRef.get();

      let msgs = [];
      let lastDoc = null;

      if (!snapshot.empty && isMountedRef.current) {
        msgs = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type || 'text',
            content: data.content || data.input || '',
            sender: data.sender || data.senderId || '',
            timestamp: data.createdAt?.toDate() || new Date(),
            readBy: data.readBy || [],
          };
        });
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        setMessages(msgs);
        setLastVisible(lastDoc);
      }

      // Set up real-time listener with error handling
      unsubscribeRef.current = messagesRef.onSnapshot(
        async snap => {
          if (!isMountedRef.current) return;

          try {
            const liveMsgs = snap.docs.map(docSnap => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                type: data.type || 'text',
                content: data.content || data.input || '',
                sender: data.sender || data.senderId || '',
                timestamp: data.createdAt?.toDate() || new Date(),
                readBy: data.readBy || [],
              };
            });

            setMessages(liveMsgs);
            await markMessagesAsRead(liveMsgs);
          } catch (error) {
            console.error('❌ Error in message listener:', error);
          }
        },
        error => {
          console.error('❌ Message listener error:', error);
          // Attempt to reconnect after delay
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchMessages();
            }
          }, 5000);
        },
      );

      console.log(`✅ Loaded ${msgs.length} messages for chat: ${chatId}`);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to load messages. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [chatId]);

  // ✅ Optimized mark as read with batch operations
  const markMessagesAsRead = useCallback(
    async msgs => {
      if (!userId.current || !isMountedRef.current) return;

      try {
        const unreadMsgs = msgs.filter(
          msg =>
            msg.sender !== userId.current &&
            !(msg.readBy || []).includes(userId.current),
        );

        if (unreadMsgs.length === 0) return;

        const batch = firestore().batch();
        const messagesRef = firestore()
          .collection('Chats')
          .doc(chatId)
          .collection('messages');

        unreadMsgs.forEach(msg => {
          const msgRef = messagesRef.doc(msg.id);
          batch.update(msgRef, {
            readBy: firestore.FieldValue.arrayUnion(userId.current),
          });
        });

        await batch.commit();
        console.log(`✅ Marked ${unreadMsgs.length} messages as read`);
      } catch (error) {
        console.error('❌ Error marking messages as read:', error);
      }
    },
    [chatId],
  );

  // ✅ Enhanced send message with validation
  const sendMessage = useCallback(async () => {
    if (!input.trim() || sendingMessage) return;

    // Validation
    if (!userId.current) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!recipientId) {
      Alert.alert('Error', 'Recipient not specified');
      return;
    }

    const messageContent = input.trim();
    setInput('');
    setSendingMessage(true);

    try {
      const messagesRef = firestore()
        .collection('Chats')
        .doc(chatId)
        .collection('messages');

      const newMessage = {
        type: 'text',
        content: messageContent,
        sender: userId.current,
        recipientId: recipientId,
        createdAt: firestore.FieldValue.serverTimestamp(),
        readBy: [userId.current],
      };

      await messagesRef.add(newMessage);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setInput(messageContent); // Restore input on error
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  }, [input, chatId, recipientId, sendingMessage]);

  // ✅ Enhanced image permission handling
  const requestImagePermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            {
              title: 'Photo Access Permission',
              message: 'This app needs access to your photos to send images',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Storage Access Permission',
              message: 'This app needs access to your storage to send images',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (error) {
        console.error('Permission error:', error);
        return false;
      }
    }
    return true;
  }, []);

  // ✅ Enhanced send image with error handling
  const sendImage = useCallback(async () => {
    try {
      const hasPermission = await requestImagePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Cannot access photos without permission',
        );
        return;
      }

      const options = {
        mediaType: 'photo',
        includeBase64: true,
        maxHeight: 800,
        maxWidth: 800,
        quality: 0.8,
        storageOptions: {
          skipBackup: true,
          path: 'images',
        },
      };

      launchImageLibrary(options, async response => {
        if (response.didCancel || response.error) {
          console.log('Image selection cancelled or failed');
          return;
        }

        if (!response.assets?.length || !userId.current) {
          Alert.alert('Error', 'No image selected');
          return;
        }

        try {
          setSendingMessage(true);
          const asset = response.assets[0];
          const base64Image = `data:${asset.type};base64,${asset.base64}`;

          const messagesRef = firestore()
            .collection('Chats')
            .doc(chatId)
            .collection('messages');

          const imageMessage = {
            type: 'image',
            content: base64Image,
            sender: userId.current,
            recipientId: recipientId,
            createdAt: firestore.FieldValue.serverTimestamp(),
            readBy: [userId.current],
          };

          await messagesRef.add(imageMessage);
          console.log('✅ Image sent successfully');
        } catch (error) {
          console.error('❌ Error sending image:', error);
          Alert.alert('Error', 'Failed to send image');
        } finally {
          setSendingMessage(false);
        }
      });
    } catch (error) {
      console.error('❌ Error launching image picker:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  }, [chatId, recipientId, requestImagePermission]);

  // ✅ Load more messages with pagination
  const loadMoreMessages = useCallback(async () => {
    if (loading || !lastVisible || !userId.current) return;

    try {
      setLoading(true);

      const messagesRef = firestore()
        .collection('Chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .startAfter(lastVisible)
        .limit(PAGE_SIZE);

      const snapshot = await messagesRef.get();

      if (!snapshot.empty && isMountedRef.current) {
        const newMsgs = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type || 'text',
            content: data.content || data.input || '',
            sender: data.sender || data.senderId || '',
            timestamp: data.createdAt?.toDate() || new Date(),
            readBy: data.readBy || [],
          };
        });

        setMessages(prev => [...prev, ...newMsgs]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        await markMessagesAsRead(newMsgs);
      } else {
        setLastVisible(null);
      }
    } catch (error) {
      console.error('❌ Error loading more messages:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, lastVisible, chatId, markMessagesAsRead]);

  // ✅ Enhanced message rendering with error protection
  const renderMessage = useCallback(
    ({item}) => {
      try {
        const isMyMessage = item.sender === userId.current;
        const isRead = item.readBy && item.readBy.includes(recipientId);

        return (
          <View
            style={[styles.message, isMyMessage ? styles.right : styles.left]}>
            {item.type === 'text' ? (
              <Text style={styles.text}>{item.content || ''}</Text>
            ) : item.type === 'image' ? (
              <Image
                source={{uri: item.content}}
                style={styles.image}
                onError={() => console.log('Image load error')}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.text}>Unsupported message type</Text>
            )}

            <View style={styles.messageFooter}>
              <Text style={styles.timestamp}>
                {item.timestamp?.toLocaleTimeString?.([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }) || 'Time unavailable'}
              </Text>

              {isMyMessage && (
                <Text
                  style={[
                    styles.readStatus,
                    {color: isRead ? '#4CAF50' : '#9E9E9E'},
                  ]}>
                  {isRead ? '✓✓' : '✓'}
                </Text>
              )}
            </View>
          </View>
        );
      } catch (error) {
        console.error('Error rendering message:', error);
        return (
          <View style={styles.errorMessage}>
            <Text style={styles.errorText}>Message unavailable</Text>
          </View>
        );
      }
    },
    [recipientId],
  );

  // ✅ Back handler
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription?.remove();
    }, [navigation]),
  );

  // ✅ Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    initializeUser();

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      console.log('✅ Chat cleanup completed');
    };
  }, [initializeUser]);

  // ✅ Loading state
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text style={styles.loadingText}>Connecting to chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <ChatErrorBoundary navigation={navigation}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{name || 'Chat'}</Text>
              <Text style={styles.headerSubtitle}>
                {recipientId ? 'Active' : 'Chat'}
              </Text>
            </View>

            <TouchableOpacity style={styles.headerAction}>
              <Icon name="more-vert" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => item.id || index.toString()}
            inverted
            contentContainerStyle={styles.messagesList}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.1}
            refreshing={refreshing}
            onRefresh={fetchMessages}
            ListFooterComponent={
              loading && lastVisible ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#8BC34A" />
                  <Text style={styles.loadingMoreText}>Loading more...</Text>
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={20}
            windowSize={10}
          />

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              onPress={sendImage}
              style={styles.iconButton}
              disabled={sendingMessage}>
              <Icon name="photo-camera" size={24} color="#8BC34A" />
            </TouchableOpacity>

            <TextInput
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
              style={styles.input}
              multiline
              maxLength={1000}
              editable={!sendingMessage}
            />

            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendButton,
                {opacity: input.trim() && !sendingMessage ? 1 : 0.5},
              ]}
              disabled={!input.trim() || sendingMessage}>
              {sendingMessage ? (
                <ActivityIndicator size="small" color="#8BC34A" />
              ) : (
                <Icon name="send" size={24} color="#8BC34A" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ChatErrorBoundary>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    marginTop: 10,
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 5,
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#8BC34A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  header: {
    height: 60,
    backgroundColor: '#8BC34A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    paddingRight: 12,
    paddingVertical: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#e8f5e8',
    marginTop: 2,
  },
  headerAction: {
    paddingLeft: 12,
    paddingVertical: 8,
  },
  messagesList: {
    padding: 10,
    paddingBottom: 20,
  },
  message: {
    marginVertical: 4,
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  left: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  right: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6',
    borderBottomRightRadius: 4,
  },
  text: {
    fontSize: 16,
    color: '#333',
    lineHeight: 20,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
  },
  readStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorMessage: {
    marginVertical: 4,
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#ffebee',
    alignSelf: 'center',
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingMoreText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    maxHeight: 100,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginLeft: 8,
  },
});

export default Chat;
