/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {PaymentService} from '../screens/services/paymentService';
import {BusinessRegistrationService} from '../screens/services/businessRegistrationService';
import {useNavigation} from '@react-navigation/native';

export default function BusinessRegistrationPayment({
  visible,
  onClose,
  onPaymentSuccess,
  businessData,
  userEmail,
  userContact,
  userName,
}) {
  const [loading, setLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(true);
  const [registrationFee, setRegistrationFee] = useState({
    amount: 150,
    currency: 'INR',
  });
  const navigation = useNavigation();

  useEffect(() => {
    if (visible) {
      fetchRegistrationFee();
    }
  }, [visible]);

  const fetchRegistrationFee = async () => {
    setFeeLoading(true);
    try {
      const fee = await BusinessRegistrationService.getRegistrationFee();
      setRegistrationFee(fee);
    } catch (error) {
      console.error('Error fetching registration fee:', error);
    } finally {
      setFeeLoading(false);
    }
  };

  const handlePayment = async () => {
    setLoading(true);

    try {
      const paymentData = {
        amount: registrationFee.amount,
        email: userEmail,
        contact: userContact,
        name: userName,
        currency: registrationFee.currency,
      };

      const result = await PaymentService.processBusinessRegistrationPayment(
        paymentData,
      );

      if (result.success) {
        // Navigate to success screen
        onClose(); // Close the payment modal first
        navigation.navigate('PaymentSuccess', {
          paymentData: result,
          businessData: {
            businessName: businessData?.businessName,
            ownerName: businessData?.ownerName,
            contactNumber: businessData?.contactNumber,
            amount: registrationFee.amount,
          },
        });

        // Call the original success handler
        onPaymentSuccess(result);
      } else {
        // Navigate to failure screen
        onClose(); // Close the payment modal first
        navigation.navigate('PaymentFailure', {
          errorData: result,
          businessData: {
            businessName: businessData?.businessName,
            ownerName: businessData?.ownerName,
            contactNumber: businessData?.contactNumber,
            amount: registrationFee.amount,
          },
        });
      }
    } catch (error) {
      console.error('Payment error:', error);

      // Navigate to failure screen for unexpected errors
      onClose();
      navigation.navigate('PaymentFailure', {
        errorData: {
          error: 'An unexpected error occurred. Please try again.',
          code: 'UNEXPECTED_ERROR',
        },
        businessData: {
          businessName: businessData?.businessName,
          ownerName: businessData?.ownerName,
          contactNumber: businessData?.contactNumber,
          amount: registrationFee.amount,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black bg-opacity-50 px-6">
        <View className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          {/* Header */}
          <View className="items-center mb-6">
            <View className="bg-primary-light rounded-full p-4 mb-4">
              <Icon name="payment" size={32} color="#689F38" />
            </View>
            <Text className="text-gray-800 font-bold text-xl">
              Business Registration Fee
            </Text>
            <Text className="text-gray-600 text-sm mt-2 text-center">
              Complete your payment to register your business
            </Text>
          </View>

          {/* Fee Details */}
          {feeLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color="#8BC34A" />
              <Text className="text-gray-600 text-sm mt-2">
                Loading fee details...
              </Text>
            </View>
          ) : (
            <View className="bg-gray-50 rounded-2xl p-6 mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-gray-700 font-medium">
                  Registration Fee
                </Text>
                <Text className="text-gray-800 font-bold text-lg">
                  ₹{registrationFee.amount}
                </Text>
              </View>

              <View className="border-t border-gray-200 pt-4">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-800 font-bold text-base">
                    Total Amount
                  </Text>
                  <Text className="text-primary font-bold text-xl">
                    ₹{registrationFee.amount}
                  </Text>
                </View>
              </View>

              <View className="mt-4 p-3 bg-blue-50 rounded-lg">
                <Text className="text-blue-700 text-xs text-center">
                  💡 This is a one-time registration fee for listing your
                  business on ServeNest
                </Text>
              </View>
            </View>
          )}

          {/* Business Details Summary */}
          <View className="bg-gray-50 rounded-xl p-4 mb-6">
            <Text className="text-gray-700 font-medium text-sm mb-2">
              Business Details:
            </Text>
            <Text className="text-gray-800 font-bold">
              {businessData?.businessName || 'Business Name'}
            </Text>
            <Text className="text-gray-600 text-sm">
              Owner: {businessData?.ownerName || userName}
            </Text>
            <Text className="text-gray-600 text-sm">
              Contact: {businessData?.contactNumber || userContact}
            </Text>
          </View>

          {/* Payment Methods Info */}
          <View className="mb-6">
            <Text className="text-gray-700 font-medium text-sm mb-3">
              Accepted Payment Methods:
            </Text>
            <View className="flex-row justify-center space-x-4">
              <View className="items-center">
                <Icon name="credit-card" size={24} color="#4F46E5" />
                <Text className="text-xs text-gray-600 mt-1">Cards</Text>
              </View>
              <View className="items-center">
                <Icon name="account-balance" size={24} color="#059669" />
                <Text className="text-xs text-gray-600 mt-1">Net Banking</Text>
              </View>
              <View className="items-center">
                <Icon name="phone-android" size={24} color="#DC2626" />
                <Text className="text-xs text-gray-600 mt-1">UPI</Text>
              </View>
              <View className="items-center">
                <Icon name="account-balance-wallet" size={24} color="#7C3AED" />
                <Text className="text-xs text-gray-600 mt-1">Wallets</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3">
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 shadow-lg"
              style={{
                shadowColor: '#8BC34A',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
              onPress={handlePayment}
              disabled={loading || feeLoading}>
              {loading ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-bold text-base ml-2">
                    Processing...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-center text-base">
                  Pay ₹{registrationFee.amount} & Register
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-100 rounded-2xl py-4"
              onPress={onClose}
              disabled={loading}>
              <Text className="text-gray-700 font-bold text-center text-base">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Note */}
          <View className="mt-4 flex-row items-center justify-center">
            <Icon name="security" size={16} color="#10B981" />
            <Text className="text-green-600 text-xs ml-2">
              Secured by Razorpay
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
