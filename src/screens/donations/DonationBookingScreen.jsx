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
import {useNavigation, useRoute} from '@react-navigation/native';
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
import {DonationPaymentService} from '../services/donationPaymentService';

export default function DonationBookingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Safe parameter extraction
  const {donation} = route.params || {donation: null};

  const [donationData, setDonationData] = useState({
    fullName: '',
    email: '',
    phone: '',
    amount: '',
    message: '',
    isAnonymous: false,
    agreeToTerms: false,
  });

  // Predefined amounts for quick selection
  const predefinedAmounts = [100, 500, 1000, 2000, 5000, 10000];

  // Validate route parameters
  if (!donation || !donation.id) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Icon name="error-outline" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4">
          Invalid donation data
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-xl px-6 py-3 mt-4"
          onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Enhanced form validation
  const validateForm = () => {
    const {fullName, email, phone, amount} = donationData;

    if (!donationData.isAnonymous) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        Alert.alert('Validation Error', 'Please enter a valid full name');
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
    }

    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) < 10) {
      Alert.alert(
        'Validation Error',
        'Please enter a valid amount (minimum ₹10)',
      );
      return false;
    }

    if (!donationData.agreeToTerms) {
      Alert.alert(
        'Terms & Conditions',
        'Please agree to the terms and conditions to proceed',
      );
      return false;
    }

    return true;
  };

  // Generate unique donation ID
  const generateDonationId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `DON${timestamp}${random}`;
  };

  // Process donation with payment
  const processDonation = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Authentication Error', 'Please login to make a donation');
        navigation.navigate('Login');
        return;
      }

      const donationId = generateDonationId();
      const donationAmount = Number(donationData.amount);

      // Prepare donation record
      const donationRecord = {
        donationId,
        donationCauseId: donation.id,
        userId: currentUser.uid,
        donorName: donationData.isAnonymous
          ? 'Anonymous'
          : donationData.fullName.trim(),
        donorEmail: donationData.isAnonymous
          ? ''
          : donationData.email.trim().toLowerCase(),
        donorPhone: donationData.isAnonymous ? '' : donationData.phone.trim(),
        amount: donationAmount,
        message: donationData.message.trim(),
        isAnonymous: donationData.isAnonymous,
        paymentStatus: 'pending',
        donationDate: serverTimestamp(),
        status: 'pending',
        donationDetails: {
          title: donation.title,
          description: donation.description,
        },
      };

      let paymentData = null;

      // Process payment
      try {
        setPaymentLoading(true);

        const paymentRequest = {
          amount: donationAmount,
          donationId: donation.id,
          donationTitle: donation.title,
          email: donationData.isAnonymous
            ? 'anonymous@servenest.com'
            : donationData.email.trim(),
          contact: donationData.isAnonymous
            ? '9999999999'
            : donationData.phone.trim(),
          name: donationData.isAnonymous
            ? 'Anonymous Donor'
            : donationData.fullName.trim(),
        };

        paymentData = await DonationPaymentService.processDonationPayment(
          paymentRequest,
        );

        if (paymentData.success) {
          donationRecord.paymentStatus = 'completed';
          donationRecord.status = 'confirmed';
          donationRecord.payment = {
            paymentId: paymentData.paymentId,
            amount: paymentData.amount,
            currency: paymentData.currency,
            status: 'completed',
            method: 'razorpay',
            paidAt: paymentData.timestamp,
          };

          if (paymentData.orderId) {
            donationRecord.payment.orderId = paymentData.orderId;
          }
          if (paymentData.signature) {
            donationRecord.payment.signature = paymentData.signature;
          }
        } else {
          throw new Error(paymentData.error || 'Payment failed');
        }
      } catch (paymentError) {
        console.error('Payment failed:', paymentError);
        setPaymentLoading(false);
        setLoading(false);

        navigation.replace('DonationPaymentFailure', {
          errorData: {
            error: paymentError.message || 'Payment failed',
            code: 'PAYMENT_ERROR',
          },
          donationData: donation,
          donationAmount,
        });
        return;
      } finally {
        setPaymentLoading(false);
      }

      // Save donation to Firebase
      await addDoc(collection(db, 'DonationPayments'), donationRecord);

      // Update donation analytics
      const donationRef = doc(db, 'Donations', donation.id);
      await updateDoc(donationRef, {
        totalDonations: increment(1),
        totalAmount: increment(donationAmount),
        lastDonationDate: serverTimestamp(),
      });

      // Navigate to success screen
      navigation.replace('DonationPaymentSuccess', {
        paymentData,
        donationData: donationRecord,
        donationCause: donation,
      });
    } catch (error) {
      console.error('Error processing donation:', error);

      navigation.replace('DonationPaymentFailure', {
        errorData: {
          error: 'Donation failed: ' + error.message,
          code: 'DONATION_ERROR',
        },
        donationData: donation,
        donationAmount: Number(donationData.amount),
      });
    } finally {
      setLoading(false);
      setPaymentLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-gray-800 text-lg font-bold">Make Donation</Text>

          <View style={{width: 24}} />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4 space-y-6">
          {/* Donation Cause Summary */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Donation Cause
            </Text>
            <Text className="text-gray-800 font-medium text-lg mb-2">
              {donation.title}
            </Text>
            <Text className="text-gray-600 leading-6">
              {donation.description}
            </Text>
          </View>

          {/* Amount Selection */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Donation Amount
            </Text>

            {/* Predefined amounts */}
            <Text className="text-gray-700 font-medium mb-3">
              Quick Select:
            </Text>
            <View className="flex-row flex-wrap mb-4">
              {predefinedAmounts.map(amount => (
                <TouchableOpacity
                  key={amount}
                  className={`mr-3 mb-3 px-4 py-2 rounded-lg border ${
                    Number(donationData.amount) === amount
                      ? 'bg-green-500 border-green-500'
                      : 'bg-white border-gray-300'
                  }`}
                  onPress={() =>
                    setDonationData({
                      ...donationData,
                      amount: amount.toString(),
                    })
                  }>
                  <Text
                    className={`font-medium ${
                      Number(donationData.amount) === amount
                        ? 'text-white'
                        : 'text-gray-700'
                    }`}>
                    ₹{amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom amount */}
            <Text className="text-gray-700 font-medium mb-2">
              Or enter custom amount:
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
              placeholder="Enter amount (minimum ₹10)"
              value={donationData.amount}
              onChangeText={text =>
                setDonationData({...donationData, amount: text})
              }
              keyboardType="numeric"
            />
          </View>

          {/* Anonymous Donation Toggle */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() =>
                setDonationData({
                  ...donationData,
                  isAnonymous: !donationData.isAnonymous,
                })
              }>
              <View
                className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                  donationData.isAnonymous
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300'
                }`}>
                {donationData.isAnonymous && (
                  <Icon name="check" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text className="text-gray-700 flex-1">
                Make this an anonymous donation
              </Text>
            </TouchableOpacity>
          </View>

          {/* Donor Information */}
          {!donationData.isAnonymous && (
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-gray-800 font-bold text-lg mb-4">
                Donor Information
              </Text>

              <View className="space-y-4">
                <View>
                  <Text className="text-gray-700 font-medium mb-2">
                    Full Name *
                  </Text>
                  <TextInput
                    className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                    placeholder="Enter your full name"
                    value={donationData.fullName}
                    onChangeText={text =>
                      setDonationData({...donationData, fullName: text})
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
                    value={donationData.email}
                    onChangeText={text =>
                      setDonationData({...donationData, email: text})
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
                    value={donationData.phone}
                    onChangeText={text =>
                      setDonationData({...donationData, phone: text})
                    }
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Message */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-700 font-medium mb-2">
              Message (Optional)
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
              placeholder="Leave a message with your donation"
              value={donationData.message}
              onChangeText={text =>
                setDonationData({...donationData, message: text})
              }
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Terms and Conditions */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-3">
              Terms & Conditions
            </Text>
            <View className="space-y-2 mb-4">
              <Text className="text-gray-600 text-sm">
                • Donations are non-refundable
              </Text>
              <Text className="text-gray-600 text-sm">
                • Tax receipts will be provided for eligible donations
              </Text>
              <Text className="text-gray-600 text-sm">
                • Funds will be used for the specified cause
              </Text>
              <Text className="text-gray-600 text-sm">
                • Anonymous donations will not receive public recognition
              </Text>
            </View>

            <TouchableOpacity
              className="flex-row items-center"
              onPress={() =>
                setDonationData({
                  ...donationData,
                  agreeToTerms: !donationData.agreeToTerms,
                })
              }>
              <View
                className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                  donationData.agreeToTerms
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300'
                }`}>
                {donationData.agreeToTerms && (
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

      {/* Donate Button */}
      <View className="bg-white border-t border-gray-200 p-4">
        <TouchableOpacity
          className={`rounded-xl py-4 ${
            loading || paymentLoading ? 'bg-gray-400' : 'bg-green-500'
          }`}
          onPress={processDonation}
          disabled={loading || paymentLoading}>
          {loading || paymentLoading ? (
            <View className="flex-row justify-center items-center">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-white font-bold ml-2">
                {paymentLoading ? 'Processing Payment...' : 'Processing...'}
              </Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-center text-lg">
              Donate ₹{donationData.amount || '0'}
            </Text>
          )}
        </TouchableOpacity>

        <View className="flex-row items-center justify-center mt-2">
          <Icon name="security" size={16} color="#10B981" />
          <Text className="text-green-600 text-xs ml-1">
            Secure payment powered by Razorpay
          </Text>
        </View>
      </View>
    </View>
  );
}
