import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {EventPaymentService} from '../screens/services/eventPaymentService';

export default function EventBookingPayment({
  visible,
  onClose,
  onPaymentSuccess,
  eventData,
  userEmail,
  userContact,
  userName,
  totalAmount,
}) {
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(totalAmount || 0);

  useEffect(() => {
    setPaymentAmount(totalAmount || 0);
  }, [totalAmount]);

  const handlePayment = async () => {
    if (!eventData || !totalAmount) {
      Alert.alert('Error', 'Invalid event or payment data');
      return;
    }

    setLoading(true);
    try {
      const paymentData = {
        amount: paymentAmount,
        eventId: eventData.id,
        eventTitle: eventData.title,
        email: userEmail,
        contact: userContact,
        name: userName,
      };

      console.log('🔄 Processing event payment:', paymentData);

      const result = await EventPaymentService.processEventBookingPayment(
        paymentData,
      );

      if (result.success) {
        console.log('✅ Payment successful');
        Alert.alert(
          'Payment Successful! 🎉',
          `Your booking has been confirmed!\n\nPayment ID: ${result.paymentId}\nAmount: ₹${result.amount}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onPaymentSuccess(result);
              },
            },
          ],
        );
      } else {
        console.error('❌ Payment failed:', result.error);
        Alert.alert(
          'Payment Failed',
          result.error || 'Payment could not be processed. Please try again.',
          [
            {text: 'Retry', onPress: handlePayment},
            {text: 'Cancel', style: 'cancel'},
          ],
        );
      }
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      Alert.alert(
        'Payment Error',
        'An unexpected error occurred. Please try again.',
        [
          {text: 'Retry', onPress: handlePayment},
          {text: 'Cancel', style: 'cancel'},
        ],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-100">
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-800 text-xl font-bold">
              Complete Payment
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
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
                <View>
                  <Text className="text-gray-600 text-sm">Event</Text>
                  <Text className="text-gray-800 font-medium text-lg">
                    {eventData?.title || 'Event Booking'}
                  </Text>
                </View>

                <View>
                  <Text className="text-gray-600 text-sm">Date</Text>
                  <Text className="text-gray-800 font-medium">
                    {eventData?.date || 'TBD'}
                  </Text>
                </View>

                <View>
                  <Text className="text-gray-600 text-sm">Venue</Text>
                  <Text className="text-gray-800 font-medium">
                    {eventData?.location?.venue || 'TBD'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Summary */}
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-gray-800 font-bold text-lg mb-4">
                Payment Summary
              </Text>

              <View className="space-y-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Ticket Amount</Text>
                  <Text className="text-gray-800 font-medium">
                    ₹{paymentAmount}
                  </Text>
                </View>

                <View className="border-t border-gray-200 pt-3">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-800 font-bold text-lg">
                      Total Amount
                    </Text>
                    <Text className="text-primary font-bold text-xl">
                      ₹{paymentAmount}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Customer Details */}
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-gray-800 font-bold text-lg mb-4">
                Customer Details
              </Text>

              <View className="space-y-3">
                <View>
                  <Text className="text-gray-600 text-sm">Name</Text>
                  <Text className="text-gray-800 font-medium">
                    {userName || 'N/A'}
                  </Text>
                </View>

                <View>
                  <Text className="text-gray-600 text-sm">Email</Text>
                  <Text className="text-gray-800 font-medium">
                    {userEmail || 'N/A'}
                  </Text>
                </View>

                <View>
                  <Text className="text-gray-600 text-sm">Phone</Text>
                  <Text className="text-gray-800 font-medium">
                    {userContact || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Info */}
            <View className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <View className="flex-row items-center mb-3">
                <Icon name="security" size={20} color="#2563EB" />
                <Text className="text-blue-800 font-bold text-base ml-2">
                  Secure Payment
                </Text>
              </View>
              <Text className="text-blue-700 text-sm">
                Your payment is secured by Razorpay. We support all major
                payment methods including UPI, cards, and net banking.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Payment Button */}
        <View className="bg-white px-4 py-6 border-t border-gray-100">
          <TouchableOpacity
            className={`rounded-xl py-4 ${
              loading ? 'bg-gray-400' : 'bg-primary'
            }`}
            onPress={handlePayment}
            disabled={loading}>
            {loading ? (
              <View className="flex-row justify-center items-center">
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-white font-bold ml-2">
                  Processing Payment...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-bold text-center text-lg">
                Pay ₹{paymentAmount}
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center justify-center mt-2">
            <Icon name="security" size={16} color="#10B981" />
            <Text className="text-green-600 text-xs ml-1">
              Powered by Razorpay
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
