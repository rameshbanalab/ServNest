// src/config/firebaseConfig.js
import {initializeApp, getApps} from 'firebase/app';
import {getFirestore} from 'firebase/firestore';
import {initializeAuth, getReactNativePersistence} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyC8uGF2eKqkDVAZ41mn_QRU-m_z_jgr_2Q',
  authDomain: 'justdial-92398.firebaseapp.com',
  projectId: 'justdial-92398',
  storageBucket: 'justdial-92398.firebasestorage.app',
  messagingSenderId: '853944499689',
  appId: '1:853944499689:web:504206eca9f055d7971f78',
  measurementId: 'G-3Y1NBLBS1J',
};
// Initialize Firebase only once
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore
const db = getFirestore(app);

export {auth, db};
