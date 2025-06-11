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
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {launchImageLibrary} from 'react-native-image-picker';
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  getDoc,
} from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';

const PAGE_SIZE = 20;
const db = getFirestore();

const Chat = ({route}) => {
  const {name, chatId, recipientId} = route.params;
  const navigation = useNavigation();
  const userId = useRef(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const unsubscribeRef = useRef(null);

  // ✅ Initialize userId and user data
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Get user ID from AsyncStorage or Firebase Auth
        const authToken = await AsyncStorage.getItem('authToken');
        const currentUser = auth().currentUser;

        const uid = authToken || currentUser?.uid;

        if (!uid) {
          Alert.alert('Error', 'User not authenticated');
          navigation.goBack();
          return;
        }

        userId.current = uid;
        console.log('✅ Chat initialized for user:', uid);

        // Get current user data for notifications
        const userDoc = await getDoc(doc(db, 'Users', uid));
        if (userDoc.exists()) {
          setCurrentUserData(userDoc.data());
          console.log('✅ User data loaded:', userDoc.data().fullName);
        } else {
          console.warn('⚠️ User document not found');
        }

        // Initialize chat messages
        fetchMessages();
      } catch (error) {
        console.error('❌ Error initializing user:', error);
        Alert.alert('Error', 'Failed to initialize chat');
      }
    };

    initializeUser();
  }, [chatId]);

  // Mark unread messages as read
  const markMessagesAsRead = useCallback(
    async msgs => {
      if (!userId.current) return;

      const unreadMsgs = msgs.filter(
        msg =>
          msg.sender !== userId.current &&
          !(msg.readBy || []).includes(userId.current),
      );

      if (unreadMsgs.length === 0) return;

      try {
        await Promise.all(
          unreadMsgs.map(msg => {
            const msgRef = doc(db, 'Chats', chatId, 'messages', msg.id);
            return updateDoc(msgRef, {
              readBy: arrayUnion(userId.current),
            });
          }),
        );
        console.log(`✅ Marked ${unreadMsgs.length} messages as read`);
      } catch (error) {
        console.error('❌ Error marking messages as read:', error);
      }
    },
    [chatId],
  );

  // Fetch latest messages and set up real-time listener
  const fetchMessages = useCallback(async () => {
    if (!userId.current) return;

    setRefreshing(true);
    setLoading(true);

    try {
      // Cleanup existing listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      const messagesRef = collection(db, 'Chats', chatId, 'messages');
      const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE),
      );

      const snapshot = await getDocs(q);

      let msgs = [];
      let lastDoc = null;

      if (!snapshot.empty) {
        msgs = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type || 'text',
            content: data.content || data.input || '',
            sender: data.sender || data.senderId || '',
            timestamp: data.createdAt ? data.createdAt.toDate() : new Date(),
            readBy: data.readBy || [],
          };
        });
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }

      setMessages(msgs);
      setLastVisible(lastDoc);

      // Set up real-time listener for new messages
      unsubscribeRef.current = onSnapshot(q, async snap => {
        const liveMsgs = snap.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type || 'text',
            content: data.content || data.input || '',
            sender: data.sender || data.senderId || '',
            timestamp: data.createdAt ? data.createdAt.toDate() : new Date(),
            readBy: data.readBy || [],
          };
        });

        setMessages(liveMsgs);

        if (liveMsgs.length > 0) {
          await markMessagesAsRead(liveMsgs);
        }
      });

      console.log(`✅ Loaded ${msgs.length} messages for chat: ${chatId}`);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [chatId, markMessagesAsRead]);

  // Fetch more messages (pagination)
  const fetchMoreMessages = async () => {
    if (loading || !lastVisible || !userId.current) return;

    setLoading(true);

    try {
      const messagesRef = collection(db, 'Chats', chatId, 'messages');
      const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(PAGE_SIZE),
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const newMsgs = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type || 'text',
            content: data.content || data.input || '',
            sender: data.sender || data.senderId || '',
            timestamp: data.createdAt ? data.createdAt.toDate() : new Date(),
            readBy: data.readBy || [],
          };
        });

        setMessages(prev => [...prev, ...newMsgs]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

        // Mark these messages as read
        await markMessagesAsRead(newMsgs);

        console.log(`✅ Loaded ${newMsgs.length} more messages`);
      } else {
        setLastVisible(null);
        console.log('✅ No more messages to load');
      }
    } catch (error) {
      console.error('❌ Error fetching more messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        console.log('✅ Chat listener cleaned up');
      }
    };
  }, []);

  // ✅ Send text message with Cloud Function notification
  // ✅ Enhanced sendMessage with undefined value checks
  const sendMessage = async () => {
    if (!input.trim()) {
      console.warn('Empty message, not sending');
      return;
    }

    // ✅ Validate required fields
    if (!userId.current) {
      console.error('User ID not available');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!recipientId) {
      console.error('Recipient ID not available');
      Alert.alert('Error', 'Recipient not specified');
      return;
    }

    if (!chatId) {
      console.error('Chat ID not available');
      Alert.alert('Error', 'Chat not properly initialized');
      return;
    }

    const messageContent = input.trim();
    setInput(''); // Clear input immediately for better UX

    try {
      const messagesRef = collection(db, 'Chats', chatId, 'messages');

      // ✅ FIXED: Create message object with proper validation
      const newMessage = {
        type: 'text',
        content: messageContent,
        sender: userId.current,
        recipientId: recipientId, // ✅ Ensure this is not undefined
        createdAt: serverTimestamp(),
        readBy: [userId.current],
      };

      // ✅ Debug log to check for undefined values
      console.log('📤 Sending message:', {
        type: newMessage.type,
        contentLength: newMessage.content.length,
        sender: newMessage.sender,
        recipientId: newMessage.recipientId,
        chatId: chatId,
        hasServerTimestamp: !!newMessage.createdAt,
        readByLength: newMessage.readBy.length,
      });

      // ✅ Validate message object before sending
      Object.entries(newMessage).forEach(([key, value]) => {
        if (value === undefined) {
          console.error(`❌ Field '${key}' is undefined`);
          throw new Error(`Field '${key}' cannot be undefined`);
        }
      });

      console.log('📤 Sending message to recipient:', recipientId);

      // Send message to Firestore (Cloud Function will handle notification)
      await addDoc(messagesRef, newMessage);

      console.log(
        '✅ Message sent successfully - Cloud Function will handle notification automatically',
      );
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message: ' + error.message);
      setInput(messageContent); // Restore input on error
    }
  };

  async function requestImagePermission() {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        // Android 13+
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // Android 12 and below
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    // iOS: handled by the image picker itself
    return true;
  }

  // ✅ Send image with Cloud Function notification
  const sendImage = async () => {
    try {
      // Request permission for Android
      if (Platform.OS === 'android') {
        const granted = await requestImagePermission();
        if (!granted) {
          Alert.alert('Permission Denied', 'Cannot access photos');
          return;
        }
      }

      launchImageLibrary(
        {
          mediaType: 'photo',
          includeBase64: true,
          maxHeight: 800,
          maxWidth: 800,
          quality: 0.8,
        },
        async response => {
          if (response.didCancel || response.error) {
            console.log('Image selection cancelled or failed');
            return;
          }

          if (!response.assets?.length || !userId.current) {
            Alert.alert('Error', 'No image selected');
            return;
          }

          try {
            const asset = response.assets[0];
            const base64Image = `data:${asset.type};base64,${asset.base64}`;

            const messagesRef = collection(db, 'Chats', chatId, 'messages');
            const imageMessage = {
              type: 'image',
              content: base64Image,
              sender: userId.current,
              recipientId: recipientId, // ✅ This triggers Cloud Function
              createdAt: serverTimestamp(),
              readBy: [userId.current],
            };

            console.log('📤 Sending image to:', recipientId);

            // Send image message (Cloud Function will handle notification)
            await addDoc(messagesRef, imageMessage);

            console.log(
              '✅ Image sent - Cloud Function will handle notification automatically',
            );
          } catch (error) {
            console.error('❌ Error sending image:', error);
            Alert.alert('Error', 'Failed to send image');
          }
        },
      );
    } catch (error) {
      console.error('❌ Error launching image picker:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  // Render each message
  const renderItem = ({item}) => {
    const isMyMessage = item.sender === userId.current;
    const isRead = item.readBy && item.readBy.includes(recipientId);

    return (
      <View style={[styles.message, isMyMessage ? styles.right : styles.left]}>
        {item.type === 'text' ? (
          <Text style={styles.text}>{item.content}</Text>
        ) : (
          <Image source={{uri: item.content}} style={styles.image} />
        )}

        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
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
  };

  // Show loading state
  if (!userId.current) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8bc348" />
        <Text style={styles.loadingText}>Initializing chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        
      >
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backText}>❮</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{name}</Text>
          <Text style={styles.headerSubtitle}>
            {recipientId ? 'Online' : 'Chat'}
          </Text>
        </View>

        <TouchableOpacity style={styles.headerAction}>
          <Text style={styles.headerActionText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.messagesList}
        onEndReached={fetchMoreMessages}
        onEndReachedThreshold={0.1}
        refreshing={refreshing}
        onRefresh={fetchMessages}
        ListFooterComponent={
          loading && lastVisible ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#8bc348" />
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={sendImage} style={styles.iconButton}>
          <Text style={styles.iconText}>📷</Text>
        </TouchableOpacity>

        <TextInput
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
          style={styles.input}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          onPress={sendMessage}
          style={[styles.sendButton, {opacity: input.trim() ? 1 : 0.5}]}
          disabled={!input.trim()}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
    </KeyboardAvoidingView>
  );
};

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
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    height: 60,
    backgroundColor: '#8bc348',
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
  backText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
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
  headerActionText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
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
    marginBottom: 10,
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginRight: 8,
  },
  iconText: {
    fontSize: 20,
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
  sendText: {
    fontSize: 20,
    color: '#8bc348',
    fontWeight: 'bold',
  },
});

export default Chat;
