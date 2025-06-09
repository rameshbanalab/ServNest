import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {db} from '../config/firebaseConfig';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';

export default function EventsScreen() {
  const navigation = useNavigation();
  const [events, setEvents] = useState([]);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);

  // Fetch events
  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Fetch all active events
      const eventsQuery = query(
        collection(db, 'Events'),
        where('status', '==', 'active'),
        orderBy('date', 'asc'),
      );
      const eventsSnapshot = await getDocs(eventsQuery);

      if (!eventsSnapshot.empty) {
        const eventsData = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setEvents(eventsData);
        setFilteredEvents(eventsData);

        // Filter featured events
        const featured = eventsData.filter(event => event.featured);
        setFeaturedEvents(featured);
      } else {
        setEvents([]);
        setFilteredEvents([]);
        setFeaturedEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEvents(events);
    } else {
      const filtered = events.filter(
        event =>
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.location?.venue
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
      setFilteredEvents(filtered);
    }
  }, [searchQuery, events]);

  // Refresh events
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Format date
  const formatDate = dateString => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-IN', {month: 'short'}),
      year: date.getFullYear(),
    };
  };

  // Get minimum price
  const getMinPrice = pricing => {
    const prices = Object.values(pricing || {}).map(p => p.price);
    return Math.min(...prices);
  };

  // Navigate to event details
  const navigateToEventDetails = event => {
    navigation.navigate('EventDetails', {event});
  };

  // Render event card
  const renderEventCard = (event, isFeatured = false) => {
    const dateInfo = formatDate(event.date);
    const minPrice = getMinPrice(event.pricing);

    return (
      <TouchableOpacity
        key={event.id}
        className={`bg-white rounded-2xl shadow-lg overflow-hidden ${
          isFeatured ? 'mx-4 w-80' : 'mb-4 mx-4'
        }`}
        onPress={() => navigateToEventDetails(event)}>
        {/* Event Image/Flyer */}
        <View className="relative">
          {event.flyer ? (
            <Image
              source={{uri: event.flyer}}
              className="w-full h-48"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-48 bg-primary-light items-center justify-center">
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
          {isFeatured && (
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
          <View className="space-y-2 mb-4">
            <View className="flex-row items-center">
              <Icon name="schedule" size={16} color="#8BC34A" />
              <Text className="text-gray-700 text-sm ml-2">
                {event.time} {event.endTime && `- ${event.endTime}`}
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
              <Text className="text-gray-500 text-xs">Starting from</Text>
              <Text className="text-primary font-bold text-lg">
                ₹{minPrice}
              </Text>
            </View>

            <TouchableOpacity
              className="bg-primary rounded-lg px-6 py-2"
              onPress={() => navigateToEventDetails(event)}>
              <Text className="text-white font-bold">Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text className="mt-4 text-gray-600">Loading events...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <Text className="text-gray-800 text-2xl font-bold mb-4">
          Discover Events
        </Text>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
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
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8BC34A']}
            tintColor="#8BC34A"
          />
        }>
        {/* Featured Events */}
        {featuredEvents.length > 0 && searchQuery === '' && (
          <View className="mt-6">
            <Text className="text-gray-700 font-bold text-xl mb-4 px-4">
              Featured Events
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-4 pl-4 pr-8">
                {featuredEvents.map(event => renderEventCard(event, true))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* All Events */}
        <View className="mt-6 mb-6">
          <Text className="text-gray-700 font-bold text-xl mb-4 px-4">
            {searchQuery ? 'Search Results' : 'All Events'}
          </Text>

          {filteredEvents.length > 0 ? (
            <View>{filteredEvents.map(event => renderEventCard(event))}</View>
          ) : (
            <View className="items-center py-12">
              <Icon name="event-busy" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 text-lg font-medium mt-4">
                {searchQuery ? 'No events found' : 'No events available'}
              </Text>
              <Text className="text-gray-400 text-center mt-2 px-8">
                {searchQuery
                  ? 'Try searching with different keywords'
                  : 'Check back later for upcoming events'}
              </Text>
              {searchQuery && (
                <TouchableOpacity
                  className="bg-primary rounded-xl px-6 py-3 mt-4"
                  onPress={() => setSearchQuery('')}>
                  <Text className="text-white font-bold">Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
