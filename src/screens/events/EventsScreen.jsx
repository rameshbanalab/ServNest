import React, {useState, useEffect, useCallback} from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {db} from '../../config/firebaseConfig';
import {collection, getDocs, query, where, orderBy} from 'firebase/firestore';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

export default function EventsScreen() {
  const navigation = useNavigation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [error, setError] = useState(null);

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

  // ✅ Production-safe event fetching
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
          // ✅ Production-safe data validation
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

  // ✅ Production-safe filtering
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents]),
  );

  // ✅ Production-safe date formatting
  const formatDate = useCallback(dateString => {
    try {
      if (!dateString) return {day: 'TBD', month: 'TBD', weekday: 'TBD'};

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return {day: 'TBD', month: 'TBD', weekday: 'TBD'};
      }

      return {
        day: date.getDate(),
        month: date.toLocaleDateString('en-IN', {month: 'short'}),
        weekday: date.toLocaleDateString('en-IN', {weekday: 'short'}),
      };
    } catch (error) {
      console.error('Date format error:', error);
      return {day: 'TBD', month: 'TBD', weekday: 'TBD'};
    }
  }, []);

  // ✅ Production-safe price calculation
  const getMinPrice = useCallback(pricing => {
    try {
      if (!pricing || typeof pricing !== 'object') return 0;

      const prices = Object.values(pricing)
        .map(p => Number(p?.price))
        .filter(price => !isNaN(price) && price > 0);

      return prices.length > 0 ? Math.min(...prices) : 0;
    } catch (error) {
      console.error('Price calculation error:', error);
      return 0;
    }
  }, []);

  // ✅ Production-safe navigation with validation
  const navigateToEventDetails = useCallback(
    event => {
      try {
        if (!event?.id) {
          Alert.alert('Error', 'Invalid event data');
          return;
        }

        // ✅ Validate event object before navigation
        const validatedEvent = {
          id: event.id,
          title: event.title || 'Untitled Event',
          description: event.description || 'No description',
          date: event.date || new Date().toISOString().split('T')[0],
          startTime: event.startTime || '00:00',
          endTime: event.endTime || '23:59',
          location: {
            venue: event.location?.venue || 'Venue TBD',
            address: event.location?.address || 'Address TBD',
          },
          pricing: event.pricing || {},
          eventType: event.eventType || 'paid',
          category: event.category || 'General',
          flyer: event.flyer,
          maxCapacity: event.maxCapacity || 100,
          ageRestriction: event.ageRestriction || 'all',
        };

        navigation.navigate('EventDetails', {event: validatedEvent});
      } catch (error) {
        console.error('Navigation error:', error);
        Alert.alert('Error', 'Unable to open event details');
      }
    },
    [navigation],
  );

  // ✅ Production-safe event card rendering
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
                  onError={error => {
                    console.log('Image load error:', error);
                  }}
                />
              ) : (
                <View className="w-full h-48 bg-primary/10 items-center justify-center">
                  <Icon name="event" size={48} color="#8BC34A" />
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
                  <Icon name="schedule" size={16} color="#8BC34A" />
                  <Text className="text-gray-700 text-sm ml-2">
                    {dateInfo.weekday}, {event.startTime}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Icon name="location-on" size={16} color="#8BC34A" />
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

  // ✅ Loading state
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="mt-4 text-gray-600">Loading events...</Text>
      </View>
    );
  }

  // ✅ Error state
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

  return (
    <View className="flex-1 bg-gray-50">
      {/* ✅ Header with Menu Bar */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row justify-between items-center mb-4">
          {/* Menu Button */}
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            className="p-2 -ml-2">
            <Icon name="menu" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-gray-800 text-2xl font-bold">
            Discover Events
          </Text>

          {/* Notification/Profile Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            className="p-2 -mr-2">
            <Icon name="person" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 mb-4">
          <Icon name="search" size={20} color="#8BC34A" />
          <TextInput
            className="flex-1 text-gray-800 ml-3"
            placeholder="Search events, categories, venues..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="clear" size={20} color="#8BC34A" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-2">
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                className={`px-4 py-2 ml-2 rounded-full border ${
                  selectedCategory === category
                    ? 'bg-primary border-primary'
                    : 'bg-white border-gray-300'
                }`}
                onPress={() => setSelectedCategory(category)}>
                <Text
                  className={`font-medium ${
                    selectedCategory === category
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ✅ Events List with Error Boundary */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventCard}
        keyExtractor={item => item?.id || Math.random().toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8BC34A']}
            tintColor="#8BC34A"
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
        onError={error => {
          console.error('FlatList error:', error);
        }}
      />
    </View>
  );
}
