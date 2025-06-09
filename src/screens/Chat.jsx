import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
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
} from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAGE_SIZE = 20;
const db = getFirestore();

const Chat = ({ route }) => {
  const { name, chatId } = route.params;
  const navigation = useNavigation();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const unsubscribeRef = useRef(null);

  // Mark unread messages as read
  const markMessagesAsRead = useCallback(async (msgs) => {
    const userId = await AsyncStorage.getItem('authToken');
    const unreadMsgs = msgs.filter(
      msg => msg.sender !== userId && !(msg.readBy || []).includes(userId)
    );
    await Promise.all(
      unreadMsgs.map(msg => {
        const msgRef = doc(db, 'Chats', chatId, 'messages', msg.id);
        return updateDoc(msgRef, {
          readBy: arrayUnion(userId),
        });
      })
    );
  }, [chatId]);

  // Fetch latest messages (first page) and set up real-time listener for new messages
  const fetchMessages = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);

    if (unsubscribeRef.current) unsubscribeRef.current();

    const messagesRef = collection(db, 'Chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
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

    // Real-time listener for new messages (first page)
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
      if (liveMsgs.length) {
        await markMessagesAsRead(liveMsgs);
      }
    });

    setLoading(false);
    setRefreshing(false);
  }, [chatId, markMessagesAsRead]);

  // Fetch more messages (pagination)
  const fetchMoreMessages = async () => {
    if (loading || !lastVisible) return;
    setLoading(true);

    const messagesRef = collection(db, 'Chats', chatId, 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
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
    } else {
      setLastVisible(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [chatId, fetchMessages]);

  // Send text message
  const sendMessage = async () => {
    if (input.trim()) {
      const userId = await AsyncStorage.getItem('authToken');
      const messagesRef = collection(db, 'Chats', chatId, 'messages');
      const newMessage = {
        type: 'text',
        content: input.trim(),
        sender: userId,
        createdAt: serverTimestamp(),
        readBy: [userId],
      };
      await addDoc(messagesRef, newMessage);
      setInput('');
    }
  };

  // Send image message
  const sendImage = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );
    }

    launchImageLibrary({ mediaType: 'photo', includeBase64: true }, async response => {
      if (!response.didCancel && response.assets?.length) {
        const asset = response.assets[0];
        const base64Image = `data:${asset.type};base64,${asset.base64}`;
        const userId = await AsyncStorage.getItem('authToken');
        const messagesRef = collection(db, 'Chats', chatId, 'messages');
        const imageMessage = {
          type: 'image',
          content: base64Image,
          sender: userId,
          createdAt: serverTimestamp(),
          readBy: [userId],
        };
        await addDoc(messagesRef, imageMessage);
      }
    });
  };

  // Render each message
  const renderItem = ({ item }) => (
    <View
      style={[
        styles.message,
        item.sender === name ? styles.left : styles.right,
      ]}
    >
      {item.type === 'text' ? (
        <Text style={styles.text}>{item.content}</Text>
      ) : (
        <Image source={{ uri: item.content }} style={styles.image} />
      )}
      <Text style={styles.timestamp}>
        {item.sender === name ? name : 'You'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>❮</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{name}</Text>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={{ padding: 10 }}
        onEndReached={fetchMoreMessages}
        onEndReachedThreshold={0.1}
        refreshing={refreshing}
        onRefresh={fetchMessages}
        ListFooterComponent={
          loading && lastVisible ? <ActivityIndicator size="small" /> : null
        }
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={sendImage} style={styles.iconButton}>
          <Text style={{ fontSize: 20 }}>📷</Text>
        </TouchableOpacity>
        <TextInput
          placeholder="Type a message"
          value={input}
          onChangeText={setInput}
          style={styles.input}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.iconButton}>
          <Text style={{ fontSize: 18 }}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Chat;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 60,
    backgroundColor: '#8bc348',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 4,
  },
  backButton: {
    paddingRight: 12,
  },
  backText: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  message: {
    marginVertical: 6,
    maxWidth: '70%',
    padding: 10,
    borderRadius: 10,
  },
  left: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e0e0',
  },
  right: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6',
  },
  text: {
    fontSize: 16,
  },
  image: {
    width: 180,
    height: 180,
    borderRadius: 10,
  },
  timestamp: {
    marginTop: 4,
    fontSize: 10,
    color: '#555',
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#C5E1A5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 6,
  },
  iconButton: {
    paddingHorizontal: 10,
  },
});
