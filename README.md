# ServeNest - Local Service Discovery App

A React Native application that connects customers with local service providers, featuring business registration, reviews, ratings, and integrated payment processing.

---

## Table of Contents

* Project Overview
* Features
* Prerequisites
* Installation
* Configuration
* Running the Application
* Project Structure
* Key Components
* Payment Integration
* Firebase Setup
* Troubleshooting
* Support
* Version Information
* Security Notes
* License

---

## Project Overview

ServeNest is a comprehensive local service discovery platform that allows:

* **Customers** to find and connect with local service providers
* **Business Owners** to register their businesses and manage their profiles
* **Service Providers** to showcase their services and receive customer reviews

---

## Features

### Core Features

* 🔐 User Authentication (Login/Signup with Firebase)
* 🏢 Business Registration with payment integration
* ⭐ Rating & Review System for businesses
* 📍 Location-based Service Discovery
* 💳 Razorpay Payment Integration
* 📱 Professional UI/UX with responsive design

### User Features

* Browse services by category
* View business details, ratings, and reviews
* Contact businesses via phone, WhatsApp, or email
* Get directions to business locations
* Submit reviews and ratings

### Business Owner Features

* Register new businesses (with payment)
* Manage business profiles
* Upload business images
* Set operating hours
* View and respond to customer reviews

---

## Prerequisites

Ensure you have:

* Node.js (v16 or higher)
* npm or yarn
* React Native CLI (`npm install -g react-native-cli`)
* Android Studio
* Xcode (macOS only)
* Firebase Account
* Razorpay Account

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ServeNest
```

### 2. Install Dependencies

```bash
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..
```

### 3. Install Required React Native Packages

```bash
npm install @react-navigation/native @react-navigation/stack @react-navigation/drawer
npm install react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated
npm install firebase @react-native-firebase/app
npm install react-native-razorpay
npm install react-native-vector-icons
npm install react-native-image-picker
npm install react-native-modal-datetime-picker
npm install @react-native-async-storage/async-storage
npm install @react-native-clipboard/clipboard
npm install react-native-ratings
```

### 4. Link Native Dependencies (React Native < 0.60 only)

```bash
react-native link
```

---

## Configuration

### 1. Firebase Configuration (`src/config/firebaseConfig.js`)

```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 2. Razorpay Configuration (`src/config/paymentConfig.js`)

```js
export const RAZORPAY_CONFIG = {
  TEST_KEY: 'rzp_test_your_test_key',
  LIVE_KEY: 'rzp_live_your_live_key',
  KEY: 'rzp_test_your_test_key',
  COMPANY_NAME: 'ServeNest',
  COMPANY_LOGO: 'https://your-logo-url.com/logo.png',
  CURRENCY: 'INR',
  BUSINESS_REGISTRATION_DESCRIPTION: 'Business Registration Fee - ServeNest',
  IS_TEST_MODE: true,
};
```


### 3. Android Configuration

Add to `android/app/build.gradle`:

```gradle
dependencies {
    implementation project(':react-native-razorpay')
    // ... other dependencies
}
```

Add to `android/settings.gradle`:

```gradle
include ':react-native-razorpay'
project(':react-native-razorpay').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-razorpay/android')
```

### 4. iOS Configuration (macOS only)

Add to `ios/Podfile`:

```ruby
pod 'react-native-razorpay', :path => '../node_modules/react-native-razorpay'
```

Then:

```bash
cd ios && pod install && cd ..
```

---

## Running the Application

### Development Mode

```bash
npx react-native start
npx react-native run-android
npx react-native run-ios
```

### Production Build

```bash
# Android
cd android && ./gradlew assembleRelease

# iOS (use Xcode for archive)
```

---

## Project Structure

```
ServeNest/
├── src/
│   ├── components/
│   ├── screens/
│   ├── navigation/
│   ├── config/
│   ├── services/
│   └── utils/
├── android/
├── ios/
├── package.json
└── README.md
```

---

## Key Components

### Authentication Flow

* Firebase Authentication
* Profile Management
* Password Reset

### Business Management

* Multi-step Business Registration
* My Businesses
* Edit Business

### Service Discovery

* Browse by Category
* View Details and Reviews
* Ratings and Comments

### Payment Processing

* Razorpay Integration
* Success/Failure Screens
* Transaction Records

---

## Payment Integration

### Payment Flow

1. Fill registration form
2. Open Razorpay modal
3. Complete payment
4. View result screen
5. Business is registered

---

## Firebase Setup

### Required Collections

```
Collections:
├── Users/
├── Businesses/
├── Categories/
├── SubCategories/
├── Reviews/
└── settings/
    └── businessRegistration
```

### Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /Users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /Businesses/{businessId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /Reviews/{reviewId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /Categories/{categoryId} {
      allow read: if true;
    }
    match /SubCategories/{subCategoryId} {
      allow read: if true;
    }
  }
}
```

---

## Troubleshooting

### Metro Issues

```bash
npx react-native start --reset-cache
npm start -- --reset-cache
```

### Android Issues

```bash
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

### iOS Issues (macOS only)

```bash
cd ios && rm -rf Pods && pod install && cd ..
npx react-native run-ios
```

### Payment Issues

* Check Razorpay API keys
* Ensure test mode is active
* Validate amount format (paise)
* Check network

### Firebase Issues

* Verify Firebase config
* Check Firestore rules
* Confirm project is active

---

## Support

### Documentation

* React Native Docs
* Firebase Docs
* Razorpay Docs

### Contact

* Developer: [your-email@domain.com](mailto:your-email@domain.com)
* Issues: GitHub repository
* Business: [business@servenest.com](mailto:business@servenest.com)

---

## Version Information

* App Version: 1.0.0
* React Native Version: 0.72.x
* Last Updated: December 2024

---

## Security Notes

* Never commit API keys
* Use `.env` for sensitive config
* Set Firestore rules before production
* Use HTTPS
* Validate payments on backend
* Regularly audit dependencies

