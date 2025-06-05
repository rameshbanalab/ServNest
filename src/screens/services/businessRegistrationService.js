import {db} from '../../config/firebaseConfig';
import {doc, getDoc} from 'firebase/firestore';

export class BusinessRegistrationService {
  static async getRegistrationFee() {
    try {
      const settingsDoc = await getDoc(
        doc(db, 'settings', 'businessRegistration'),
      );
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        return {
          amount: data.price || 150,
          currency: data.currency || 'INR',
          lastUpdated: data.lastUpdated,
          updatedBy: data.updatedBy,
        };
      }
      return {
        amount: 150, // Default amount
        currency: 'INR',
      };
    } catch (error) {
      console.error('Error fetching registration fee:', error);
      return {
        amount: 150, // Default fallback
        currency: 'INR',
      };
    }
  }
}
