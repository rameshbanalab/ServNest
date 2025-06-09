import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {db} from '../../config/firebaseConfig';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import CreateEventModal from './CreateEventModal';
import EditEventModal from './EditEventModal';
import {useNavigation} from '@react-navigation/native';

export default function AdminEventManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const navigation = useNavigation();
  // Fetch all events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const eventsQuery = query(
        collection(db, 'Events'),
        orderBy('createdAt', 'desc'),
      );
      const eventsSnapshot = await getDocs(eventsQuery);

      if (!eventsSnapshot.empty) {
        const eventsData = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date,
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }));
        setEvents(eventsData);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  // Delete event
  const deleteEvent = async eventId => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'Events', eventId));
              Alert.alert('Success', 'Event deleted successfully');
              fetchEvents();
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ],
    );
  };

  // Edit event
  const editEvent = event => {
    setSelectedEvent(event);
    setEditModalVisible(true);
  };

  // Refresh events
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Format date for display
  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get status color
  const getStatusColor = status => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      case 'completed':
        return '#6B7280';
      case 'draft':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  // Render event card
  const renderEventCard = event => (
    <View
      key={event.id}
      className="bg-white rounded-2xl shadow-lg mb-4 mx-4 overflow-hidden">
      {/* Event Header */}
      <View className="p-4 border-b border-gray-100">
        <View className="flex-row justify-between items-start mb-2">
          <Text
            className="text-lg font-bold text-gray-800 flex-1 mr-2"
            numberOfLines={2}>
            {event.title}
          </Text>
          <View
            className="px-3 py-1 rounded-full"
            style={{backgroundColor: getStatusColor(event.status) + '20'}}>
            <Text
              className="text-xs font-medium capitalize"
              style={{color: getStatusColor(event.status)}}>
              {event.status}
            </Text>
          </View>
        </View>

        <Text className="text-gray-600 text-sm mb-3" numberOfLines={2}>
          {event.description}
        </Text>

        {/* Event Details */}
        <View className="space-y-2">
          <View className="flex-row items-center">
            <Icon name="event" size={16} color="#8BC34A" />
            <Text className="text-gray-700 text-sm ml-2">
              {formatDate(event.date)} at {event.time}
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

          <View className="flex-row items-center">
            <Icon name="people" size={16} color="#8BC34A" />
            <Text className="text-gray-700 text-sm ml-2">
              Capacity: {event.maxCapacity}
            </Text>
          </View>
        </View>
      </View>

      {/* Pricing Summary */}
      <View className="px-4 py-3 bg-gray-50">
        <Text className="text-gray-700 font-medium text-sm mb-2">
          Ticket Pricing:
        </Text>
        <View className="flex-row flex-wrap">
          {Object.entries(event.pricing || {}).map(([type, details]) => (
            <View key={type} className="mr-4 mb-1">
              <Text className="text-xs text-gray-600 capitalize">
                {type}: ₹{details.price} ({details.sold}/{details.available})
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row p-4 space-x-3">
        <TouchableOpacity
          className="bg-primary rounded-lg px-4 py-2 flex-1"
          onPress={() => editEvent(event)}>
          <Text className="text-white font-bold text-center">Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-red-500 rounded-lg px-4 py-2 flex-1"
          onPress={() => deleteEvent(event.id)}>
          <Text className="text-white font-bold text-center">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
      <View className="flex-row items-center bg-primary px-4 py-3 shadow-md">
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg ml-4">Manage Events</Text>
      </View>
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-gray-800 text-2xl font-bold">
              Event Management
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              {events.length} event{events.length !== 1 ? 's' : ''} total
            </Text>
          </View>

          <TouchableOpacity
            className="bg-primary rounded-xl px-4 py-3 flex-row items-center"
            onPress={() => setCreateModalVisible(true)}>
            <Icon name="add" size={20} color="#FFFFFF" />
            <Text className="text-white font-bold ml-1">Create Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Events List */}
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
        {events.length > 0 ? (
          <View className="py-4">{events.map(renderEventCard)}</View>
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Icon name="event-note" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              No Events Created
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              Create your first event to get started with event management
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-xl px-6 py-3 mt-6"
              onPress={() => setCreateModalVisible(true)}>
              <Text className="text-white font-bold">Create First Event</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create Event Modal */}
      <CreateEventModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onEventCreated={() => {
          setCreateModalVisible(false);
          fetchEvents();
        }}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        visible={editModalVisible}
        event={selectedEvent}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedEvent(null);
        }}
        onEventUpdated={() => {
          setEditModalVisible(false);
          setSelectedEvent(null);
          fetchEvents();
        }}
      />
    </View>
  );
}
