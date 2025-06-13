/* eslint-disable no-shadow */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Linking,
  Alert,
  FlatList,
  Share,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Rating} from 'react-native-ratings';
import {auth, db} from '../config/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  orderBy,
  limit,
  Firestore,
  setDoc,
} from 'firebase/firestore';
import {
  generateOperatingHoursDisplay,
  getBusinessStatus,
} from '../utils/businessHours';
import firestore from '@react-native-firebase/firestore';
import {processWeeklySchedule, formatTime} from '../utils/timeUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.4;
const TAB_LIST = ['About', 'Reviews', 'Timings', 'Contact', 'Address'];

// Rating and Reviews Component
const BusinessRatingSection = ({
  businessId,
  businessName,
  onReviewSubmitted,
}) => {
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [userAmountBusiness, setUserAmountBusiness] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  useEffect(() => {
    fetchReviews();
    checkUserReview();
  }, [businessId]);

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const reviewsQuery = query(
        collection(db, 'Reviews'),
        where('businessId', '==', businessId),
        orderBy('timestamp', 'desc'),
        limit(showAllReviews ? 50 : 5),
      );

      const querySnapshot = await getDocs(reviewsQuery);
      const reviewsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setReviews(reviewsData);

      if (reviewsData.length > 0) {
        const total = reviewsData.reduce(
          (sum, review) => sum + review.rating,
          0,
        );
        setAverageRating(total / reviewsData.length);
        setTotalReviews(reviewsData.length);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const checkUserReview = async () => {
    try {
      const user = auth().currentUserUser;
      if (!user) return;

      const userReviewQuery = query(
        collection(db, 'Reviews'),
        where('businessId', '==', businessId),
        where('userId', '==', user.uid),
      );

      const querySnapshot = await getDocs(userReviewQuery);
      setUserHasReviewed(!querySnapshot.empty);

      if (!querySnapshot.empty) {
        const userReview = querySnapshot.docs[0].data();
        setUserRating(userReview.rating);
        setUserComment(userReview.comment || '');
      }
    } catch (error) {
      console.error('Error checking user review:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (userRating === 0) {
      Alert.alert(
        'Rating Required',
        'Please provide a rating before submitting.',
      );
      return;
    }

    const user = auth().currentUser;

    if (!user) {
      Alert.alert('Login Required', 'Please login to submit a review.');
      return;
    }

    setSubmitting(true);
    try {
      const reviewData = {
        businessId,
        userId: user.uid,
        rating: userRating,
        comment: userComment.trim(),
        timestamp: new Date().toISOString(),
        userName: user.displayName || 'Anonymous User',
        userEmail: user.email,
        userAmountBusiness: userAmountBusiness.trim(),
      };

      await addDoc(collection(db, 'Reviews'), reviewData);

      // Update business aggregated rating
      const businessRef = doc(db, 'Businesses', businessId);
      const businessSnapshot = await getDoc(businessRef);

      if (businessSnapshot.exists()) {
        const businessData = businessSnapshot.data();
        const currentTotalReviews = businessData.totalReviews || 0;
        const currentAverageRating = businessData.averageRating || 0;
        const newTotalReviews = currentTotalReviews + 1;
        const newAverageRating =
          (currentAverageRating * currentTotalReviews + userRating) /
          newTotalReviews;

        await updateDoc(businessRef, {
          averageRating: newAverageRating,
          totalReviews: newTotalReviews,
        });
      }

      Alert.alert('Success', 'Thank you for your feedback!');
      setUserHasReviewed(true);
      fetchReviews();
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, size = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-border'}
          size={size}
          color="#F59E0B"
        />,
      );
    }
    return stars;
  };

  const renderReviewItem = ({item}) => (
    <View className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-100">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="bg-primary-light rounded-full w-8 h-8 items-center justify-center mr-3">
            <Text className="text-primary-dark font-bold text-sm">
              {item.userName?.charAt(0)?.toUpperCase() || 'A'}
            </Text>
          </View>
          <View>
            <Text className="text-gray-800 font-medium text-sm">
              {item.userName || 'Anonymous User'}
            </Text>
            <Text className="text-gray-400 text-xs">
              {new Date(item.timestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>
        <View className="flex-row">{renderStars(item.rating, 14)}</View>
      </View>
      {item.userAmountBusiness && (
        <Text className="text-gray-700 text-sm leading-5 mt-2">
          <Text className="font-bold">Business Amount : </Text> &#8377;&nbsp;
          {item.userAmountBusiness}
        </Text>
      )}
      {item.comment && (
        <Text className="text-gray-700 text-sm leading-5 mt-2">
          <Text className="font-bold">Review : </Text>
          {item.comment}
        </Text>
      )}
    </View>
  );

  return (
    <View className="px-4 py-4 bg-white">
      {/* Overall Rating Display */}
      <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <Text className="text-gray-800 font-bold text-lg mb-4">
          Ratings & Reviews
        </Text>

        {totalReviews > 0 ? (
          <View className="flex-row items-center mb-6">
            <View className="items-center mr-8">
              <Text className="text-4xl font-bold text-gray-800 mb-1">
                {averageRating.toFixed(1)}
              </Text>
              <View className="flex-row mb-1">
                {renderStars(Math.round(averageRating), 20)}
              </View>
              <Text className="text-gray-500 text-sm">
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </Text>
            </View>

            {/* Rating Distribution */}
            <View className="flex-1">
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviews.filter(
                  r => Math.round(r.rating) === star,
                ).length;
                const percentage =
                  totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                return (
                  <View key={star} className="flex-row items-center mb-1">
                    <Text className="text-gray-600 text-xs w-2">{star}</Text>
                    <Icon name="star" size={12} color="#F59E0B" />
                    <View className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                      <View
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{width: `${percentage}%`}}
                      />
                    </View>
                    <Text className="text-gray-500 text-xs w-8">{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View className="items-center py-8">
            <Icon name="star-border" size={48} color="#D1D5DB" />
            <Text className="text-gray-500 text-base mt-2">No reviews yet</Text>
            <Text className="text-gray-400 text-sm">
              Be the first to review!
            </Text>
          </View>
        )}

        {/* User Rating Section */}
        {!userHasReviewed ? (
          <View className="border-t border-gray-100 pt-6">
            <Text className="text-gray-800 font-semibold text-base mb-4">
              Rate this business
            </Text>

            <View className="items-center mb-6">
              <View className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <Rating
                  type="star"
                  ratingCount={5}
                  imageSize={38}
                  showRating={false}
                  onFinishRating={setUserRating}
                  startingValue={userRating}
                  tintColor="grey"
                  ratingColor="#8BC34A"
                  ratingBackgroundColor="#E5E7EB"
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                  readonly={false}
                  fractions={0}
                />

                {userRating > 0 && (
                  <View className="mt-4 items-center">
                    <View className="bg-primary-light rounded-full px-4 py-2">
                      <Text className="text-primary-dark font-semibold text-sm">
                        {userRating} out of 5 stars
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <TextInput
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4 text-gray-800"
              placeholder="Enter the amount of Business (optional)"
              placeholderTextColor="#9CA3AF"
              value={userAmountBusiness}
              onChangeText={setUserAmountBusiness}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <TextInput
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4 text-gray-800"
              placeholder="Share your experience (optional)"
              placeholderTextColor="#9CA3AF"
              value={userComment}
              onChangeText={setUserComment}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <TouchableOpacity
              className="bg-primary rounded-xl py-4 items-center justify-center shadow-sm"
              onPress={handleSubmitReview}
              disabled={submitting || userRating === 0}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Submit Review
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="border-t border-gray-100 pt-6">
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 flex-row items-center">
              <Icon name="check-circle" size={20} color="#16A34A" />
              <Text className="text-green-700 font-medium ml-3">
                Thank you for your review!
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Reviews List */}
      {reviews.length > 0 && (
        <View>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-gray-800 font-semibold text-base">
              Recent Reviews
            </Text>
            {reviews.length > 5 && (
              <TouchableOpacity
                onPress={() => {
                  setShowAllReviews(!showAllReviews);
                  fetchReviews();
                }}
                className="bg-primary-light rounded-full px-3 py-1">
                <Text className="text-primary-dark font-medium text-sm">
                  {showAllReviews ? 'Show Less' : `View All (${totalReviews})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingReviews ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color="#8BC34A" />
              <Text className="text-gray-500 text-sm mt-2">
                Loading reviews...
              </Text>
            </View>
          ) : (
            <FlatList
              data={reviews}
              renderItem={renderReviewItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </View>
  );
};

// Enhanced Professional Location Card (keeping your existing implementation)
const ProfessionalLocationCard = ({
  latitude,
  longitude,
  businessName,
  address,
  distance,
  contactNumber,
}) => {
  // ... keeping your existing ProfessionalLocationCard implementatio

  const handleGetDirections = () => {
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&dir_action=navigate`;
    Linking.openURL(directionsUrl).catch(err =>
      console.error('Error opening Google Maps directions:', err),
    );
  };

  return (
    <View className="w-full bg-white rounded-2xl shadow-lg border border-gray-100 mb-4 overflow-hidden">
      {/* Content Section */}
      <View className="p-6">
        {/* Distance Badge */}
        {distance && (
          <View className="flex-row items-center mb-4">
            <View className="bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <Text className="text-green-700 font-semibold text-sm">
                📍 {distance.toFixed(1)} km away
              </Text>
            </View>
          </View>
        )}

        {/* Secondary Actions Grid */}
        <View className="flex-row space-x-2">
          <TouchableOpacity
            className="flex-1 bg-blue-50 mr-4 border border-blue-200 rounded-xl p-3 items-center active:bg-blue-100"
            onPress={handleGetDirections}>
            <Icon name="navigation" size={18} color="#3B82F6" />
            <Text className="text-blue-700 text-xs mt-1 font-semibold">
              Directions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 items-center active:bg-gray-100"
            onPress={() => {
              const coordinates = `${latitude},${longitude}`;
              const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
              Share.share({
                message: `📍 ${businessName}\nLocation: ${coordinates}\nPhone: ${
                  contactNumber || 'Not available'
                }\nGoogle Maps: ${googleMapsLink}\n\nShared via ServeNest`,
                title: 'Share Location',
              });
            }}>
            <Icon name="share" size={18} color="#6B7280" />
            <Text className="text-gray-700 text-xs mt-1 font-semibold">
              Share
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Enhanced Image Component with Fallback (keeping your existing implementation)
const ImageWithFallback = ({source, fallbackIcon, categoryName, style}) => {
  const [imageError, setImageError] = useState(false);

  const renderFallbackIcon = () => (
    <View
      className="w-full bg-primary-light items-center justify-center"
      style={style}>
      <View className="bg-white rounded-full p-8 shadow-lg">
        <Icon name={fallbackIcon} size={80} color="#8BC34A" />
      </View>
      <Text className="text-primary-dark font-bold text-xl mt-4">
        {categoryName}
      </Text>
    </View>
  );

  if (imageError) {
    return renderFallbackIcon();
  }

  return (
    <Image
      source={source}
      style={style}
      resizeMode="cover"
      onError={() => setImageError(true)}
    />
  );
};

const ServiceShowcase = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {service} = route.params || {};
  const [activeTab, setActiveTab] = useState('About');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Category icon mapping for fallback
  const categoryIcons = {
    Plumbers: 'plumbing',
    Electricians: 'electrical_services',
    Restaurants: 'restaurant',
    Doctors: 'medical_services',
    Automotive: 'directions_car',
    'Retail & Consumer Services': 'shopping_cart',
    'Health & Medical Services': 'local_hospital',
    'Food & Dining': 'fastfood',
  };

  if (!service) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center p-4">
        <Text className="text-red-500 text-lg mb-4">
          Error: Service data not found
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-lg p-3 shadow-sm"
          onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold px-4 py-1">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const businessStatus = getBusinessStatus(service.weeklySchedule);
  const hasImages = service.images && service.images.length > 0;
  const categoryIcon = categoryIcons[service.category] || 'business';

  // Enhanced Share Function with Google Maps Link and Phone Number
  const handleShare = async () => {
    try {
      const businessStatus = getBusinessStatus(service.weeklySchedule);

      const googleMapsLink =
        service.latitude && service.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              service.name,
            )}`;

      const shareTitle = `${service.name} - ${service.category}`;

      const shareMessage = `🏪 *${service.name}*
📍 ${service.category}
${
  businessStatus.status === 'open' ? '🟢 Currently Open' : '🔴 Currently Closed'
}
⭐ ${service.rating} Rating

📞 Contact: ${service.contactNumber || 'Not available'}
📧 Email: ${service.email || 'Not available'}

📍 Address: ${
        service.address
          ? `${service.address.street ? service.address.street + ', ' : ''}${
              service.address.city
            }${service.address.pinCode ? ' - ' + service.address.pinCode : ''}`
          : 'Address not specified'
      }

⏰ Hours: ${
        service.weeklySchedule
          ? generateOperatingHoursDisplay(service.weeklySchedule)
          : 'Hours not specified'
      }

${service.distance ? `📏 Distance: ${service.distance.toFixed(1)} km away` : ''}

🗺️ View Location: ${googleMapsLink}

Found this service on ServeNest App! 📱`;

      const shareOptions = {
        title: shareTitle,
        message: shareMessage,
        url: googleMapsLink,
      };

      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
      }
    } catch (error) {
      console.error('Error sharing service:', error);
      Alert.alert(
        'Share Error',
        'Unable to share this service. Please try again.',
      );
    }
  };

  const handleCall = () => {
    if (service.contactNumber) {
      Linking.openURL(`tel:${service.contactNumber}`);
    } else {
      Alert.alert('No Contact', 'No phone number available for this business.');
    }
  };

  const handleEmail = () => {
    if (service.email) {
      Linking.openURL(`mailto:${service.email}`);
    } else {
      Alert.alert('No Email', 'No email address available for this business.');
    }
  };

  // const getChatId = (userAId, userBId) => {
  //   return [userAId, userBId].sort().join('_');
  // };
  // const createChat = async (currentUserId, otherUserId) => {
  //   try {
  //     console.log('Create Chat');
  //     const chatId = getChatId(currentUserId, otherUserId);

  //     const chatRef = doc(db, 'Chats', chatId);
  //     console.log('Chat ID:', chatRef);
  //     const chatDoc = await getDoc(chatRef);

  //     if (!chatDoc.exists()) {
  //       console.log('Creating new chat document for', chatId);
  //       await setDoc(chatRef, {
  //         participants: [currentUserId, otherUserId],
  //         createdAt: new Date(),
  //       });
  //     }

  //     const userRef = doc(db, 'Users', currentUserId);
  //     const otherUserRef = doc(db, 'Users', otherUserId);

  //     await setDoc(userRef, {chatIds: {[otherUserId]: chatId}}, {merge: true});
  //     await setDoc(
  //       otherUserRef,
  //       {chatIds: {[currentUserId]: chatId}},
  //       {merge: true},
  //     );

  //     return chatId;
  //   } catch (error) {
  //     console.error('Error in createChat:', error);
  //     throw error;
  //   }
  // };

  // const handleChat = async () => {
  //   console.log('handleChat called');

  //   try {
  //     const userId = await AsyncStorage.getItem('authToken');
  //     const otherUserId = service.userId; // Business owner's user ID

  //     console.log('userId:', userId, 'otherUserId:', otherUserId);

  //     // Enhanced validation
  //     if (!userId) {
  //       Alert.alert('Authentication Error', 'Please login to start chatting.');
  //       return;
  //     }

  //     if (!otherUserId) {
  //       Alert.alert(
  //         'Error',
  //         'Business owner information not available for chat.',
  //       );
  //       return;
  //     }

  //     if (userId === otherUserId) {
  //       Alert.alert('Error', 'You cannot chat with yourself.');
  //       return;
  //     }

  //     console.log('Service data:', service);

  //     if (service.ownerName && otherUserId) {
  //       const name = service.ownerName;

  //       // Get or create chat ID
  //       let chatId = service.chatIds?.[userId];
  //       if (!chatId) {
  //         console.log('Creating chat for', name);
  //         chatId = await createChat(userId, otherUserId);
  //         console.log("Here's the chatId:", chatId);
  //         service.chatIds = {...service.chatIds, [userId]: chatId};
  //       }

  //       console.log('Navigating to Chat:', {
  //         name,
  //         chatId,
  //         recipientId: otherUserId,
  //       });

  //       navigation.navigate('UserChat', {
  //         name: name,
  //         chatId: chatId,
  //         recipientId: otherUserId,
  //       });
  //     } else {
  //       Alert.alert('Error', 'Business owner information not available.');
  //     }
  //   } catch (error) {
  //     console.error('Error in handleChat:', error);
  //     Alert.alert('Error', 'Failed to start chat. Please try again.');
  //   }
  // };

  const handleWhatsApp = () => {
    if (service.contactNumber) {
      const phoneNumber = service.contactNumber.replace(/[^\d]/g, '');
      const googleMapsLink =
        service.latitude && service.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}`
          : '';

      const message = `🏪 *${service.name}*\n📍 ${service.category}\n${
        businessStatus.status === 'open' ? '🟢 Open Now' : '🔴 Closed'
      }\n⭐ ${service.rating} Rating\n\n📞 ${
        service.contactNumber
      }\n🗺️ Location: ${googleMapsLink}\n\nFound on ServeNest App! 📱`;

      Linking.openURL(
        `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(
          message,
        )}`,
      );
    } else {
      Alert.alert('No Contact', 'No phone number available for WhatsApp.');
    }
  };

  const handleDirections = () => {
    if (service.latitude && service.longitude) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}`,
      );
    } else {
      Alert.alert(
        'No Location',
        'Location coordinates not available for this business.',
      );
    }
  };

  const renderImageItem = ({item}) => (
    <ImageWithFallback
      source={{uri: `data:image/jpeg;base64,${item.base64}`}}
      fallbackIcon={categoryIcon}
      categoryName={service.category}
      style={{width: SCREEN_WIDTH, height: IMAGE_HEIGHT}}
    />
  );

  const renderFallbackIcon = () => (
    <View
      className="w-full bg-primary-light items-center justify-center"
      style={{width: SCREEN_WIDTH, height: IMAGE_HEIGHT}}>
      <View className="bg-white rounded-full p-8 shadow-lg">
        <Icon name={categoryIcon} size={80} color="#8BC34A" />
      </View>
      <Text className="text-primary-dark font-bold text-xl mt-4">
        {service.category}
      </Text>
    </View>
  );

  const renderImageIndicators = () => (
    <View className="absolute bottom-4 left-0 right-0 flex-row justify-center space-x-2">
      {service.images.map((_, index) => (
        <View
          key={index}
          className={`h-2 w-2 rounded-full ${
            index === activeImageIndex ? 'bg-primary' : 'bg-white'
          } opacity-80`}
        />
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'About':
        return (
          <View className="px-4 py-4 bg-white">
            <Text className="text-primary-dark font-bold mb-2">
              About {service.name}
            </Text>
            <Text className="text-gray-700 text-base mb-3">
              {service.description ||
                `${
                  service.name
                } is a professional ${service.category.toLowerCase()} service provider offering quality services to customers.`}
            </Text>

            {service.subCategories && service.subCategories.length > 0 && (
              <>
                <Text className="text-primary-dark font-bold mb-2">
                  Services Offered
                </Text>
                <View className="flex-row flex-wrap mb-3">
                  {service.subCategories.map((sub, index) => (
                    <View
                      key={index}
                      className="bg-primary-light px-3 py-1 rounded-full mr-2 mb-2">
                      <Text className="text-primary-dark text-sm">{sub}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {service.ownerName && (
              <>
                <Text className="text-primary-dark font-bold mb-2">Owner</Text>
                <Text className="text-gray-700 text-base mb-3">
                  {service.ownerName}
                </Text>
              </>
            )}

            <View className="flex-row items-center">
              <Icon name="star" size={20} color="#FFD700" />
              <Text className="text-yellow-600 text-base ml-1 font-medium">
                {service.rating} Rating
              </Text>
            </View>
          </View>
        );

      case 'Reviews':
        return (
          <BusinessRatingSection
            businessId={service.id}
            businessName={service.name}
            onReviewSubmitted={() => {
              // Refresh service data if needed
            }}
          />
        );

      case 'Timings':
        return (
          <View className="px-4 py-4 bg-white">
            <Text className="text-primary-dark font-bold mb-4">
              Operating Hours
            </Text>
            {service.weeklySchedule ? (
              <>
                {/* Current Status */}
                <View
                  className={`flex-row items-center p-4 rounded-lg mb-4 ${
                    businessStatus.status === 'open'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                  <View
                    className={`w-4 h-4 rounded-full mr-3 ${
                      businessStatus.status === 'open'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <View className="flex-1">
                    <Text
                      className={`text-base font-bold ${
                        businessStatus.status === 'open'
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                      {businessStatus.status === 'open'
                        ? 'Currently Open'
                        : 'Currently Closed'}
                    </Text>
                    <Text
                      className={`text-sm ${
                        businessStatus.status === 'open'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                      {businessStatus.message}
                    </Text>
                  </View>
                </View>

                {/* Weekly Schedule */}
                <Text className="text-gray-700 font-semibold mb-3">
                  Weekly Schedule
                </Text>
                <View className="space-y-2">
                  {Object.keys(service.weeklySchedule).map(day => {
                    const daySchedule = service.weeklySchedule[day];
                    const isToday =
                      new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                      }) === day;

                    return (
                      <View
                        key={day}
                        className={`flex-row justify-between items-center p-3 rounded-lg ${
                          isToday
                            ? 'bg-primary-light border border-primary'
                            : 'bg-gray-50'
                        }`}>
                        <View className="flex-row items-center">
                          {isToday && (
                            <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                          )}
                          <Text
                            className={`font-medium ${
                              isToday ? 'text-primary-dark' : 'text-gray-700'
                            }`}>
                            {day}
                            {isToday && (
                              <Text className="text-xs"> (Today)</Text>
                            )}
                          </Text>
                        </View>

                        {daySchedule.isOpen ? (
                          <View className="flex-row items-center">
                            <Icon
                              name="access-time"
                              size={16}
                              color="#8BC34A"
                            />
                            <Text
                              className={`ml-2 text-sm ${
                                isToday
                                  ? 'text-primary-dark font-medium'
                                  : 'text-gray-600'
                              }`}>
                              {/* FIXED: Use standardized formatTime */}
                              {formatTime(daySchedule.openTime)} -{' '}
                              {formatTime(daySchedule.closeTime)}
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center">
                            <Icon name="cancel" size={16} color="#EF4444" />
                            <Text className="ml-2 text-sm text-red-500 font-medium">
                              Closed
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
                {/* Rest of the component remains the same */}
              </>
            ) : (
              <View className="items-center py-8">
                <Icon name="schedule" size={48} color="#9CA3AF" />
                <Text className="text-gray-500 text-base mt-2">
                  Operating hours not specified
                </Text>
              </View>
            )}
          </View>
        );
      case 'Contact':
        return (
          <View className="px-4 py-4 bg-white">
            <Text className="text-primary-dark font-bold mb-4">
              Contact Information
            </Text>

            {service.ownerName && (
              <View className="flex-row items-center mb-4 p-3 bg-gray-50 rounded-lg">
                <Icon name="person" size={24} color="#8BC34A" />
                <View className="ml-3">
                  <Text className="text-gray-500 text-xs">Owner</Text>
                  <Text className="text-gray-700 font-medium">
                    {service.ownerName}
                  </Text>
                </View>
              </View>
            )}

            {service.contactNumber && (
              <TouchableOpacity
                className="flex-row items-center mb-4 p-3 bg-gray-50 rounded-lg"
                onPress={handleCall}>
                <Icon name="phone" size={24} color="#8BC34A" />
                <View className="ml-3 flex-1">
                  <Text className="text-gray-500 text-xs">Phone</Text>
                  <Text className="text-gray-700 font-medium">
                    {service.contactNumber}
                  </Text>
                </View>
                <Icon name="call" size={20} color="#8BC34A" />
              </TouchableOpacity>
            )}

            {service.email && (
              <TouchableOpacity
                className="flex-row items-center mb-4 p-3 bg-gray-50 rounded-lg"
                onPress={handleEmail}>
                <Icon name="email" size={24} color="#8BC34A" />
                <View className="ml-3 flex-1">
                  <Text className="text-gray-500 text-xs">Email</Text>
                  <Text className="text-gray-700 font-medium">
                    {service.email}
                  </Text>
                </View>
                <Icon name="send" size={20} color="#8BC34A" />
              </TouchableOpacity>
            )}

            {/* Contact Actions */}
            <View className="flex-row flex-wrap mt-4 gap-3">
              <TouchableOpacity
                onPress={handleCall}
                className="flex-1 flex-row items-center bg-primary px-4 py-3 rounded-lg justify-center">
                <Icon name="call" size={20} color="#fff" />
                <Text className="ml-2 text-white font-medium">Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleWhatsApp}
                className="flex-1 flex-row items-center bg-green-500 px-4 py-3 rounded-lg justify-center">
                <Icon name="chat" size={20} color="#fff" />
                <Text className="ml-2 text-white font-medium">WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'Address':
        return (
          <View className="px-4 py-4 bg-white">
            <Text className="text-primary-dark font-bold mb-4">
              Location & Address
            </Text>

            {/* Professional Location Card */}
            {service.latitude && service.longitude ? (
              <ProfessionalLocationCard
                latitude={service.latitude}
                longitude={service.longitude}
                businessName={service.name}
                address={service.address}
                distance={service.distance}
                contactNumber={service.contactNumber}
              />
            ) : (
              <View className="w-full bg-gray-50 rounded-xl p-6 items-center justify-center mb-4 border border-gray-200">
                <View className="bg-gray-200 rounded-full p-4 mb-3">
                  <Icon name="location_off" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-gray-500 font-medium">
                  Location not available
                </Text>
                <Text className="text-gray-400 text-sm mt-1">
                  No coordinates provided
                </Text>
              </View>
            )}

            {/* Address Details Card */}
            {service.address && (
              <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                <View className="flex-row items-start">
                  <View className="bg-primary-light rounded-full p-2 mr-3">
                    <Icon name="business" size={20} color="#8BC34A" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-700 font-semibold mb-1">
                      Business Address
                    </Text>
                    <Text className="text-gray-600 leading-5">
                      {service.address.street && `${service.address.street}\n`}
                      {service.address.city}
                      {service.address.pinCode &&
                        `, ${service.address.pinCode}`}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with Enhanced Share Button */}
      <View className="flex-row items-center justify-between bg-primary px-5 py-5 shadow-md">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 rounded-full bg-primary-dark shadow-sm">
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Service Details</Text>
        <TouchableOpacity
          className="p-2 rounded-full bg-primary-dark shadow-sm"
          onPress={handleShare}>
          <Icon name="share" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Image Carousel or Fallback Icon */}
        <View className="relative">
          {hasImages ? (
            <>
              <FlatList
                data={service.images}
                renderItem={renderImageItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={event => {
                  const index = Math.floor(
                    event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                  );
                  setActiveImageIndex(index);
                }}
              />
              {service.images.length > 1 && renderImageIndicators()}
            </>
          ) : (
            renderFallbackIcon()
          )}
        </View>

        {/* Main Info */}
        <View className="px-4 py-3 bg-white">
          <Text className="text-xl font-bold text-gray-700">
            {service.name}
          </Text>
          <View className="flex-row items-center mt-1 space-x-2">
            <Text className="text-gray-400 text-sm">
              {service.address
                ? `${
                    service.address.street ? service.address.street + ', ' : ''
                  }${service.address.city}`
                : 'Address not specified'}
            </Text>
            {service.distance && (
              <>
                <View className="w-px h-4 bg-gray-300" />
                <Text className="bg-primary-light px-2 py-1 rounded-full text-primary-dark font-semibold text-xs">
                  {service.distance.toFixed(1)} km
                </Text>
              </>
            )}
          </View>

          {/* Category and Subcategories */}
          <View className="flex-row items-center mt-2">
            <Text className="text-gray-500 text-sm">{service.category}</Text>
            {service.subCategories && service.subCategories.length > 0 && (
              <Text className="text-gray-400 text-sm ml-2">
                • {service.subCategories.slice(0, 2).join(', ')}
                {service.subCategories.length > 2 &&
                  ` +${service.subCategories.length - 2}`}
              </Text>
            )}
          </View>

          {/* Quick Actions */}
          <View className="flex-row flex-wrap mt-4 gap-3">
            <TouchableOpacity
              onPress={handleCall}
              className="flex-1 flex-row items-center bg-gray-50 px-4 py-3 rounded-lg justify-center">
              <Icon name="call" size={20} color="#8BC34A" />
              <Text className="ml-2 text-gray-700 font-medium">Call</Text>
            </TouchableOpacity>

            {/*<TouchableOpacity
              onPress={handleChat}
              className="flex-1 flex-row items-center bg-gray-50 px-4 py-3 rounded-lg justify-center">
              <Icon name="sms" size={20} color="#8BC34A" />
              <Text className="ml-2 text-gray-700 font-medium">Chat</Text>
            </TouchableOpacity>*/}
            <TouchableOpacity
              onPress={handleWhatsApp}
              className="flex-1 flex-row items-center bg-gray-50 px-4 py-3 rounded-lg justify-center">
              <Icon name="chat" size={20} color="#25D366" />
              <Text className="ml-2 text-gray-700 font-medium">WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDirections}
              className="flex-1 flex-row items-center bg-gray-50 px-4 py-3 rounded-lg justify-center">
              <Icon name="directions" size={20} color="#8BC34A" />
              <Text className="ml-2 text-gray-700 font-medium">Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-gray-200 bg-white">
          {TAB_LIST.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 items-center py-4 ${
                activeTab === tab ? 'border-b-2 border-primary' : ''
              }`}>
              <Text
                className={`font-medium ${
                  activeTab === tab ? 'text-primary' : 'text-gray-400'
                }`}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>
    </View>
  );
};

export default ServiceShowcase;
