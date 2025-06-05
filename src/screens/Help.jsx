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

const Help = () => {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // FAQ Categories
  const faqCategories = [
    {
      id: 1,
      title: 'Getting Started',
      icon: 'play-circle-outline',
      color: '#8BC34A',
      questions: [
        {
          question: 'How do I create an account?',
          answer:
            'To create an account, tap the "Sign Up" button on the login screen, fill in your details including name, email, phone number, and create a password. You\'ll receive a verification email to activate your account.',
        },
        {
          question: 'How do I find services near me?',
          answer:
            'ServeNest uses your location to show nearby services. Make sure location permissions are enabled, then browse categories or use the search function to find specific services.',
        },
        {
          question: 'Is ServeNest free to use?',
          answer:
            'Yes, ServeNest is completely free for customers. You can browse, search, and contact service providers without any charges.',
        },
      ],
    },
    {
      id: 2,
      title: 'Booking Services',
      icon: 'event-note',
      color: '#2196F3',
      questions: [
        {
          question: 'How do I book a service?',
          answer:
            "Browse or search for the service you need, view the provider's details, check their ratings and reviews, then contact them directly via phone, WhatsApp, or email to book an appointment.",
        },
        {
          question: 'Can I cancel a booking?',
          answer:
            "Booking cancellations depend on the individual service provider's policy. Contact the provider directly to discuss cancellation terms and any applicable fees.",
        },
        {
          question: 'How do I know if a service provider is reliable?',
          answer:
            "Check the provider's ratings, read customer reviews, verify their business hours, and look for complete profile information including contact details and service descriptions.",
        },
      ],
    },
    {
      id: 3,
      title: 'Account & Profile',
      icon: 'account-circle',
      color: '#FF9800',
      questions: [
        {
          question: 'How do I update my profile?',
          answer:
            'Go to the Profile section from the menu, tap "Edit" and update your information including name, phone number, address, and profile picture. Don\'t forget to save your changes.',
        },
        {
          question: 'How do I change my password?',
          answer:
            'In your Profile section, tap "Change Password", enter your current password and new password. You\'ll receive a confirmation once the password is updated successfully.',
        },
        {
          question: 'Can I delete my account?',
          answer:
            'Yes, you can delete your account by contacting our support team. Please note that this action is permanent and cannot be undone.',
        },
      ],
    },
    {
      id: 4,
      title: 'Business Registration',
      icon: 'business',
      color: '#9C27B0',
      questions: [
        {
          question: 'How do I register my business?',
          answer:
            'Use the "Register Business" option in the menu, fill in your business details, upload photos, set your operating hours, and submit for review. Our team will verify and activate your listing.',
        },
        {
          question: 'How long does business verification take?',
          answer:
            "Business verification typically takes 2-3 business days. You'll receive an email notification once your business is approved and live on the platform.",
        },
        {
          question: 'Can I edit my business information?',
          answer:
            'Yes, go to "My Businesses" in the menu, select your business, and tap "Edit" to update information, photos, or operating hours.',
        },
      ],
    },
  ];

  // Quick Actions
  const quickActions = [
    {
      id: 1,
      title: 'Call Support',
      subtitle: 'Speak with our team',
      icon: 'phone',
      color: '#4CAF50',
      action: () => Linking.openURL('tel:+919876543210'),
    },
    {
      id: 2,
      title: 'Email Us',
      subtitle: 'Send us a message',
      icon: 'email',
      color: '#2196F3',
      action: () => Linking.openURL('mailto:support@servenest.com'),
    },
    {
      id: 3,
      title: 'WhatsApp',
      subtitle: 'Chat with support',
      icon: 'chat',
      color: '#25D366',
      action: () =>
        Linking.openURL(
          'whatsapp://send?phone=919876543210&text=Hi, I need help with ServeNest app',
        ),
    },
    {
      id: 4,
      title: 'Report Issue',
      subtitle: 'Technical problems',
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
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        'Message Sent!',
        "Thank you for contacting us. We'll get back to you within 24 hours.",
        [
          {
            text: 'OK',
            onPress: () => {
              setContactForm({name: '', email: '', subject: '', message: ''});
              setSelectedCategory(null);
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
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
              Contact Support
            </Text>
            <Text className="text-gray-600 text-sm">
              We're here to help you
            </Text>
          </View>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-gray-700 font-medium text-sm mb-2">
              Full Name *
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-gray-800"
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
              value={contactForm.name}
              onChangeText={text =>
                setContactForm(prev => ({...prev, name: text}))
              }
            />
          </View>

          <View>
            <Text className="text-gray-700 font-medium text-sm mb-2">
              Email Address *
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-gray-800"
              placeholder="Enter your email address"
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
              Subject *
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-gray-800"
              placeholder="Brief description of your issue"
              placeholderTextColor="#9CA3AF"
              value={contactForm.subject}
              onChangeText={text =>
                setContactForm(prev => ({...prev, subject: text}))
              }
            />
          </View>

          <View>
            <Text className="text-gray-700 font-medium text-sm mb-2">
              Message *
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-gray-800"
              placeholder="Describe your issue in detail..."
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
            <Text className="text-gray-700 font-bold text-center">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-primary rounded-xl py-4"
            onPress={handleContactSubmit}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-center">
                Send Message
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
              Help & Support
            </Text>
            <Text className="text-gray-400 text-base text-center px-4">
              Find answers to common questions or get in touch with our support
              team
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
                placeholder="Search for help..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Quick Actions
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {quickActions.map(action => (
                <TouchableOpacity
                  key={action.id}
                  className="w-[48%] bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-3"
                  onPress={action.action}>
                  <View className="items-center">
                    <View
                      className="rounded-full p-3 mb-3"
                      style={{backgroundColor: `${action.color}20`}}>
                      <Icon name={action.icon} size={24} color={action.color} />
                    </View>
                    <Text className="text-gray-800 font-semibold text-sm text-center">
                      {action.title}
                    </Text>
                    <Text className="text-gray-500 text-xs text-center mt-1">
                      {action.subtitle}
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
            Frequently Asked Questions
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
                        {category.questions.length} questions
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
                Still Need Help?
              </Text>
              <Text className="text-gray-600 text-sm text-center mb-4">
                Our support team is available 24/7 to assist you with any
                questions or issues.
              </Text>
              <TouchableOpacity
                className="bg-primary rounded-xl px-6 py-3"
                onPress={() => setSelectedCategory('contact')}>
                <Text className="text-white font-bold">Contact Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* App Information */}
        <View className="px-6 mt-6">
          <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <Text className="text-gray-800 font-semibold text-base mb-3">
              App Information
            </Text>
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">Version</Text>
                <Text className="text-gray-800 text-sm font-medium">1.0.0</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">Last Updated</Text>
                <Text className="text-gray-800 text-sm font-medium">
                  Dec 2024
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">Support Email</Text>
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
