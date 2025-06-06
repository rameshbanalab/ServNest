// Firebase Web SDK for Firestore, Storage, Functions
import {initializeApp, getApps} from 'firebase/app';
import {getFirestore} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';
import {getFunctions} from 'firebase/functions';

// React Native Firebase for Authentication (better phone auth support)
import auth from '@react-native-firebase/auth';

// Your existing Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyC8uGF2eKqkDVAZ41mn_QRU-m_z_jgr_2Q',
  authDomain: 'justdial-92398.firebaseapp.com',
  projectId: 'justdial-92398',
  storageBucket: 'justdial-92398.firebasestorage.app',
  messagingSenderId: '853944499689',
  appId: '1:853944499689:web:504206eca9f055d7971f78',
  measurementId: 'G-3Y1NBLBS1J',
};

// Initialize Firebase Web SDK (for Firestore, Storage, Functions)
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Web SDK services
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Export hybrid configuration
export {
  // React Native Firebase Auth (for phone authentication)
  auth,

  // Firebase Web SDK services (for database, storage, etc.)
  db,
  storage,
  functions,

  // Firebase app instance
  app,
};

export default app;
