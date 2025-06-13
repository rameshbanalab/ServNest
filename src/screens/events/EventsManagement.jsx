import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
  FlatList,
  Alert,
  Dimensions,
  Share,
  Linking,
  BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {db} from '../../config/firebaseConfig';
import {collection, getDocs, query, where, orderBy} from 'firebase/firestore';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

export default function EventsManagement() {
  const navigation = useNavigation();

  // State management
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'details'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTickets, setSelectedTickets] = useState({});

  // Events list states
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [error, setError] = useState(null);

  // Details states
  const [imageError, setImageError] = useState(false);

  const categories = [
    'All',
    'Music',
    'Sports',
    'Technology',
    'Business',
    'Education',
    'Health',
    'Food',
    'Art',
    'Entertainment',
    'Community',
  ];

  // Back handler for details view
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (currentView === 'details') {
          setCurrentView('list');
          setSelectedEvent(null);
          setSelectedTickets({});
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription?.remove();
    }, [currentView]),
  );

  // Fetch events with production safety
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const eventsQuery = query(
        collection(db, 'Events'),
        where('status', '==', 'active'),
        orderBy('date', 'asc'),
      );

      const eventsSnapshot = await getDocs(eventsQuery);

      if (!eventsSnapshot.empty) {
        const eventsData = eventsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data?.title || 'Untitled Event',
            description: data?.description || 'No description available',
            date: data?.date || new Date().toISOString().split('T')[0],
            startTime: data?.startTime || '00:00',
            endTime: data?.endTime || '23:59',
            location: {
              venue: data?.location?.venue || 'Venue TBD',
              address: data?.location?.address || 'Address TBD',
              coordinates: data?.location?.coordinates || {
                latitude: 0,
                longitude: 0,
              },
            },
            pricing: data?.pricing || {},
            category: data?.category || 'General',
            eventType: data?.eventType || 'paid',
            flyer: data?.flyer || null,
            featured: Boolean(data?.featured),
            maxCapacity: Number(data?.maxCapacity) || 100,
            ageRestriction: data?.ageRestriction || 'all',
            status: data?.status || 'active',
          };
        });

        setEvents(eventsData);
        setFilteredEvents(eventsData);
      } else {
        setEvents([]);
        setFilteredEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter events
  useEffect(() => {
    try {
      let filtered = [...events];

      if (selectedCategory !== 'All') {
        filtered = filtered.filter(
          event => event?.category === selectedCategory,
        );
      }

      if (searchQuery?.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          event =>
            event?.title?.toLowerCase().includes(query) ||
            event?.category?.toLowerCase().includes(query) ||
            event?.location?.venue?.toLowerCase().includes(query),
        );
      }

      setFilteredEvents(filtered);
    } catch (error) {
      console.error('Filter error:', error);
      setFilteredEvents(events);
    }
  }, [searchQuery, events, selectedCategory]);

  // Utility functions
  const formatDate = useCallback(dateString => {
    try {
      if (!dateString) return {day: 'TBD', month: 'TBD', weekday: 'TBD'};
      const date = new Date(dateString);
      if (isNaN(date.getTime()))
        return {day: 'TBD', month: 'TBD', weekday: 'TBD'};

      return {
        day: date.getDate(),
        month: date.toLocaleDateString('en-IN', {month: 'short'}),
        weekday: date.toLocaleDateString('en-IN', {weekday: 'short'}),
        full: date.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      };
    } catch (error) {
      return {day: 'TBD', month: 'TBD', weekday: 'TBD', full: 'Date TBD'};
    }
  }, []);

  const getMinPrice = useCallback(pricing => {
    try {
      if (!pricing || typeof pricing !== 'object') return 0;
      const prices = Object.values(pricing)
        .map(p => Number(p?.price))
        .filter(price => !isNaN(price) && price > 0);
      return prices.length > 0 ? Math.min(...prices) : 0;
    } catch (error) {
      return 0;
    }
  }, []);

  // Navigation functions
  const navigateToEventDetails = useCallback(event => {
    try {
      if (!event?.id) {
        Alert.alert('Error', 'Invalid event data');
        return;
      }
      setSelectedEvent(event);
      setCurrentView('details');
      setImageError(false);
      setSelectedTickets({});
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to open event details');
    }
  }, []);

  const shareEvent = useCallback(async () => {
    try {
      if (!selectedEvent) return;
      const shareContent = {
        message: `Check out this event: ${selectedEvent.title}\n\nDate: ${
          formatDate(selectedEvent.date).full
        }\nVenue: ${selectedEvent.location.venue}\n\nBook your tickets now!`,
        title: selectedEvent.title,
      };
      await Share.share(shareContent);
    } catch (error) {
      console.error('Sharing error:', error);
    }
  }, [selectedEvent, formatDate]);

  const openInMaps = useCallback(() => {
    try {
      if (!selectedEvent) return;
      const venue = selectedEvent.location?.venue || '';
      const address = selectedEvent.location?.address || '';

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
  }, [selectedEvent]);

  // Ticket management
  const updateTicketQuantity = useCallback(
    (ticketType, quantity) => {
      try {
        if (!selectedEvent) return;
        const pricing = selectedEvent.pricing?.[ticketType];
        if (!pricing) return;

        const available = Number(pricing.available) || 0;
        const sold = Number(pricing.sold) || 0;
        const maxAvailable = available - sold;
        const newQuantity = Math.max(
          0,
          Math.min(Number(quantity) || 0, maxAvailable),
        );

        setSelectedTickets(prev => ({...prev, [ticketType]: newQuantity}));
      } catch (error) {
        console.error('Ticket quantity update error:', error);
      }
    },
    [selectedEvent],
  );

  const calculateTotal = useCallback(() => {
    try {
      if (!selectedEvent) return 0;
      return Object.entries(selectedTickets).reduce(
        (total, [ticketType, quantity]) => {
          const price = Number(selectedEvent.pricing?.[ticketType]?.price) || 0;
          const qty = Number(quantity) || 0;
          return total + price * qty;
        },
        0,
      );
    } catch (error) {
      return 0;
    }
  }, [selectedTickets, selectedEvent]);

  const getTotalTickets = useCallback(() => {
    try {
      return Object.values(selectedTickets).reduce(
        (sum, qty) => sum + (Number(qty) || 0),
        0,
      );
    } catch (error) {
      return 0;
    }
  }, [selectedTickets]);

  const proceedToBooking = useCallback(() => {
    try {
      if (!selectedEvent) return;

      if (selectedEvent.eventType === 'free') {
        navigation.navigate('EventBookingFlow', {
          event: selectedEvent,
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

      navigation.navigate('EventBookingFlow', {
        event: selectedEvent,
        selectedTickets,
        totalAmount: calculateTotal(),
      });
    } catch (error) {
      console.error('Booking process error:', error);
      Alert.alert('Error', 'Unable to proceed with booking');
    }
  }, [
    selectedEvent,
    selectedTickets,
    getTotalTickets,
    calculateTotal,
    navigation,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);

  // Initialize
  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents]),
  );

  // Render functions
  const renderEventCard = useCallback(
    ({item: event}) => {
      try {
        if (!event?.id) return null;
        const dateInfo = formatDate(event.date);
        const minPrice = getMinPrice(event.pricing);

        return (
          <TouchableOpacity
            className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4 mx-4"
            onPress={() => navigateToEventDetails(event)}
            activeOpacity={0.8}>
            {/* Event Image/Flyer */}
            <View className="relative">
              {event.flyer ? (
                <Image
                  source={{uri: event.flyer}}
                  className="w-full h-48"
                  resizeMode="cover"
                  onError={() => console.log('Image load error')}
                />
              ) : (
                <View className="w-full h-48 bg-primary/10 items-center justify-center">
                  <Icon name="event" size={48} color="#FF4500" />
                </View>
              )}

              {/* Date Badge */}
              <View className="absolute top-3 left-3 bg-white rounded-xl p-3 items-center shadow-md">
                <Text className="text-primary font-bold text-lg">
                  {dateInfo.day}
                </Text>
                <Text className="text-gray-600 text-xs font-medium">
                  {dateInfo.month}
                </Text>
              </View>

              {/* Category Badge */}
              <View className="absolute top-3 right-3 bg-primary rounded-full px-3 py-1">
                <Text className="text-white text-xs font-medium">
                  {event.category}
                </Text>
              </View>

              {/* Featured Badge */}
              {event.featured && (
                <View className="absolute bottom-3 left-3 bg-yellow-500 rounded-full px-3 py-1">
                  <Text className="text-white text-xs font-bold">FEATURED</Text>
                </View>
              )}
            </View>

            {/* Event Details */}
            <View className="p-4">
              <Text
                className="text-lg font-bold text-gray-800 mb-2"
                numberOfLines={2}>
                {event.title}
              </Text>

              <Text className="text-gray-600 text-sm mb-3" numberOfLines={2}>
                {event.description}
              </Text>

              {/* Event Info */}
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Icon name="schedule" size={16} color="#FF4500" />
                  <Text className="text-gray-700 text-sm ml-2">
                    {dateInfo.weekday}, {event.startTime}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Icon name="location-on" size={16} color="#FF4500" />
                  <Text
                    className="text-gray-700 text-sm ml-2 flex-1"
                    numberOfLines={1}>
                    {event.location?.venue}
                  </Text>
                </View>
              </View>

              {/* Price & Book Button */}
              <View className="flex-row justify-between items-center">
                <View>
                  {event.eventType === 'paid' && minPrice > 0 ? (
                    <View>
                      <Text className="text-gray-500 text-xs">
                        Starting from
                      </Text>
                      <Text className="text-primary font-bold text-lg">
                        ₹{minPrice}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-green-600 font-bold text-lg">
                      FREE
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  className="bg-primary rounded-lg px-6 py-2"
                  onPress={() => navigateToEventDetails(event)}>
                  <Text className="text-white font-bold">
                    {event.eventType === 'paid' ? 'Book Now' : 'Register'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        );
      } catch (error) {
        console.error('Render error for event:', event?.id, error);
        return null;
      }
    },
    [formatDate, getMinPrice, navigateToEventDetails],
  );

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF4500" />
        <Text className="mt-4 text-gray-600">Loading events...</Text>
      </View>
    );
  }

  // Error state
  if (error && events.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 px-4">
        <Icon name="error-outline" size={64} color="#EF4444" />
        <Text className="text-gray-500 text-lg font-medium mt-4 text-center">
          {error}
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-xl px-6 py-3 mt-4"
          onPress={fetchEvents}>
          <Text className="text-white font-bold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render based on current view
  if (currentView === 'details' && selectedEvent) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Details Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-100">
          <View className="flex-row justify-between items-center">
            <TouchableOpacity onPress={() => setCurrentView('list')}>
              <Icon name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-gray-800 text-lg font-bold">
              Event Details
            </Text>
            <TouchableOpacity onPress={shareEvent}>
              <Icon name="share" size={24} color="#FF4500" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Event Image/Flyer */}
          <View className="relative">
            {selectedEvent.flyer && !imageError ? (
              <Image
                source={{uri: selectedEvent.flyer}}
                className="w-full h-64"
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View className="w-full h-64 bg-primary/10 items-center justify-center">
                <Icon name="event" size={64} color="#FF4500" />
              </View>
            )}

            {/* Overlay with basic info */}
            <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
              <Text className="text-white text-2xl font-bold mb-2">
                {selectedEvent.title}
              </Text>
              <View className="flex-row items-center">
                <Icon name="event" size={16} color="#FFFFFF" />
                <Text className="text-white ml-2">
                  {formatDate(selectedEvent.date).full}
                </Text>
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
              <Text className="text-gray-600 leading-6">
                {selectedEvent.description}
              </Text>
            </View>

            {/* Event Details */}
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-gray-800 font-bold text-lg mb-4">
                Event Details
              </Text>

              <View className="space-y-4">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                    <Icon name="schedule" size={20} color="#FF4500" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-gray-800 font-medium">Time</Text>
                    <Text className="text-gray-600">
                      {selectedEvent.startTime} - {selectedEvent.endTime}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={openInMaps}>
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                    <Icon name="location-on" size={20} color="#FF4500" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-gray-800 font-medium">
                      {selectedEvent.location.venue}
                    </Text>
                    <Text className="text-gray-600">
                      {selectedEvent.location.address}
                    </Text>
                    <Text className="text-primary text-sm mt-1">
                      Tap for directions
                    </Text>
                  </View>
                  <Icon name="open-in-new" size={20} color="#FF4500" />
                </TouchableOpacity>

                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                    <Icon name="category" size={20} color="#FF4500" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-gray-800 font-medium">Category</Text>
                    <Text className="text-gray-600">
                      {selectedEvent.category}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                    <Icon name="people" size={20} color="#FF4500" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-gray-800 font-medium">Capacity</Text>
                    <Text className="text-gray-600">
                      {selectedEvent.maxCapacity} people
                    </Text>
                  </View>
                </View>

                {selectedEvent.ageRestriction !== 'all' && (
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                      <Icon name="person" size={20} color="#FF4500" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-gray-800 font-medium">
                        Age Restriction
                      </Text>
                      <Text className="text-gray-600">
                        {selectedEvent.ageRestriction}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Ticket Selection */}
            {selectedEvent.eventType === 'paid' &&
            Object.keys(selectedEvent.pricing).length > 0 ? (
              <View className="bg-white rounded-2xl p-4 shadow-sm">
                <Text className="text-gray-800 font-bold text-lg mb-4">
                  Select Tickets
                </Text>

                <View className="space-y-4">
                  {Object.entries(selectedEvent.pricing).map(
                    ([ticketType, details]) => {
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
                                    isAvailable
                                      ? 'text-primary'
                                      : 'text-gray-400'
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
                                    <Icon
                                      name="remove"
                                      size={20}
                                      color="#374151"
                                    />
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
                                    <Icon
                                      name="add"
                                      size={20}
                                      color="#FFFFFF"
                                    />
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
                                  isAvailable
                                    ? 'text-gray-600'
                                    : 'text-gray-400'
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
                                        available > 0
                                          ? (sold / available) * 100
                                          : 0
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
                    },
                  )}
                </View>
              </View>
            ) : (
              selectedEvent.eventType === 'free' && (
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

        {/* Bottom Booking Bar */}
        <View className="bg-white border-t border-gray-200 p-4">
          {selectedEvent.eventType === 'paid' && getTotalTickets() > 0 && (
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
            className="bg-primary rounded-xl py-4 flex-row items-center justify-center"
            onPress={proceedToBooking}>
            <Icon name="confirmation-number" size={20} color="#FFFFFF" />
            <Text className="text-white font-bold text-lg ml-2">
              {selectedEvent.eventType === 'paid'
                ? `Book Tickets${
                    getTotalTickets() > 0 ? ` - ₹${calculateTotal()}` : ''
                  }`
                : 'Register for Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Events List View
  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            className="p-2 -ml-2">
            <Icon name="menu" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-gray-800 text-2xl font-bold">
            Discover Events
          </Text>

          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.navigate('MyEventBookings')}
              className="p-2 mr-2">
              <Icon name="confirmation-number" size={24} color="#FF4500" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              className="p-2 -mr-2">
              <Icon name="person" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventCard}
        keyExtractor={item => item?.id || Math.random().toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF4500']}
            tintColor="#FF4500"
          />
        }
        contentContainerStyle={{paddingVertical: 16}}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Icon name="event-busy" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              {searchQuery || selectedCategory !== 'All'
                ? 'No events found'
                : 'No events available'}
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search or filters'
                : 'Check back later for upcoming events'}
            </Text>
            {(searchQuery || selectedCategory !== 'All') && (
              <TouchableOpacity
                className="bg-primary rounded-xl px-6 py-3 mt-4"
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}>
                <Text className="text-white font-bold">Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={5}
        windowSize={10}
      />
    </View>
  );
}
