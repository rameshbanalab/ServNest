import auth from '@react-native-firebase/auth';

export class PhoneAuthService {
  static confirmationResult = null;

  // Send OTP using React Native Firebase (no reCAPTCHA needed)
  static async sendOTP(phoneNumber) {
    try {
      const formattedPhone = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+91${phoneNumber}`;

      console.log('📱 Sending OTP to:', formattedPhone);

      // React Native Firebase handles phone auth natively
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);

      this.confirmationResult = confirmation;

      console.log('✅ OTP sent successfully');

      return {
        success: true,
        confirmationResult: confirmation,
        verificationId: confirmation.verificationId,
      };
    } catch (error) {
      console.error('❌ Error sending OTP:', error);

      let errorMessage = 'Failed to send OTP';
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = 'Invalid phone number format';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later';
          break;
        case 'auth/quota-exceeded':
          errorMessage = 'SMS quota exceeded. Please try again later';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This phone number has been disabled';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        error: errorMessage,
        code: error.code,
      };
    }
  }

  // Verify OTP using React Native Firebase
  static async verifyOTP(confirmationResult, otpCode) {
    try {
      console.log('🔐 Verifying OTP:', otpCode);

      const userCredential = await confirmationResult.confirm(otpCode);

      console.log('✅ OTP verified successfully');

      return {
        success: true,
        user: userCredential.user,
      };
    } catch (error) {
      console.error('❌ Error verifying OTP:', error);

      let errorMessage = 'Invalid OTP';
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = 'Invalid OTP code';
          break;
        case 'auth/code-expired':
          errorMessage = 'OTP has expired. Please request a new one';
          break;
        case 'auth/session-expired':
          errorMessage = 'Session expired. Please try again';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        error: errorMessage,
        code: error.code,
      };
    }
  }

  // Get current user from React Native Firebase
  static getCurrentUser() {
    return auth().currentUser;
  }

  // Sign out from React Native Firebase
  static async signOut() {
    try {
      await auth().signOut();
      this.confirmationResult = null;
      return {success: true};
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Cleanup
  static cleanup() {
    this.confirmationResult = null;
  }
}
