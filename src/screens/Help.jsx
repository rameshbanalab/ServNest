import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  addDoc
} from '@react-native-firebase/firestore';
import {useTranslation} from 'react-i18next';

const db = getFirestore();

const Help = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Admin user ID - Replace with your actual admin user ID
  const ADMIN_USER_ID = '5UeD72ZyTaWeivFjT312E343ay33';

  // Enhanced Chat with Admin function
  const handleChatWithAdmin = async () => {
    try {
      setChatLoading(true);

      // Get current user ID
      const userId = (await AsyncStorage.getItem('authToken')) || auth().currentUser?.uid;
      
      if (!userId) {
        Alert.alert(t('help.auth_required'), t('help.login_to_chat'));
        navigation.navigate('Login');
        return;
      }

      // Get current user data
      const userRef = doc(db, 'Users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        Alert.alert(t('help.error'), t('help.user_profile_not_found'));
        return;
      }

      const userData = userSnap.data();
      const userName = userData.fullName || userData.name || 'User';

      // Create or get existing chat with admin
      const chatId = await createOrGetAdminChat(userId, userName);
      
      if (chatId) {
        navigation.navigate('Chats', {
          screen: 'Chat',
          params: {
            name: t('help.admin_support'),
            chatId: chatId,
            recipientId: ADMIN_USER_ID,
          }
        });
      }

    } catch (error) {
      console.error('Error starting chat with admin:', error);
      Alert.alert(t('help.error'), t('help.failed_start_chat'));
    } finally {
      setChatLoading(false);
    }
  };

  // Create or get existing chat with admin
  const createOrGetAdminChat = async (userId, userName) => {
    try {
      // Check if user already has a chat with admin
      const userRef = doc(db, 'Users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const chatIds = userSnap.data().chatIds || {};
        
        // Check if admin chat already exists
        if (chatIds[ADMIN_USER_ID]) {
          console.log('Existing admin chat found:', chatIds[ADMIN_USER_ID]);
          return chatIds[ADMIN_USER_ID];
        }
      }

      // Create new chat ID
      const chatId = `admin_${userId}_${Date.now()}`;
      
      // Update user's chatIds
      await updateDoc(userRef, {
        [`chatIds.${ADMIN_USER_ID}`]: chatId
      });

      // Update admin's chatIds
      const adminRef = doc(db, 'Users', ADMIN_USER_ID);
      const adminSnap = await getDoc(adminRef);
      
      if (adminSnap.exists()) {
        await updateDoc(adminRef, {
          [`chatIds.${userId}`]: chatId
        });
      } else {
        // Create admin document if it doesn't exist
        await setDoc(adminRef, {
          fullName: t('help.admin_support'),
          email: 'admin@servenest.com',
          role: 'admin',
          chatIds: {
            [userId]: chatId
          }
        });
      }

      // Send initial welcome message from admin
      await sendInitialAdminMessage(chatId, userId, userName);

      console.log('New admin chat created:', chatId);
      return chatId;

    } catch (error) {
      console.error('Error creating admin chat:', error);
      throw error;
    }
  };

  // Send initial welcome message from admin
  const sendInitialAdminMessage = async (chatId, userId, userName) => {
    try {
      const messagesRef = collection(db, 'Chats', chatId, 'messages');
      
      const welcomeMessage = {
        type: 'text',
        content: t('help.welcome_message', {userName}),
        sender: ADMIN_USER_ID,
        recipientId: userId,
        createdAt: serverTimestamp(),
        readBy: [ADMIN_USER_ID],
      };

      await addDoc(messagesRef, welcomeMessage);
      console.log('Initial admin message sent');
    } catch (error) {
      console.error('Error sending initial admin message:', error);
    }
  };

  // FAQ Categories
  const faqCategories = [
    {
      id: 1,
      title: t('help.getting_started'),
      icon: 'play-circle-outline',
      color: '#8BC34A',
      questions: [
        {
          question: t('help.how_create_account'),
          answer: t('help.create_account_answer'),
        },
        {
          question: t('help.how_find_services'),
          answer: t('help.find_services_answer'),
        },
        {
          question: t('help.is_servenest_free'),
          answer: t('help.servenest_free_answer'),
        },
      ],
    },
    {
      id: 2,
      title: t('help.booking_services'),
      icon: 'event-note',
      color: '#2196F3',
      questions: [
        {
          question: t('help.how_book_service'),
          answer: t('help.book_service_answer'),
        },
        {
          question: t('help.can_cancel_booking'),
          answer: t('help.cancel_booking_answer'),
        },
        {
          question: t('help.how_know_reliable'),
          answer: t('help.reliable_provider_answer'),
        },
      ],
    },
    {
      id: 3,
      title: t('help.account_profile'),
      icon: 'account-circle',
      color: '#FF9800',
      questions: [
        {
          question: t('help.how_update_profile'),
          answer: t('help.update_profile_answer'),
        },
        {
          question: t('help.how_change_password'),
          answer: t('help.change_password_answer'),
        },
        {
          question: t('help.can_delete_account'),
          answer: t('help.delete_account_answer'),
        },
      ],
    },
    {
      id: 4,
      title: t('help.business_registration'),
      icon: 'business',
      color: '#9C27B0',
      questions: [
        {
          question: t('help.how_register_business'),
          answer: t('help.register_business_answer'),
        },
        {
          question: t('help.verification_time'),
          answer: t('help.verification_time_answer'),
        },
        {
          question: t('help.can_edit_business'),
          answer: t('help.edit_business_answer'),
        },
      ],
    },
  ];

  // Updated Quick Actions with enhanced Chat with Admin
  const quickActions = [
    {
      id: 1,
      title: t('help.chat_with_admin'),
      subtitle: t('help.get_instant_help'),
      icon: 'chat',
      color: '#4CAF50',
      action: handleChatWithAdmin,
      loading: chatLoading,
    },
    {
      id: 2,
      title: t('help.email_us'),
      subtitle: t('help.send_message'),
      icon: 'email',
      color: '#2196F3',
      action: () => Linking.openURL('mailto:support@servenest.com'),
    },
    {
      id: 3,
      title: t('help.whatsapp'),
      subtitle: t('help.chat_support'),
      icon: 'chat',
      color: '#25D366',
      action: () =>
        Linking.openURL(
          `whatsapp://send?phone=919876543210&text=${t('help.whatsapp_message')}`,
        ),
    },
    {
      id: 4,
      title: t('help.report_issue'),
      subtitle: t('help.technical_problems'),
      icon: 'bug-report',
      color: '#FF5722',
      action: () => setSelectedCategory('contact'),
    },
  ];

  const filteredFAQs = faqCategories.filter(
    category =>
      category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.questions.some(
        q =>
          q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.answer.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  const handleContactSubmit = async () => {
    if (
      !contactForm.name ||
      !contactForm.email ||
      !contactForm.subject ||
      !contactForm.message
    ) {
      Alert.alert(t('help.missing_information'), t('help.fill_required_fields'));
      return;
    }

    setSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        t('help.message_sent'),
        t('help.thank_you_message'),
        [
          {
            text: t('help.ok'),
            onPress: () => {
              setContactForm({name: '', email: '', subject: '', message: ''});
              setSelectedCategory(null);
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(t('help.error'), t('help.failed_send_message'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderFAQItem = (item, categoryColor) => (
    <View
      key={item.question}
      className="bg-white rounded-xl p-4 mb-3 border border-gray-200 shadow-sm">
      <View className="flex-row items-start">
        <View
          className="rounded-full p-2 mr-3 mt-1"
          style={{backgroundColor: `${categoryColor}20`}}>
          <Icon name="help-outline" size={16} color={categoryColor} />
        </View>
        <View className="flex-1">
          <Text className="text-gray-800 font-semibold text-base mb-2">
            {item.question}
          </Text>
          <Text className="text-gray-600 text-sm leading-5">{item.answer}</Text>
        </View>
      </View>
    </View>
  );

  const renderContactForm = () => (
    <View className="px-6 py-6">
      <View className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <View className="flex-row items-center mb-6">
          <View className="bg-primary-light rounded-full p-3 mr-4">
            <Icon name="support-agent" size={24} color="#689F38" />
          </View>
          <View>
            <Text className="text-gray-800 font-bold text-lg">
              {t('help.contact_support')}
            </Text>
            <Text className="text-gray-600 text-sm">
              {t('help.here_to_help')}
            </Text>
          </View>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-gray-700 font-medium text-sm mb-2">
              {t('help.full_name')} *
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-gray-800"
              placeholder={t('help.enter_full_name')}
              placeholderTextColor="#9CA3AF"
              value={contactForm.name}
              onChangeText={text =>
                setContactForm(prev => ({...prev, name: text}))
              }
            />
          </View>

          <View>
            <Text className="text-gray-700 font-medium text-sm mb-2">
              {t('help.email_address')} *
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-gray-800"
              placeholder={t('help.enter_email')}
              placeholderTextColor="#9CA3AF"
              value={contactForm.email}
              onChangeText={text =>
                setContactForm(prev => ({...prev, email: text}))
              }
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text className="text-gray-700 font-medium text-sm mb-2">
              {t('help.subject')} *
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-gray-800"
              placeholder={t('help.brief_description')}
              placeholderTextColor="#9CA3AF"
              value={contactForm.subject}
              onChangeText={text =>
                setContactForm(prev => ({...prev, subject: text}))
              }
            />
          </View>

          <View>
            <Text className="text-gray-700 font-medium text-sm mb-2">
              {t('help.message')} *
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-gray-800"
              placeholder={t('help.describe_issue')}
              placeholderTextColor="#9CA3AF"
              value={contactForm.message}
              onChangeText={text =>
                setContactForm(prev => ({...prev, message: text}))
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View className="flex-row space-x-3 mt-6">
          <TouchableOpacity
            className="flex-1 bg-gray-200 rounded-xl py-4"
            onPress={() => setSelectedCategory(null)}>
            <Text className="text-gray-700 font-bold text-center">{t('help.cancel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-primary rounded-xl py-4"
            onPress={handleContactSubmit}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-center">
                {t('help.send_message_btn')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (selectedCategory === 'contact') {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-gray-50"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderContactForm()}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 50}}>
        {/* Header */}
        <View className="px-6 py-6">
          <View className="items-center mb-6">
            <View className="bg-primary-light rounded-full p-5 mb-4 shadow-md">
              <Icon name="help-outline" size={40} color="#689F38" />
            </View>
            <Text className="text-gray-700 font-bold text-3xl mb-2">
              {t('help.help_support')}
            </Text>
            <Text className="text-gray-400 text-base text-center px-4">
              {t('help.help_description')}
            </Text>
          </View>

          {/* Search Bar */}
          <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-6">
            <View className="flex-row items-center">
              <View className="bg-primary-light rounded-full p-3 mr-4">
                <Icon name="search" size={20} color="#689F38" />
              </View>
              <TextInput
                className="flex-1 text-gray-700 text-base font-medium"
                placeholder={t('help.search_help')}
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              {t('help.quick_actions')}
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {quickActions.map(action => (
                <TouchableOpacity
                  key={action.id}
                  className="w-[48%] bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-3"
                  onPress={action.action}
                  disabled={action.loading}>
                  <View className="items-center">
                    <View
                      className="rounded-full p-3 mb-3"
                      style={{backgroundColor: `${action.color}20`}}>
                      {action.loading ? (
                        <ActivityIndicator size={24} color={action.color} />
                      ) : (
                        <Icon name={action.icon} size={24} color={action.color} />
                      )}
                    </View>
                    <Text className="text-gray-800 font-semibold text-sm text-center">
                      {action.title}
                    </Text>
                    <Text className="text-gray-500 text-xs text-center mt-1">
                      {action.loading ? t('help.connecting') : action.subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* FAQ Categories */}
        <View className="px-6">
          <Text className="text-gray-800 font-bold text-lg mb-4">
            {t('help.frequently_asked')}
          </Text>

          {filteredFAQs.map(category => (
            <View key={category.id} className="mb-6">
              <TouchableOpacity
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-3"
                onPress={() =>
                  setSelectedCategory(
                    selectedCategory === category.id ? null : category.id,
                  )
                }>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className="rounded-full p-3 mr-4"
                      style={{backgroundColor: `${category.color}20`}}>
                      <Icon
                        name={category.icon}
                        size={24}
                        color={category.color}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-800 font-semibold text-base">
                        {category.title}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {t('help.questions_count', {count: category.questions.length})}
                      </Text>
                    </View>
                  </View>
                  <Icon
                    name={
                      selectedCategory === category.id
                        ? 'expand-less'
                        : 'expand-more'
                    }
                    size={24}
                    color="#9CA3AF"
                  />
                </View>
              </TouchableOpacity>

              {selectedCategory === category.id && (
                <View className="space-y-3">
                  {category.questions.map(item =>
                    renderFAQItem(item, category.color),
                  )}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Information */}
        <View className="px-6 mt-6">
          <View className="bg-primary-light bg-opacity-30 rounded-2xl p-6 border border-primary border-opacity-30">
            <View className="items-center">
              <Icon name="support-agent" size={32} color="#689F38" />
              <Text className="text-primary-dark font-bold text-lg mt-3 mb-2">
                {t('help.still_need_help')}
              </Text>
              <Text className="text-gray-600 text-sm text-center mb-4">
                {t('help.support_available')}
              </Text>
              <TouchableOpacity
                className="bg-primary rounded-xl px-6 py-3"
                onPress={() => setSelectedCategory('contact')}>
                <Text className="text-white font-bold">{t('help.contact_support')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* App Information */}
        <View className="px-6 mt-6">
          <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <Text className="text-gray-800 font-semibold text-base mb-3">
              {t('help.app_information')}
            </Text>
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">{t('help.version')}</Text>
                <Text className="text-gray-800 text-sm font-medium">1.0.0</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">{t('help.last_updated')}</Text>
                <Text className="text-gray-800 text-sm font-medium">
                  {t('help.dec_2024')}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">{t('help.support_email')}</Text>
                <Text className="text-primary text-sm font-medium">
                  support@servenest.com
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Help;
