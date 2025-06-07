import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { db } from '../config/firebaseConfig';
const Chat = ({ route }) => {
  const { name,chatId } = route.params;
  console.log(route.params)
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (input.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        type: 'text',
        content: input.trim(),
        sender: 'You',
        timestamp: new Date(),
      };

      setMessages([newMessage, ...messages]);
      setInput('');
    }
  };

  const sendImage = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
    }

    launchImageLibrary({ mediaType: 'photo', includeBase64: true }, (response) => {
      if (!response.didCancel && response.assets?.length) {
        const asset = response.assets[0];
        const base64Image = `data:${asset.type};base64,${asset.base64}`;

        const imageMessage = {
          id: Date.now().toString(),
          type: 'image',
          content: base64Image,
          sender: 'You',
          timestamp: new Date(),
        };

        setMessages([imageMessage, ...messages]);
      }
    });
    console.log(messages)
  };

  const renderItem = ({ item }) => (
    <View style={[styles.message, item.sender === 'You' ? styles.right : styles.left]}>
      {item.type === 'text' ? (
        <Text style={styles.text}>{item.content}</Text>
      ) : (
        <Image source={{ uri: item.content }} style={styles.image} />
      )}
      <Text style={styles.timestamp}>{item.sender === 'You' ? 'You' : name}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>❮</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{name}</Text>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={{ padding: 10 }}
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
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 6,
    backgroundColor: '#C5E1A5',
  },
  iconButton: {
    paddingHorizontal: 10,
  },
});
