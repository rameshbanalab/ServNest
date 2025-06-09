import RazorpayCheckout from 'react-native-razorpay';
import {RAZORPAY_CONFIG} from '../../config/paymentConfig';
import {removeUndefinedFields} from '../../utils/dataValidation';

export class EventPaymentService {
  static async processEventBookingPayment(paymentData) {
    try {
      // Validate input data
      if (!paymentData || !paymentData.amount) {
        throw new Error('Invalid payment data: amount is required');
      }

      const amountInPaise = Math.round(Number(paymentData.amount) * 100);

      if (isNaN(amountInPaise) || amountInPaise <= 0) {
        throw new Error('Invalid amount provided');
      }

      // Create clean options object - EXACTLY like business registration
      let options = {
        description: `Event Booking - ${
          paymentData.eventTitle || 'ServeNest Event'
        }`,
        currency: RAZORPAY_CONFIG.CURRENCY,
        key: RAZORPAY_CONFIG.KEY,
        amount: amountInPaise,
        name: RAZORPAY_CONFIG.COMPANY_NAME,
        prefill: {
          email: paymentData.email || 'test@servenest.com',
          contact: paymentData.contact || '9999999999',
          name: paymentData.name || 'Test User',
        },
        theme: {
          color: '#8BC34A',
        },
        modal: {
          ondismiss: () => {},
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        timeout: 180,
        notes: {
          event_booking: 'true',
          event_id: paymentData.eventId || '',
          app_name: 'ServeNest',
        },
      };

      // Add image only if it exists
      if (RAZORPAY_CONFIG.COMPANY_LOGO) {
        options.image = RAZORPAY_CONFIG.COMPANY_LOGO;
      }

      // Remove undefined fields - SAME as business registration
      options = removeUndefinedFields(options);

      console.log('🔄 Opening Razorpay with options:', {
        ...options,
        key: 'rzp_***', // Hide key in logs
      });

      const data = await RazorpayCheckout.open(options);

      // Create response with proper fallbacks - SAME as business registration
      const response = {
        success: true,
        paymentId: data.razorpay_payment_id,
        amount: paymentData.amount,
        currency: RAZORPAY_CONFIG.CURRENCY,
        timestamp: new Date().toISOString(),
        method: 'razorpay',
      };

      // Only add optional fields if they exist
      if (data.razorpay_order_id) {
        response.orderId = data.razorpay_order_id;
      }

      if (data.razorpay_signature) {
        response.signature = data.razorpay_signature;
      }

      console.log('✅ Payment successful:', response);
      return response;
    } catch (error) {
      console.error('❌ Payment error:', error);

      let errorMessage = 'Payment failed';
      let errorCode = 'UNKNOWN_ERROR';

      // SAME error handling as business registration
      if (error.code === 1) {
        errorMessage = 'Payment failed due to configuration error';
        errorCode = 'CONFIG_ERROR';
      } else if (error.description) {
        errorMessage = error.description;
        errorCode = error.code || 'RAZORPAY_ERROR';
      } else if (error.reason) {
        errorMessage = error.reason;
        errorCode = 'PAYMENT_ERROR';
      } else if (error.message) {
        errorMessage = error.message;
        errorCode = 'VALIDATION_ERROR';
      }

      return {
        success: false,
        error: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
