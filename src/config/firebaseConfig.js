// src/config/firebaseConfig.js
import {initializeApp, getApps} from 'firebase/app';
import {getFirestore} from 'firebase/firestore';
import {initializeAuth, getReactNativePersistence} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBHf9O6kjKHVVUIkCVIWSroqdxaq0gE2bM',
  authDomain: 'community-ecommerce.firebaseapp.com',
  projectId: 'community-ecommerce',
  storageBucket: 'community-ecommerce.appspot.com', // Fixed .app -> .appspot.com
  messagingSenderId: '910772303436',
  appId: '1:910772303436:web:dfdf965fe71ad2ff2166e9',
  measurementId: 'G-7Z7HXE4H8P',
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
