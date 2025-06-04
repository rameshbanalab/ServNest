import React, {useState} from 'react';
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
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  generateOperatingHoursDisplay,
  getBusinessStatus,
} from '../utils/businessHours';
import Clipboard from '@react-native-clipboard/clipboard';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.4;
const TAB_LIST = ['About', 'Timings', 'Contact', 'Address'];

// Enhanced Professional Location Card with Uber Integration
const ProfessionalLocationCard = ({
  latitude,
  longitude,
  businessName,
  address,
  distance,
  contactNumber,
}) => {
  const handleOpenGoogleMaps = () => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(googleMapsUrl).catch(err =>
      console.error('Error opening Google Maps:', err),
    );
  };

  const handleGetDirections = () => {
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&dir_action=navigate`;
    Linking.openURL(directionsUrl).catch(err =>
      console.error('Error opening Google Maps directions:', err),
    );
  };
  const handleCopyCoordinates = () => {
    const coordinates = `${latitude}, ${longitude}`;
    Clipboard.setString(coordinates);
  };

  const handleRapidoBooking = () => {
    const rapidoUrl = `rapido://book?pickup_lat=${latitude}&pickup_lng=${longitude}`;
    Linking.canOpenURL(rapidoUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(rapidoUrl);
        } else {
          const rapidoWebUrl = `https://play.google.com/store/apps/details?id=com.rapido.passenger`;
          Linking.openURL(rapidoWebUrl).catch(() =>
            Alert.alert(
              'Rapido not available',
              'Rapido app is not installed. Would you like to download it?',
            ),
          );
        }
      })
      .catch(err => console.error('Error opening Rapido:', err));
  };

  const handleUberBooking = () => {
    const uberUrl = `uber://?action=setPickup&pickup=my_location&dropoff[latitude]=${latitude}&dropoff[longitude]=${longitude}&dropoff[nickname]=${encodeURIComponent(
      businessName,
    )}`;

    Linking.canOpenURL(uberUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(uberUrl);
        } else {
          const uberWebUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${latitude}&dropoff[longitude]=${longitude}`;
          Linking.openURL(uberWebUrl).catch(() =>
            Alert.alert(
              'Uber not available',
              'Uber app is not installed. Would you like to visit Uber website?',
            ),
          );
        }
      })
      .catch(err => console.error('Error opening Uber:', err));
  };

  return (
    <View className="w-full bg-white rounded-2xl shadow-lg border border-gray-100 mb-4 overflow-hidden">
      {/* Header Section with Map Icon */}
      <View className="bg-primary px-6 py-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <View className="flex-row items-center mb-2">
              <View className="w-2 h-2 bg-yellow-400 rounded-full mr-2" />
              <Text className="text-blue-100 text-sm font-medium">
                Business Location
              </Text>
            </View>
            <Text
              className="text-white font-bold text-lg leading-tight"
              numberOfLines={2}>
              {businessName}
            </Text>
            <Text className="text-blue-100 text-sm mt-1">
              Tap to open in Google Maps
            </Text>
          </View>

          {/* Enhanced Map Icon */}
          <View className="relative">
            <View className="bg-white bg-opacity-20 rounded-xl p-3">
              <View className="bg-white rounded-lg p-3 shadow-sm">
                <Icon name="map" size={24} color="#8BC34A" />
              </View>
            </View>
            <View className="absolute -top-1 -right-1 bg-green-400 rounded-full w-3 h-3 border-2 border-white" />
          </View>
        </View>
      </View>

      {/* Content Section */}
      <View className="p-6">
        {/* Coordinates Section */}
        <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
                GPS Coordinates
              </Text>
              <Text className="text-gray-900 font-mono text-sm font-medium">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCopyCoordinates}
              className="bg-blue-50 rounded-lg p-2 border border-blue-200">
              <Icon name="content-copy" size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>

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

        {/* Primary Action Button */}
        <TouchableOpacity
          className="bg-primary rounded-xl p-4 items-center mb-4 shadow-sm active:bg-blue-600"
          onPress={handleOpenGoogleMaps}>
          <View className="flex-row items-center">
            <View className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
              <Icon name="map" size={20} color="#8BC34A" />
            </View>
            <Text className="text-white font-bold text-base">
              Open in Google Maps
            </Text>
          </View>
        </TouchableOpacity>

        {/* Enhanced Secondary Actions Grid with Uber */}
        <View className="flex-row space-x-2 mb-3">
          <TouchableOpacity
            className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-3 items-center active:bg-blue-100"
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

        {/* Ride Booking Options */}
        <View className="flex-row space-x-2">
          <TouchableOpacity
            className="flex-1 bg-orange-50 border border-orange-200 rounded-xl p-3 items-center active:bg-orange-100"
            onPress={handleRapidoBooking}>
            <Icon name="motorcycle" size={18} color="#F97316" />
            <Text className="text-orange-700 text-xs mt-1 font-semibold">
              Rapido
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-gray-50 border border-gray-300 rounded-xl p-3 items-center active:bg-gray-100"
            onPress={handleUberBooking}>
            <Icon name="motorcycle" size={18} color="#000" />
            <Text className="text-gray-700 text-xs mt-1 font-semibold">
              Uber
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Enhanced Image Component with Fallback
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

      // Create Google Maps link
      const googleMapsLink =
        service.latitude && service.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              service.name,
            )}`;

      // Create comprehensive share content with Google Maps link and phone number
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
        console.log('Service shared successfully');
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
                              {daySchedule.openTime.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}{' '}
                              -{' '}
                              {daySchedule.closeTime.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
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

                {/* Additional Info */}
                <View className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <View className="flex-row items-center">
                    <Icon name="info" size={16} color="#3B82F6" />
                    <Text className="ml-2 text-blue-700 text-sm font-medium">
                      Business Hours Information
                    </Text>
                  </View>
                  <Text className="text-blue-600 text-sm mt-1">
                    Hours may vary on holidays. Please call ahead to confirm
                    availability.
                  </Text>
                </View>
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
                    <Icon name="home" size={20} color="#8BC34A" />
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
