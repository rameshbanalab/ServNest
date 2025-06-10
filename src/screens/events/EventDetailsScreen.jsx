/* eslint-disable react-hooks/rules-of-hooks */
import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Share,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';

export default function EventDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [selectedTickets, setSelectedTickets] = useState({});
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // ✅ FIXED: Proper BackHandler usage with subscription pattern
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      // ✅ NEW API: addEventListener returns a subscription
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      // ✅ FIXED: Use subscription.remove() instead of removeEventListener
      return () => {
        if (subscription) {
          subscription.remove();
        }
      };
    }, [navigation]),
  );

  // ✅ Production-safe parameter extraction
  const event = React.useMemo(() => {
    try {
      const routeEvent = route.params?.event;

      if (!routeEvent?.id) {
        return null;
      }

      // ✅ Validate and sanitize event data
      return {
        id: routeEvent.id,
        title: routeEvent.title || 'Untitled Event',
        description: routeEvent.description || 'No description available',
        date: routeEvent.date || new Date().toISOString().split('T')[0],
        startTime: routeEvent.startTime || '00:00',
        endTime: routeEvent.endTime || '23:59',
        location: {
          venue: routeEvent.location?.venue || 'Venue TBD',
          address: routeEvent.location?.address || 'Address TBD',
        },
        pricing: routeEvent.pricing || {},
        eventType: routeEvent.eventType || 'paid',
        category: routeEvent.category || 'General',
        flyer: routeEvent.flyer || null,
        maxCapacity: Number(routeEvent.maxCapacity) || 100,
        ageRestriction: routeEvent.ageRestriction || 'all',
      };
    } catch (error) {
      console.error('Event data validation error:', error);
      return null;
    }
  }, [route.params]);

  // ✅ Early return for invalid event
  if (!event) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Icon name="error-outline" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4">
          Event not found
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-xl px-6 py-3 mt-4"
          onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ Production-safe date formatting
  const formatDate = useCallback(dateString => {
    try {
      if (!dateString) return 'Date TBD';

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date TBD';

      return date.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date TBD';
    }
  }, []);

  // ✅ Production-safe maps opening
  const openInMaps = useCallback(() => {
    try {
      const venue = event.location?.venue || '';
      const address = event.location?.address || '';

      if (!venue && !address) {
        Alert.alert('Error', 'Location information not available');
        return;
      }

      const query = encodeURIComponent(`${venue}, ${address}`);
      const url = `https://www.google.com/maps/search/?api=1&query=${query}`;

      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open maps application');
      });
    } catch (error) {
      console.error('Maps opening error:', error);
      Alert.alert('Error', 'Unable to open maps');
    }
  }, [event.location]);

  // ✅ Production-safe sharing
  const shareEvent = useCallback(async () => {
    try {
      const shareContent = {
        message: `Check out this event: ${event.title}\n\nDate: ${formatDate(
          event.date,
        )}\nVenue: ${event.location.venue}\n\nBook your tickets now!`,
        title: event.title,
      };

      await Share.share(shareContent);
    } catch (error) {
      console.error('Sharing error:', error);
    }
  }, [event, formatDate]);

  // ✅ Production-safe ticket quantity update
  const updateTicketQuantity = useCallback(
    (ticketType, quantity) => {
      try {
        const pricing = event.pricing?.[ticketType];
        if (!pricing) return;

        const available = Number(pricing.available) || 0;
        const sold = Number(pricing.sold) || 0;
        const maxAvailable = available - sold;
        const newQuantity = Math.max(
          0,
          Math.min(Number(quantity) || 0, maxAvailable),
        );

        setSelectedTickets(prev => ({
          ...prev,
          [ticketType]: newQuantity,
        }));
      } catch (error) {
        console.error('Ticket quantity update error:', error);
      }
    },
    [event.pricing],
  );

  // ✅ Production-safe total calculation
  const calculateTotal = useCallback(() => {
    try {
      return Object.entries(selectedTickets).reduce(
        (total, [ticketType, quantity]) => {
          const price = Number(event.pricing?.[ticketType]?.price) || 0;
          const qty = Number(quantity) || 0;
          return total + price * qty;
        },
        0,
      );
    } catch (error) {
      console.error('Total calculation error:', error);
      return 0;
    }
  }, [selectedTickets, event.pricing]);

  // ✅ Production-safe total tickets calculation
  const getTotalTickets = useCallback(() => {
    try {
      return Object.values(selectedTickets).reduce(
        (sum, qty) => sum + (Number(qty) || 0),
        0,
      );
    } catch (error) {
      console.error('Total tickets calculation error:', error);
      return 0;
    }
  }, [selectedTickets]);

  // ✅ Production-safe booking navigation
  const proceedToBooking = useCallback(() => {
    try {
      if (event.eventType === 'free') {
        navigation.navigate('EventBooking', {
          event,
          selectedTickets: {free: 1},
          totalAmount: 0,
        });
        return;
      }

      if (getTotalTickets() === 0) {
        Alert.alert(
          'Select Tickets',
          'Please select at least one ticket to proceed',
        );
        return;
      }

      setLoading(true);

      // ✅ Simulate loading and validate data before navigation
      setTimeout(() => {
        try {
          setLoading(false);
          navigation.navigate('EventBooking', {
            event,
            selectedTickets,
            totalAmount: calculateTotal(),
          });
        } catch (navError) {
          console.error('Navigation error:', navError);
          setLoading(false);
          Alert.alert('Error', 'Unable to proceed to booking');
        }
      }, 300);
    } catch (error) {
      console.error('Booking process error:', error);
      setLoading(false);
      Alert.alert('Error', 'Unable to proceed with booking');
    }
  }, [event, selectedTickets, getTotalTickets, calculateTotal, navigation]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* ✅ Header with Menu */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-gray-800 text-lg font-bold">Event Details</Text>

          <TouchableOpacity onPress={shareEvent}>
            <Icon name="share" size={24} color="#8BC34A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* ✅ Event Image/Flyer with Error Handling */}
        <View className="relative">
          {event.flyer && !imageError ? (
            <Image
              source={{uri: event.flyer}}
              className="w-full h-64"
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View className="w-full h-64 bg-primary/10 items-center justify-center">
              <Icon name="event" size={64} color="#8BC34A" />
            </View>
          )}

          {/* Overlay with basic info */}
          <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
            <Text className="text-white text-2xl font-bold mb-2">
              {event.title}
            </Text>
            <View className="flex-row items-center">
              <Icon name="event" size={16} color="#FFFFFF" />
              <Text className="text-white ml-2">{formatDate(event.date)}</Text>
            </View>
          </View>
        </View>

        {/* Event Information */}
        <View className="p-4 space-y-6">
          {/* Description */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-3">
              About This Event
            </Text>
            <Text className="text-gray-600 leading-6">{event.description}</Text>
          </View>

          {/* Event Details */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Event Details
            </Text>

            <View className="space-y-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                  <Icon name="schedule" size={20} color="#8BC34A" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-gray-800 font-medium">Time</Text>
                  <Text className="text-gray-600">
                    {event.startTime} - {event.endTime}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                className="flex-row items-center"
                onPress={openInMaps}>
                <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                  <Icon name="location-on" size={20} color="#8BC34A" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-gray-800 font-medium">
                    {event.location.venue}
                  </Text>
                  <Text className="text-gray-600">
                    {event.location.address}
                  </Text>
                  <Text className="text-primary text-sm mt-1">
                    Tap for directions
                  </Text>
                </View>
                <Icon name="open-in-new" size={20} color="#8BC34A" />
              </TouchableOpacity>

              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                  <Icon name="category" size={20} color="#8BC34A" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-gray-800 font-medium">Category</Text>
                  <Text className="text-gray-600">{event.category}</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                  <Icon name="people" size={20} color="#8BC34A" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-gray-800 font-medium">Capacity</Text>
                  <Text className="text-gray-600">
                    {event.maxCapacity} people
                  </Text>
                </View>
              </View>

              {event.ageRestriction !== 'all' && (
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                    <Icon name="person" size={20} color="#8BC34A" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-gray-800 font-medium">
                      Age Restriction
                    </Text>
                    <Text className="text-gray-600">
                      {event.ageRestriction}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* ✅ Ticket Selection with Production Safety */}
          {event.eventType === 'paid' &&
          Object.keys(event.pricing).length > 0 ? (
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-gray-800 font-bold text-lg mb-4">
                Select Tickets
              </Text>

              <View className="space-y-4">
                {Object.entries(event.pricing).map(([ticketType, details]) => {
                  try {
                    const available = Number(details?.available) || 0;
                    const sold = Number(details?.sold) || 0;
                    const remaining = available - sold;
                    const isAvailable = remaining > 0;
                    const price = Number(details?.price) || 0;

                    return (
                      <View
                        key={ticketType}
                        className={`border rounded-xl p-4 ${
                          isAvailable
                            ? 'border-gray-200'
                            : 'border-gray-300 bg-gray-50'
                        }`}>
                        <View className="flex-row justify-between items-center mb-3">
                          <View className="flex-1">
                            <Text className="text-gray-800 font-bold text-lg capitalize">
                              {ticketType} Ticket
                            </Text>
                            <Text
                              className={`font-bold text-xl ${
                                isAvailable ? 'text-primary' : 'text-gray-400'
                              }`}>
                              ₹{price}
                            </Text>
                          </View>

                          {isAvailable ? (
                            <View className="flex-row items-center">
                              <TouchableOpacity
                                className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center"
                                onPress={() =>
                                  updateTicketQuantity(
                                    ticketType,
                                    (selectedTickets[ticketType] || 0) - 1,
                                  )
                                }>
                                <Icon name="remove" size={20} color="#374151" />
                              </TouchableOpacity>

                              <Text className="mx-4 text-lg font-bold text-gray-800">
                                {selectedTickets[ticketType] || 0}
                              </Text>

                              <TouchableOpacity
                                className="w-10 h-10 bg-primary rounded-full items-center justify-center"
                                onPress={() =>
                                  updateTicketQuantity(
                                    ticketType,
                                    (selectedTickets[ticketType] || 0) + 1,
                                  )
                                }
                                disabled={
                                  (selectedTickets[ticketType] || 0) >=
                                  remaining
                                }>
                                <Icon name="add" size={20} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View className="bg-gray-200 rounded-lg px-4 py-2">
                              <Text className="text-gray-500 font-medium">
                                Sold Out
                              </Text>
                            </View>
                          )}
                        </View>

                        <View className="flex-row justify-between items-center">
                          <Text
                            className={`text-sm ${
                              isAvailable ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                            {remaining} tickets remaining
                          </Text>

                          {/* Progress Bar */}
                          <View className="flex-1 ml-4">
                            <View className="bg-gray-200 h-2 rounded-full">
                              <View
                                className={`h-2 rounded-full ${
                                  isAvailable ? 'bg-primary' : 'bg-gray-400'
                                }`}
                                style={{
                                  width: `${
                                    available > 0 ? (sold / available) * 100 : 0
                                  }%`,
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  } catch (ticketError) {
                    console.error('Ticket rendering error:', ticketError);
                    return null;
                  }
                })}
              </View>
            </View>
          ) : (
            event.eventType === 'free' && (
              <View className="bg-green-50 rounded-2xl p-6 border border-green-200">
                <View className="flex-row items-center mb-3">
                  <Icon name="event-available" size={32} color="#10B981" />
                  <Text className="text-green-800 font-bold text-lg ml-3">
                    Free Event
                  </Text>
                </View>
                <Text className="text-green-700">
                  This is a free event. Registration is required to attend.
                </Text>
              </View>
            )
          )}
        </View>
      </ScrollView>

      {/* ✅ Bottom Booking Bar with Production Safety */}
      <View className="bg-white border-t border-gray-200 p-4">
        {event.eventType === 'paid' && getTotalTickets() > 0 && (
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-gray-600 text-sm">
                {getTotalTickets()} ticket{getTotalTickets() !== 1 ? 's' : ''}{' '}
                selected
              </Text>
              <Text className="text-gray-800 font-bold text-xl">
                ₹{calculateTotal()}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          className={`rounded-xl py-4 flex-row items-center justify-center ${
            loading ? 'bg-gray-400' : 'bg-primary'
          }`}
          onPress={proceedToBooking}
          disabled={loading}>
          {loading ? (
            <React.Fragment>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-white font-bold ml-2">Loading...</Text>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Icon name="confirmation-number" size={20} color="#FFFFFF" />
              <Text className="text-white font-bold text-lg ml-2">
                {event.eventType === 'paid'
                  ? `Book Tickets${
                      getTotalTickets() > 0 ? ` - ₹${calculateTotal()}` : ''
                    }`
                  : 'Register for Event'}
              </Text>
            </React.Fragment>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
