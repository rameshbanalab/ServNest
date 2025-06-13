import RazorpayCheckout from 'react-native-razorpay';
import {RAZORPAY_CONFIG} from '../../config/paymentConfig';
import {removeUndefinedFields} from '../../utils/dataValidation';

export class EventPaymentService {
  static async processEventBookingPayment(paymentData) {
    try {
      console.log('🔄 Starting event payment process:', {
        amount: paymentData.amount,
        eventId: paymentData.eventId,
        email: paymentData.email,
      });

      // Enhanced validation
      if (!paymentData || !paymentData.amount) {
        throw new Error('Invalid payment data: amount is required');
      }

      if (!paymentData.eventId) {
        throw new Error('Event ID is required for booking');
      }

      if (!paymentData.email || !paymentData.contact) {
        throw new Error('Email and contact are required');
      }

      const amountInPaise = Math.round(Number(paymentData.amount) * 100);

      if (isNaN(amountInPaise) || amountInPaise <= 0) {
        throw new Error('Invalid amount provided');
      }

      // Create clean options object with enhanced configuration
      let options = {
        description: `Event Booking - ${
          paymentData.eventTitle || 'ServeNest Event'
        }`,
        currency: RAZORPAY_CONFIG.CURRENCY || 'INR',
        key: RAZORPAY_CONFIG.KEY,
        amount: amountInPaise,
        name: RAZORPAY_CONFIG.COMPANY_NAME || 'ServeNest Events',
        prefill: {
          email: paymentData.email,
          contact: paymentData.contact.toString(),
          name: paymentData.name || 'Event Attendee',
        },
        theme: {
          color: '#FF4500',
        },
        modal: {
          ondismiss: () => {
            console.log('💰 Payment modal dismissed by user');
          },
          confirm_close: true,
          escape: true,
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        timeout: 300, // 5 minutes
        notes: {
          event_booking: 'true',
          event_id: paymentData.eventId,
          event_title: paymentData.eventTitle || '',
          app_name: 'ServeNest',
          booking_type: 'event',
          timestamp: new Date().toISOString(),
        },
        config: {
          display: {
            blocks: {
              banks: {
                name: 'Pay using Bank Transfer',
                instruments: [
                  {
                    method: 'netbanking',
                  },
                  {
                    method: 'upi',
                  },
                ],
              },
              card: {
                name: 'Pay using Cards',
                instruments: [
                  {
                    method: 'card',
                  },
                ],
              },
            },
            sequence: ['block.banks', 'block.card'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
      };

      // Add company logo if available
      if (RAZORPAY_CONFIG.COMPANY_LOGO) {
        options.image = RAZORPAY_CONFIG.COMPANY_LOGO;
      }

      // Remove undefined fields
      options = removeUndefinedFields(options);

      console.log('🔄 Opening Razorpay with sanitized options');

      // Open Razorpay payment
      const data = await RazorpayCheckout.open(options);

      console.log('✅ Razorpay payment data received:', {
        paymentId: data.razorpay_payment_id,
        orderId: data.razorpay_order_id || 'N/A',
        signature: data.razorpay_signature || 'N/A',
      });

      // Validate payment response
      if (!data.razorpay_payment_id) {
        throw new Error('Payment ID not received from Razorpay');
      }

      // Create comprehensive response
      const response = {
        success: true,
        paymentId: data.razorpay_payment_id,
        amount: paymentData.amount,
        currency: RAZORPAY_CONFIG.CURRENCY || 'INR',
        timestamp: new Date().toISOString(),
        method: 'razorpay',
        eventId: paymentData.eventId,
        eventTitle: paymentData.eventTitle,
        customerEmail: paymentData.email,
        customerContact: paymentData.contact,
        customerName: paymentData.name,
      };

      // Add optional fields if they exist
      if (data.razorpay_order_id) {
        response.orderId = data.razorpay_order_id;
      }

      if (data.razorpay_signature) {
        response.signature = data.razorpay_signature;
      }

      console.log('✅ Event payment successful:', {
        paymentId: response.paymentId,
        amount: response.amount,
        eventId: response.eventId,
      });

      return response;
    } catch (error) {
      console.error('❌ Event payment error:', error);

      let errorMessage = 'Payment failed';
      let errorCode = 'UNKNOWN_ERROR';

      // Enhanced error handling
      if (error.code === 0) {
        errorMessage = 'Payment cancelled by user';
        errorCode = 'USER_CANCELLED';
      } else if (error.code === 1) {
        errorMessage = 'Payment failed due to configuration error';
        errorCode = 'CONFIG_ERROR';
      } else if (error.code === 2) {
        errorMessage = 'Network error occurred during payment';
        errorCode = 'NETWORK_ERROR';
      } else if (error.description) {
        errorMessage = error.description;
        errorCode = error.code?.toString() || 'RAZORPAY_ERROR';
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
        eventId: paymentData.eventId,
      };
    }
  }

  // Additional utility method for payment verification
  static async verifyPayment(paymentId, orderId, signature) {
    try {
      // This would typically call your backend to verify the payment
      // For now, we'll return a simple verification
      console.log('🔍 Verifying payment:', {paymentId, orderId, signature});

      return {
        success: true,
        verified: true,
        paymentId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Payment verification failed:', error);
      return {
        success: false,
        verified: false,
        error: error.message,
      };
    }
  }
}
