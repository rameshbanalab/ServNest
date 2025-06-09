import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
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
import { useNavigation } from '@react-navigation/native';

const db = getFirestore();

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    let unsubscribes = [];
    let isMounted = true;

    const fetchContacts = async () => {
      setLoading(true);
      const userId = await AsyncStorage.getItem('authToken');
      const userRef = doc(db, 'Users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setContacts([]);
        setLoading(false);
        return;
      }

      const chatIdsMap = userSnap.data().chatIds || {};
      const contactEntries = Object.entries(chatIdsMap);
      console.log('Fetching contacts:', contactEntries);
      // Fetch contact info and last message for each chat
      const promises = contactEntries.map(async ([otherUserId, chatId]) => {
        // Get contact's name (assuming Users/{otherUserId} has a 'name' field)
        const contactRef = doc(db, 'Users', otherUserId);
        const contactSnap = await getDoc(contactRef);
        console.log('Contact name:', contactSnap);
        const contactName = contactSnap.exists() ? contactSnap.data().fullName || 'Unknown' : 'Unknown';

        // Listen for the last message in the chat
        const messagesRef = collection(db, 'Chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
        let lastMessage = null;
        let unreadCount = 0;

        // Listen for unread messages (assuming messages have a 'readBy' array)
        const unsubscribe = onSnapshot(
          query(messagesRef, orderBy('createdAt', 'desc'), limit(10)),
          snap => {
            if (!snap.empty) {
              const msgs = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
              lastMessage = msgs[0];
              // Count unread messages (not read by current user)
              unreadCount = msgs.filter(
                msg => !(msg.readBy || []).includes(userId) && msg.sender !== userId
              ).length;
              // Update contact in state
              setContacts(prev =>
                prev.map(c =>
                  c.chatId === chatId
                    ? { ...c, lastMessage, unreadCount }
                    : c
                )
              );
            }
          }
        );
        unsubscribes.push(unsubscribe);

        return {
          userId: otherUserId,
          name: contactName,
          chatId,
          lastMessage,
          unreadCount,
        };
      });

      const results = await Promise.all(promises);
      if (isMounted) setContacts(results);
      setLoading(false);
    };

    fetchContacts();

    return () => {
      isMounted = false;
      unsubscribes.forEach(unsub => unsub && unsub());
    };
  }, []);

  const renderLastMessage = msg => {
    if (!msg) return <Text style={styles.lastMsg}>No messages yet</Text>;
    if (msg.type === 'image') return <Text style={styles.lastMsg}>📷 Image</Text>;
    return <Text style={styles.lastMsg} numberOfLines={1}>{msg.content}</Text>;
  };

  const handlePress = (contact) => {
    console.log("Clicked on contact: ", contact.name, " chatId: ", contact.chatId);
    navigation.navigate('Chat', { name: contact.name, chatId: contact.chatId });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={contacts}
      keyExtractor={item => item.chatId}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => handlePress(item)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name[0]}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            {renderLastMessage(item.lastMessage)}
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.center}><Text>No contacts yet.</Text></View>
      }
    />
  );
};

export default Contacts;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8bc34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#374151',
  },
  lastMsg: {
    color: '#555',
    fontSize: 14,
    marginTop: 2,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F9D923',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#374151',
    fontWeight: 'bold',
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
});
