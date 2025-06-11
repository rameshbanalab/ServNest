/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  BackHandler,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import {db} from '../../config/firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import auth from '@react-native-firebase/auth';
import {EventPaymentService} from '../services/eventPaymentService';

export default function EventBookingFlow() {
  const navigation = useNavigation();
  const route = useRoute();

  // State management
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Safe parameter extraction
  const {event, selectedTickets, totalAmount} = route.params || {
    event: null,
    selectedTickets: {},
    totalAmount: 0,
  };

  const [bookingData, setBookingData] = useState({
    fullName: '',
    email: '',
    phone: '',
    emergencyContact: '',
    specialRequests: '',
    agreeToTerms: false,
  });

  // Enhanced Firebase booking save function
  const saveBookingToFirebase = async paymentData => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const bookingId = generateBookingId();
      const qrCode = generateQRCode(bookingId, currentUser.uid);

      const booking = {
        bookingId,
        eventId: event.id,
        userId: currentUser.uid,
        userName: bookingData.fullName.trim(),
        userEmail: bookingData.email.trim().toLowerCase(),
        userPhone: bookingData.phone.trim(),
        emergencyContact: bookingData.emergencyContact.trim(),
        specialRequests: bookingData.specialRequests.trim(),
        tickets: Object.entries(selectedTickets).map(([type, quantity]) => ({
          type,
          quantity: Number(quantity),
          price: Number(event.pricing?.[type]?.price || 0),
          totalPrice:
            Number(event.pricing?.[type]?.price || 0) * Number(quantity),
        })),
        totalAmount: Number(totalAmount || 0),
        paymentStatus: event.eventType === 'free' ? 'completed' : 'completed',
        bookingDate: serverTimestamp(),
        status: 'confirmed',
        qrCode: qrCode,
        eventDetails: {
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          venue: event.location?.venue || 'TBD',
          address: event.location?.address || 'TBD',
          category: event.category,
        },
        payment: paymentData
          ? {
              paymentId: paymentData.paymentId,
              orderId: paymentData.orderId || null,
              signature: paymentData.signature || null,
              amount: Number(totalAmount),
              currency: paymentData.currency || 'INR',
              status: 'completed',
              method: 'razorpay',
              paidAt: paymentData.timestamp || new Date().toISOString(),
            }
          : null,
        metadata: {
          platform: Platform.OS,
          appVersion: '1.0.0',
          createdAt: new Date().toISOString(),
        },
      };

      console.log('💾 Saving booking to Firebase:', bookingId);

      // Save to Firebase
      const docRef = await addDoc(collection(db, 'EventBookings'), booking);

      // Update event analytics and ticket counts
      const eventRef = doc(db, 'Events', event.id);
      const updateData = {
        'analytics.bookings': increment(1),
        'analytics.revenue': increment(Number(totalAmount || 0)),
        'analytics.lastBooking': serverTimestamp(),
      };

      // Update sold ticket counts
      Object.entries(selectedTickets).forEach(([type, quantity]) => {
        updateData[`pricing.${type}.sold`] = increment(Number(quantity));
      });

      await updateDoc(eventRef, updateData);

      console.log('📊 Event analytics updated');

      return {
        success: true,
        bookingId,
        docId: docRef.id,
      };
    } catch (error) {
      console.error('❌ Firebase save error:', error);
      throw new Error(`Failed to save booking: ${error.message}`);
    }
  };

  // Enhanced payment success handler with immediate navigation
  const handlePaymentSuccess = useCallback(
    async (paymentData = null) => {
      console.log(
        '🎉 Payment success handler called with:',
        paymentData?.paymentId,
      );

      try {
        // Immediately reset payment loading to show processing state
        setPaymentLoading(false);
        setLoading(true); // Show general processing

        console.log('💾 Starting Firebase save process...');

        // Save booking to Firebase
        const saveResult = await saveBookingToFirebase(paymentData);

        if (saveResult.success) {
          console.log(
            '✅ Firebase save successful, navigating to success screen...',
          );

          // Reset all loading states before navigation
          setLoading(false);

          // Navigate to success screen with all data
          navigation.replace('EventPaymentSuccess', {
            paymentData,
            bookingId: saveResult.bookingId,
            eventData: event,
            bookingData: {
              ...bookingData,
              totalAmount,
              selectedTickets,
            },
          });
        } else {
          throw new Error('Booking save failed');
        }
      } catch (error) {
        console.error('❌ Error in payment success handler:', error);
        setLoading(false);
        handlePaymentFailure(
          error.message || 'Failed to save booking after payment',
        );
      }
    },
    [bookingData, totalAmount, event, selectedTickets, navigation],
  );

  // Enhanced payment failure handler
  const handlePaymentFailure = useCallback(
    errorMessage => {
      console.log('❌ Payment failure handler called:', errorMessage);

      // Reset all loading states
      setPaymentLoading(false);
      setLoading(false);

      // Navigate to failure screen with error data
      navigation.replace('EventPaymentFailure', {
        errorData: {
          error: errorMessage,
          code: 'PAYMENT_ERROR',
        },
        eventData: event,
        bookingData: {
          totalAmount,
          userName: bookingData.fullName,
          selectedTickets,
        },
      });
    },
    [event, bookingData, totalAmount, selectedTickets, navigation],
  );

  // Enhanced payment processing with better error handling
  const processPayment = async () => {
    try {
      console.log('💳 Starting payment process...');
      setPaymentLoading(true);

      const paymentData = {
        amount: totalAmount,
        eventId: event.id,
        eventTitle: event.title,
        email: bookingData.email.trim(),
        contact: bookingData.phone.trim(),
        name: bookingData.fullName.trim(),
      };

      console.log('💳 Calling EventPaymentService with data:', {
        amount: paymentData.amount,
        eventId: paymentData.eventId,
        email: paymentData.email,
      });

      const result = await EventPaymentService.processEventBookingPayment(
        paymentData,
      );

      console.log('💳 Payment service result received:', {
        success: result.success,
        paymentId: result.success ? result.paymentId : 'N/A',
        error: result.success ? 'N/A' : result.error,
      });

      if (result.success) {
        console.log('✅ Payment successful, calling success handler...');
        await handlePaymentSuccess(result);
      } else {
        console.error('❌ Payment failed:', result.error);
        setPaymentLoading(false);
        handlePaymentFailure(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      setPaymentLoading(false);
      handlePaymentFailure(error.message || 'Payment processing failed');
    }
  };

  // Main booking process
  const processBooking = async () => {
    if (!validateForm()) return;

    try {
      console.log('🎫 Starting booking process...');
      setLoading(true);

      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Authentication Error', 'Please login to book tickets');
        navigation.navigate('Login');
        return;
      }

      // For free events, directly save booking
      if (event.eventType === 'free' || totalAmount === 0) {
        console.log('🆓 Processing free event registration');
        await handlePaymentSuccess();
        return;
      }

      // For paid events, process payment
      if (totalAmount > 0) {
        console.log('💰 Processing paid event booking');
        setLoading(false); // Reset loading before payment
        await processPayment();
      } else {
        throw new Error('Invalid payment amount');
      }
    } catch (error) {
      console.error('❌ Error processing booking:', error);
      setLoading(false);
      handlePaymentFailure('Booking failed: ' + error.message);
    }
  };

  // Form validation
  const validateForm = () => {
    const {fullName, email, phone} = bookingData;

    if (!fullName.trim() || fullName.trim().length < 2) {
      Alert.alert(
        'Validation Error',
        'Please enter a valid full name (minimum 2 characters)',
      );
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phone.trim() || !phoneRegex.test(phone.trim())) {
      Alert.alert(
        'Validation Error',
        'Please enter a valid 10-digit phone number',
      );
      return false;
    }

    if (!bookingData.agreeToTerms) {
      Alert.alert(
        'Terms & Conditions',
        'Please agree to the terms and conditions to proceed',
      );
      return false;
    }

    return true;
  };

  // Utility functions
  const generateBookingId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const eventPrefix = (event.title || 'EVT').substring(0, 3).toUpperCase();
    return `${eventPrefix}${timestamp}${random}`;
  };

  const generateQRCode = (bookingId, userId) => {
    const qrData = {
      bookingId,
      eventId: event.id,
      userId,
      eventTitle: event.title,
      timestamp: new Date().toISOString(),
      type: 'event_booking',
    };
    return JSON.stringify(qrData);
  };

  const formatDate = dateString => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date TBD';
      return date.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      return 'Date TBD';
    }
  };

  const formatTime = timeString => {
    try {
      if (!timeString) return 'TBD';
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return timeString || 'TBD';
    }
  };

  // Back handler
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (paymentLoading || loading) {
          Alert.alert(
            'Processing in Progress',
            'Please wait while we process your request.',
            [{text: 'OK'}],
          );
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription?.remove();
    }, [paymentLoading, loading]),
  );

  // Validate route parameters
  if (!event || !event.id) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Icon name="error-outline" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4">
          Invalid booking data
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-xl px-6 py-3 mt-4"
          onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check if any processing is happening
  const isProcessing = loading || paymentLoading;

  // Main booking form
  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 text-lg font-bold">
            {event.eventType === 'paid' ? 'Book Tickets' : 'Register for Event'}
          </Text>
          <View style={{width: 24}} />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4 space-y-6">
          {/* Event Summary */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Event Summary
            </Text>
            <View className="space-y-3">
              <Text className="text-gray-800 font-medium text-lg">
                {event.title}
              </Text>
              <View className="flex-row items-center">
                <Icon name="event" size={16} color="#8BC34A" />
                <Text className="text-gray-600 ml-2">
                  {formatDate(event.date)}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Icon name="schedule" size={16} color="#8BC34A" />
                <Text className="text-gray-600 ml-2">
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Icon name="location-on" size={16} color="#8BC34A" />
                <Text className="text-gray-600 ml-2 flex-1">
                  {event.location?.venue || 'Venue TBD'}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Icon name="category" size={16} color="#8BC34A" />
                <Text className="text-gray-600 ml-2">{event.category}</Text>
              </View>
            </View>
          </View>

          {/* Ticket Summary */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              {event.eventType === 'paid'
                ? 'Ticket Summary'
                : 'Registration Summary'}
            </Text>
            <View className="space-y-3">
              {Object.entries(selectedTickets).map(([ticketType, quantity]) => (
                <View
                  key={ticketType}
                  className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-gray-800 font-medium capitalize">
                      {ticketType}{' '}
                      {event.eventType === 'paid' ? 'Ticket' : 'Registration'} x{' '}
                      {quantity}
                    </Text>
                    {event.eventType === 'paid' && (
                      <Text className="text-gray-600 text-sm">
                        ₹{event.pricing?.[ticketType]?.price || 0} each
                      </Text>
                    )}
                  </View>
                  <Text className="text-gray-800 font-bold">
                    {event.eventType === 'paid'
                      ? `₹${
                          (event.pricing?.[ticketType]?.price || 0) * quantity
                        }`
                      : 'Free'}
                  </Text>
                </View>
              ))}

              {event.eventType === 'paid' && (
                <View className="border-t border-gray-200 pt-3">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-800 font-bold text-lg">
                      Total Amount
                    </Text>
                    <Text className="text-primary font-bold text-xl">
                      ₹{totalAmount}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Personal Information */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Personal Information
            </Text>
            <View className="space-y-4">
              <View>
                <Text className="text-gray-700 font-medium mb-2">
                  Full Name *
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                  placeholder="Enter your full name"
                  value={bookingData.fullName}
                  onChangeText={text =>
                    setBookingData({...bookingData, fullName: text})
                  }
                  autoCapitalize="words"
                  editable={!isProcessing}
                />
              </View>

              <View>
                <Text className="text-gray-700 font-medium mb-2">
                  Email Address *
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                  placeholder="Enter your email address"
                  value={bookingData.email}
                  onChangeText={text =>
                    setBookingData({...bookingData, email: text})
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isProcessing}
                />
              </View>

              <View>
                <Text className="text-gray-700 font-medium mb-2">
                  Phone Number *
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                  placeholder="Enter your 10-digit phone number"
                  value={bookingData.phone}
                  onChangeText={text =>
                    setBookingData({...bookingData, phone: text})
                  }
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!isProcessing}
                />
              </View>

              <View>
                <Text className="text-gray-700 font-medium mb-2">
                  Emergency Contact
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                  placeholder="Emergency contact number (optional)"
                  value={bookingData.emergencyContact}
                  onChangeText={text =>
                    setBookingData({...bookingData, emergencyContact: text})
                  }
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!isProcessing}
                />
              </View>

              <View>
                <Text className="text-gray-700 font-medium mb-2">
                  Special Requests
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                  placeholder="Any special requirements or requests (optional)"
                  value={bookingData.specialRequests}
                  onChangeText={text =>
                    setBookingData({...bookingData, specialRequests: text})
                  }
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isProcessing}
                />
              </View>
            </View>
          </View>

          {/* Terms and Conditions */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-3">
              Terms & Conditions
            </Text>
            <View className="space-y-2 mb-4">
              <Text className="text-gray-600 text-sm">
                • Tickets are non-refundable and non-transferable
              </Text>
              <Text className="text-gray-600 text-sm">
                • Entry is subject to availability and venue capacity
              </Text>
              <Text className="text-gray-600 text-sm">
                • Valid government-issued ID required at venue
              </Text>
              <Text className="text-gray-600 text-sm">
                • Event timings and venue are subject to change
              </Text>
              <Text className="text-gray-600 text-sm">
                • QR code must be presented for entry
              </Text>
              <Text className="text-gray-600 text-sm">
                • Age restrictions may apply based on event type
              </Text>
            </View>

            <TouchableOpacity
              className="flex-row items-center"
              onPress={() =>
                setBookingData({
                  ...bookingData,
                  agreeToTerms: !bookingData.agreeToTerms,
                })
              }
              disabled={isProcessing}>
              <View
                className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                  bookingData.agreeToTerms
                    ? 'bg-primary border-primary'
                    : 'border-gray-300'
                }`}>
                {bookingData.agreeToTerms && (
                  <Icon name="check" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text className="text-gray-700 flex-1">
                I agree to the terms and conditions *
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View className="bg-white border-t border-gray-200 p-4">
        <TouchableOpacity
          className={`rounded-xl py-4 ${
            isProcessing ? 'bg-gray-400' : 'bg-primary'
          }`}
          onPress={processBooking}
          disabled={isProcessing}>
          {isProcessing ? (
            <View className="flex-row justify-center items-center">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-white font-bold ml-2">
                {paymentLoading
                  ? 'Processing Payment...'
                  : loading
                  ? 'Saving Booking...'
                  : 'Processing...'}
              </Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-center text-lg">
              {event.eventType === 'paid'
                ? `Pay ₹${totalAmount} & Book Tickets`
                : 'Register for Event'}
            </Text>
          )}
        </TouchableOpacity>

        {event.eventType === 'paid' && (
          <View className="flex-row items-center justify-center mt-2">
            <Icon name="security" size={16} color="#10B981" />
            <Text className="text-green-600 text-xs ml-1">
              Secure payment powered by Razorpay
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
