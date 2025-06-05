import RazorpayCheckout from 'react-native-razorpay';
import {RAZORPAY_CONFIG} from '../../config/paymentConfig';

export class PaymentService {
  static async processBusinessRegistrationPayment(paymentData) {
    const options = {
      description: RAZORPAY_CONFIG.BUSINESS_REGISTRATION_DESCRIPTION,
      image: RAZORPAY_CONFIG.COMPANY_LOGO,
      currency: RAZORPAY_CONFIG.CURRENCY,
      key: RAZORPAY_CONFIG.KEY,
      amount: paymentData.amount * 100, // Convert to paise
      name: RAZORPAY_CONFIG.COMPANY_NAME,
      prefill: {
        email: paymentData.email,
        contact: paymentData.contact,
        name: paymentData.name,
      },
      theme: {
        color: '#8BC34A', // Your primary color
      },
      modal: {
        ondismiss: () => {
          console.log('Payment modal dismissed by user');
        },
      },
      // Add test mode configuration
      ...(RAZORPAY_CONFIG.IS_TEST_MODE && {
        notes: {
          test_mode: 'true',
          environment: 'development',
        },
      }),
    };

    try {
      console.log('Initiating payment with options:', {
        ...options,
        key: options.key.substring(0, 10) + '...', // Log partial key for debugging
      });

      const data = await RazorpayCheckout.open(options);

      console.log('Payment successful:', data);

      return {
        success: true,
        paymentId: data.razorpay_payment_id,
        orderId: data.razorpay_order_id,
        signature: data.razorpay_signature,
        amount: paymentData.amount,
        currency: paymentData.currency || 'INR',
      };
    } catch (error) {
      console.log('Payment error:', error);

      // Handle different types of errors
      let errorMessage = 'Payment failed';
      let errorCode = 'UNKNOWN_ERROR';

      if (error.description) {
        errorMessage = error.description;
      } else if (error.reason) {
        errorMessage = error.reason;
      }

      if (error.code) {
        errorCode = error.code;
      }

      // Handle user cancellation
      if (
        error.code === 'PAYMENT_CANCELLED' ||
        error.description === 'PAYMENT_CANCELLED' ||
        errorMessage.toLowerCase().includes('cancelled')
      ) {
        errorMessage = 'Payment was cancelled by user';
        errorCode = 'USER_CANCELLED';
      }

      return {
        success: false,
        error: errorMessage,
        code: errorCode,
        originalError: error,
      };
    }
  }
}
