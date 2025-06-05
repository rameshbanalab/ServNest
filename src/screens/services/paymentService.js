import RazorpayCheckout from 'react-native-razorpay';
import {RAZORPAY_CONFIG} from '../../config/paymentConfig';

export class PaymentService {
  static async processBusinessRegistrationPayment(paymentData) {
    // Ensure amount is a number and convert to paise
    const amountInPaise = Math.round(Number(paymentData.amount) * 100);

    const options = {
      description: RAZORPAY_CONFIG.BUSINESS_REGISTRATION_DESCRIPTION,
      image: RAZORPAY_CONFIG.COMPANY_LOGO,
      currency: RAZORPAY_CONFIG.CURRENCY,
      key: RAZORPAY_CONFIG.KEY, // Make sure this is your test key
      amount: amountInPaise, // Amount in paise (₹1 = 100 paise)
      name: RAZORPAY_CONFIG.COMPANY_NAME,
      prefill: {
        email: paymentData.email || 'test@example.com',
        contact: paymentData.contact || '9999999999',
        name: paymentData.name || 'Test User',
      },
      theme: {
        color: '#8BC34A',
      },
      modal: {
        ondismiss: () => {
          console.log('Payment modal dismissed');
        },
      },
      // Add these for better error handling
      retry: {
        enabled: true,
        max_count: 3,
      },
      timeout: 180, // 3 minutes timeout
    };

    console.log('Payment options:', {
      ...options,
      key: options.key.substring(0, 10) + '...', // Log partial key for security
    });

    try {
      const data = await RazorpayCheckout.open(options);

      console.log('Payment successful:', data);

      return {
        success: true,
        paymentId: data.razorpay_payment_id,
        orderId: data.razorpay_order_id,
        signature: data.razorpay_signature,
        amount: paymentData.amount,
        currency: RAZORPAY_CONFIG.CURRENCY,
      };
    } catch (error) {
      console.log('Payment error details:', error);

      let errorMessage = 'Payment failed';
      let errorCode = 'UNKNOWN_ERROR';

      // Handle specific error cases
      if (error.code === 1) {
        errorMessage = 'Payment failed due to configuration error';
        errorCode = 'CONFIG_ERROR';
      } else if (error.description) {
        errorMessage = error.description;
        errorCode = error.code || 'RAZORPAY_ERROR';
      } else if (error.reason) {
        errorMessage = error.reason;
        errorCode = 'PAYMENT_ERROR';
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
