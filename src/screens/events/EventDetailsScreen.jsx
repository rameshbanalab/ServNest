import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';

export default function EventDetailsScreen({route}) {
  const {event} = route.params;
  const navigation = useNavigation();
  const [selectedTickets, setSelectedTickets] = useState({});

  // Format date
  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Open in Google Maps
  const openInMaps = () => {
    const {venue, address} = event.location;
    const query = encodeURIComponent(`${venue}, ${address}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open maps');
    });
  };

  // Share event
  const shareEvent = async () => {
    try {
      await Share.share({
        message: `Check out this event: ${event.title}\n\nDate: ${formatDate(
          event.date,
        )}\nVenue: ${event.location.venue}\n\nBook your tickets now!`,
        title: event.title,
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  // Update ticket quantity
  const updateTicketQuantity = (ticketType, quantity) => {
    const maxAvailable =
      event.pricing[ticketType]?.available - event.pricing[ticketType]?.sold;
    setSelectedTickets({
      ...selectedTickets,
      [ticketType]: Math.max(0, Math.min(quantity, maxAvailable)),
    });
  };

  // Calculate total amount
  const calculateTotal = () => {
    return Object.entries(selectedTickets).reduce(
      (total, [ticketType, quantity]) => {
        const ticketPrice = event.pricing[ticketType]?.price || 0;
        return total + ticketPrice * quantity;
      },
      0,
    );
  };

  // Get total selected tickets
  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  // Navigate to booking
  const proceedToBooking = () => {
    if (getTotalTickets() === 0) {
      Alert.alert(
        'Select Tickets',
        'Please select at least one ticket to proceed',
      );
      return;
    }

    navigation.navigate('EventBooking', {
      event,
      selectedTickets,
      totalAmount: calculateTotal(),
    });
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
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
        {/* Event Image/Flyer */}
        <View className="relative">
          {event.flyer ? (
            <Image
              source={{uri: event.flyer}}
              className="w-full h-64"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-64 bg-primary-light items-center justify-center">
              <Icon name="event" size={64} color="#8BC34A" />
            </View>
          )}

          {/* Overlay with basic info */}
          <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4">
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
                <View className="w-10 h-10 bg-primary-light rounded-full items-center justify-center">
                  <Icon name="schedule" size={20} color="#8BC34A" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-gray-800 font-medium">Time</Text>
                  <Text className="text-gray-600">
                    {event.time} {event.endTime && `- ${event.endTime}`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                className="flex-row items-center"
                onPress={openInMaps}>
                <View className="w-10 h-10 bg-primary-light rounded-full items-center justify-center">
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
                <View className="w-10 h-10 bg-primary-light rounded-full items-center justify-center">
                  <Icon name="category" size={20} color="#8BC34A" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-gray-800 font-medium">Category</Text>
                  <Text className="text-gray-600">{event.category}</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary-light rounded-full items-center justify-center">
                  <Icon name="people" size={20} color="#8BC34A" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-gray-800 font-medium">Capacity</Text>
                  <Text className="text-gray-600">
                    {event.maxCapacity} people
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Ticket Selection */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-800 font-bold text-lg mb-4">
              Select Tickets
            </Text>

            <View className="space-y-4">
              {Object.entries(event.pricing || {}).map(
                ([ticketType, details]) => {
                  const available = details.available - details.sold;
                  const isAvailable = available > 0;

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
                            ₹{details.price}
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
                                selectedTickets[ticketType] >= available
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
                          {available} tickets remaining
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
                                  (details.sold / details.available) * 100
                                }%`,
                              }}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                },
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Booking Bar */}
      {getTotalTickets() > 0 && (
        <View className="bg-white border-t border-gray-200 p-4">
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

            <TouchableOpacity
              className="bg-primary rounded-xl px-8 py-4"
              onPress={proceedToBooking}>
              <Text className="text-white font-bold text-lg">Book Tickets</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
