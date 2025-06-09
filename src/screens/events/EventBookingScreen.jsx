import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
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
import EventBookingPayment from '../../components/EventBookingPayment';

export default function EventBookingScreen({route}) {
  const {event, selectedTickets, totalAmount} = route.params;
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [bookingData, setBookingData] = useState({
    fullName: '',
    email: '',
    phone: '',
    emergencyContact: '',
    specialRequests: '',
    agreeToTerms: false,
  });

  // Enhanced form validation
  const validateForm = () => {
    const {fullName, email, phone} = bookingData;

    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }

    if (fullName.trim().length < 2) {
      Alert.alert('Validation Error', 'Please enter a valid full name');
      return false;
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    if (!phone.trim() || phone.length < 10) {
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

  // Generate unique booking ID
  const generateBookingId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const eventPrefix = event.title.substring(0, 3).toUpperCase();
    return `${eventPrefix}${timestamp}${random}`;
  };

  // Handle booking initiation
  const handleBooking = () => {
    if (!validateForm()) return;

    const currentUser = auth().currentUser;
    if (!currentUser) {
      Alert.alert('Authentication Error', 'Please login to book tickets');
      navigation.navigate('Login');
      return;
    }

    // For paid events, show payment modal
    if (event.eventType === 'paid' && totalAmount > 0) {
      setPaymentModalVisible(true);
    } else {
      // For free events, proceed directly
      processBooking(null);
    }
  };

  // Process booking after payment (or directly for free events)
  const processBooking = async paymentData => {
    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'Please login to book tickets');
        return;
      }

      const bookingId = generateBookingId();

      // Prepare booking data
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
          quantity,
          price: event.pricing[type].price,
          totalPrice: event.pricing[type].price * quantity,
        })),
        totalAmount: totalAmount,
        paymentStatus: event.eventType === 'free' ? 'completed' : 'pending',
        bookingDate: serverTimestamp(),
        status: 'pending',
        qrCode: `${bookingId}_${currentUser.uid}`,
        eventDetails: {
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          venue: event.location.venue,
          address: event.location.address,
        },
      };

      // Add payment data if exists
      if (paymentData && paymentData.success) {
        booking.paymentStatus = 'completed';
        booking.status = 'confirmed';
        booking.payment = {
          paymentId: paymentData.paymentId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: 'completed',
          method: 'razorpay',
          paidAt: paymentData.timestamp,
        };

        // Add optional fields only if they exist
        if (paymentData.orderId) {
          booking.payment.orderId = paymentData.orderId;
        }
        if (paymentData.signature) {
          booking.payment.signature = paymentData.signature;
        }
      } else if (event.eventType === 'free') {
        booking.status = 'confirmed';
      }

      console.log('💾 Saving booking to database...');

      // Save booking to Firebase
      const bookingRef = await addDoc(collection(db, 'EventBookings'), booking);
      console.log('✅ Booking saved with ID:', bookingRef.id);

      // Update event analytics and ticket counts
      const eventRef = doc(db, 'Events', event.id);
      const updateData = {
        'analytics.bookings': increment(1),
        'analytics.revenue': increment(totalAmount),
        'analytics.views': increment(1),
      };

      // Update sold ticket counts
      Object.entries(selectedTickets).forEach(([type, quantity]) => {
        updateData[`pricing.${type}.sold`] = increment(quantity);
      });

      await updateDoc(eventRef, updateData);
      console.log('✅ Event analytics updated');

      // ✅ Navigate to success screen instead of showing alert
      if (event.eventType === 'paid' && paymentData) {
        navigation.replace('EventPaymentSuccess', {
          paymentData,
          bookingData: booking,
          eventData: event,
        });
      } else {
        // For free events, still show success screen
        navigation.replace('EventPaymentSuccess', {
          paymentData: null,
          bookingData: booking,
          eventData: event,
        });
      }
    } catch (error) {
      console.error('❌ Error processing booking:', error);

      // ✅ Navigate to failure screen for booking errors
      navigation.replace('EventPaymentFailure', {
        errorData: {
          error: 'Booking failed: ' + error.message,
          code: 'BOOKING_ERROR',
        },
        eventData: event,
        bookingData: {totalAmount, userName: bookingData.fullName},
      });
    } finally {
      setLoading(false);
      setPaymentModalVisible(false);
    }
  };

  // ✅ Enhanced payment success handler with navigation
  const handlePaymentSuccess = async paymentData => {
    try {
      console.log('✅ Payment successful, processing booking...');
      await processBooking(paymentData);
    } catch (error) {
      console.error('❌ Error in payment success handler:', error);

      // ✅ Navigate to failure screen even if payment succeeded but booking failed
      navigation.replace('EventPaymentFailure', {
        errorData: {
          error:
            'Payment successful but booking failed. Please contact support.',
          code: 'BOOKING_ERROR',
        },
        eventData: event,
        bookingData: {totalAmount, userName: bookingData.fullName},
      });
    }
  };

  // ✅ Handle payment failure with navigation
  const handlePaymentFailure = errorData => {
    console.log('❌ Payment failed:', errorData);

    navigation.replace('EventPaymentFailure', {
      errorData,
      eventData: event,
      bookingData: {totalAmount, userName: bookingData.fullName},
    });
  };

  // Format date for display
  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

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
                  {event.startTime} - {event.endTime}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Icon name="location-on" size={16} color="#8BC34A" />
                <Text className="text-gray-600 ml-2">
                  {event.location.venue}
                </Text>
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
                        ₹{event.pricing[ticketType].price} each
                      </Text>
                    )}
                  </View>
                  <Text className="text-gray-800 font-bold">
                    {event.eventType === 'paid'
                      ? `₹${event.pricing[ticketType].price * quantity}`
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

          {/* Booking Information */}
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
                />
              </View>

              <View>
                <Text className="text-gray-700 font-medium mb-2">
                  Emergency Contact
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                  placeholder="Emergency contact number"
                  value={bookingData.emergencyContact}
                  onChangeText={text =>
                    setBookingData({...bookingData, emergencyContact: text})
                  }
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <View>
                <Text className="text-gray-700 font-medium mb-2">
                  Special Requests
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                  placeholder="Any special requirements or requests"
                  value={bookingData.specialRequests}
                  onChangeText={text =>
                    setBookingData({...bookingData, specialRequests: text})
                  }
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
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
            </View>

            <TouchableOpacity
              className="flex-row items-center"
              onPress={() =>
                setBookingData({
                  ...bookingData,
                  agreeToTerms: !bookingData.agreeToTerms,
                })
              }>
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
            loading ? 'bg-gray-400' : 'bg-primary'
          }`}
          onPress={handleBooking}
          disabled={loading}>
          {loading ? (
            <View className="flex-row justify-center items-center">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-white font-bold ml-2">Processing...</Text>
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

      {/* ✅ Enhanced Payment Modal with failure handling */}
      <EventBookingPayment
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailure={handlePaymentFailure}
        eventData={event}
        userEmail={bookingData.email}
        userContact={bookingData.phone}
        userName={bookingData.fullName}
        totalAmount={totalAmount}
      />
    </View>
  );
}
