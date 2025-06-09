import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {launchImageLibrary} from 'react-native-image-picker';
import {db} from '../../config/firebaseConfig';
import {doc, updateDoc, serverTimestamp} from 'firebase/firestore';

export default function EditEventModal({
  visible,
  event,
  onClose,
  onEventUpdated,
}) {
  const [loading, setLoading] = useState(false);
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    category: '',
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    venue: '',
    address: '',
    maxCapacity: '',
    generalPrice: '',
    generalQuantity: '',
    vipPrice: '',
    vipQuantity: '',
    premiumPrice: '',
    premiumQuantity: '',
    tags: '',
    contactEmail: '',
    contactPhone: '',
    eventType: 'paid',
    ageRestriction: 'all',
    dresscode: '',
    specialInstructions: '',
    status: 'active',
  });
  const [flyer, setFlyer] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepErrors, setStepErrors] = useState({});

  const categories = [
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
    'Workshop',
    'Conference',
    'Festival',
    'Exhibition',
  ];

  const eventTypes = [
    {value: 'paid', label: 'Paid Event', icon: 'payment'},
    {value: 'free', label: 'Free Event', icon: 'event-available'},
  ];

  const ageRestrictions = [
    {value: 'all', label: 'All Ages'},
    {value: '18+', label: '18+ Only'},
    {value: '21+', label: '21+ Only'},
  ];

  const eventStatuses = [
    {value: 'active', label: 'Active', color: '#10B981'},
    {value: 'cancelled', label: 'Cancelled', color: '#EF4444'},
    {value: 'completed', label: 'Completed', color: '#6B7280'},
    {value: 'draft', label: 'Draft', color: '#F59E0B'},
  ];

  // Parse time string to Date object
  const parseTimeString = timeString => {
    if (!timeString) return new Date();

    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':');
    const date = new Date();

    let hour24 = parseInt(hours);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;

    date.setHours(hour24, parseInt(minutes), 0, 0);
    return date;
  };

  // Load event data when modal opens
  useEffect(() => {
    if (visible && event) {
      const eventDate = new Date(event.date);
      const startTime = parseTimeString(event.startTime);
      const endTime = parseTimeString(event.endTime);

      setEventData({
        title: event.title || '',
        description: event.description || '',
        category: event.category || '',
        date: eventDate,
        startTime: startTime,
        endTime: endTime,
        venue: event.location?.venue || '',
        address: event.location?.address || '',
        maxCapacity: event.maxCapacity?.toString() || '',
        generalPrice: event.pricing?.general?.price?.toString() || '',
        generalQuantity: event.pricing?.general?.available?.toString() || '',
        vipPrice: event.pricing?.vip?.price?.toString() || '',
        vipQuantity: event.pricing?.vip?.available?.toString() || '',
        premiumPrice: event.pricing?.premium?.price?.toString() || '',
        premiumQuantity: event.pricing?.premium?.available?.toString() || '',
        tags: event.tags?.join(', ') || '',
        contactEmail: event.contactInfo?.email || '',
        contactPhone: event.contactInfo?.phone || '',
        eventType: event.eventType || 'paid',
        ageRestriction: event.ageRestriction || 'all',
        dresscode: event.dresscode || '',
        specialInstructions: event.specialInstructions || '',
        status: event.status || 'active',
      });

      if (event.flyer) {
        setFlyer({
          uri: event.flyer,
          isExisting: true,
        });
      }
    }
  }, [visible, event]);

  // Enhanced image selection
  const selectFlyer = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 1200,
      maxWidth: 1200,
      quality: 0.9,
      selectionLimit: 1,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel || response.error) return;

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setFlyer({
          uri: asset.uri,
          base64: asset.base64,
          type: asset.type,
          fileName: asset.fileName || 'event-flyer.jpg',
          isExisting: false,
        });
      }
    });
  };

  // Handle date/time changes
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEventData({...eventData, date: selectedDate});
    }
  };

  const onStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setEventData({...eventData, startTime: selectedTime});
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      if (selectedTime <= eventData.startTime) {
        Alert.alert('Invalid Time', 'End time must be after start time');
        return;
      }
      setEventData({...eventData, endTime: selectedTime});
    }
  };

  // Format time for display
  const formatTime = date => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Validation logic
  const validateStep = step => {
    const errors = [];

    switch (step) {
      case 1:
        if (!eventData.title.trim()) errors.push('title');
        if (!eventData.description.trim()) errors.push('description');
        if (!eventData.category) errors.push('category');
        break;

      case 2:
        if (!eventData.venue.trim()) errors.push('venue');
        if (!eventData.address.trim()) errors.push('address');
        if (!eventData.maxCapacity.trim()) errors.push('maxCapacity');
        break;

      case 3:
        if (eventData.eventType === 'paid') {
          if (!eventData.generalPrice.trim()) errors.push('generalPrice');
          if (!eventData.generalQuantity.trim()) errors.push('generalQuantity');
        }
        if (eventData.contactEmail && !eventData.contactEmail.includes('@')) {
          errors.push('contactEmail');
        }
        if (eventData.contactPhone && eventData.contactPhone.length < 10) {
          errors.push('contactPhone');
        }
        break;
    }

    return errors;
  };

  const hasFieldError = fieldName => {
    return stepErrors[currentStep]?.includes(fieldName);
  };

  const getFieldStyle = fieldName => {
    return hasFieldError(fieldName)
      ? 'bg-red-50 rounded-xl px-4 py-3 text-gray-800 border-2 border-red-300'
      : 'bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200';
  };

  // Update event
  const updateEvent = async () => {
    // Validate all steps
    const allErrors = {};
    for (let step = 1; step <= 4; step++) {
      const stepErrorList = validateStep(step);
      if (stepErrorList.length > 0) {
        allErrors[step] = stepErrorList;
      }
    }

    if (Object.keys(allErrors).length > 0) {
      setStepErrors(allErrors);
      const firstErrorStep = Math.min(...Object.keys(allErrors).map(Number));
      setCurrentStep(firstErrorStep);
      Alert.alert('Validation Error', 'Please fix the errors before updating');
      return;
    }

    setLoading(true);
    try {
      // Prepare pricing object
      let pricing = {};

      if (eventData.eventType === 'paid') {
        pricing.general = {
          price: parseInt(eventData.generalPrice),
          available: parseInt(eventData.generalQuantity),
          sold: event.pricing?.general?.sold || 0,
        };

        if (eventData.vipPrice && eventData.vipQuantity) {
          pricing.vip = {
            price: parseInt(eventData.vipPrice),
            available: parseInt(eventData.vipQuantity),
            sold: event.pricing?.vip?.sold || 0,
          };
        }

        if (eventData.premiumPrice && eventData.premiumQuantity) {
          pricing.premium = {
            price: parseInt(eventData.premiumPrice),
            available: parseInt(eventData.premiumQuantity),
            sold: event.pricing?.premium?.sold || 0,
          };
        }
      } else {
        pricing.free = {
          price: 0,
          available: parseInt(eventData.maxCapacity),
          sold: event.pricing?.free?.sold || 0,
        };
      }

      // Prepare update object
      const updateData = {
        title: eventData.title.trim(),
        description: eventData.description.trim(),
        category: eventData.category,
        date: eventData.date.toISOString().split('T')[0],
        startTime: formatTime(eventData.startTime),
        endTime: formatTime(eventData.endTime),
        location: {
          venue: eventData.venue.trim(),
          address: eventData.address.trim(),
          coordinates: event.location?.coordinates || {
            latitude: 0,
            longitude: 0,
          },
        },
        pricing: pricing,
        maxCapacity: parseInt(eventData.maxCapacity),
        tags: eventData.tags
          ? eventData.tags.split(',').map(tag => tag.trim().toLowerCase())
          : [eventData.category.toLowerCase()],
        eventType: eventData.eventType,
        ageRestriction: eventData.ageRestriction,
        contactInfo: {
          email: eventData.contactEmail || '',
          phone: eventData.contactPhone || '',
        },
        dresscode: eventData.dresscode || '',
        specialInstructions: eventData.specialInstructions || '',
        status: eventData.status,
        updatedAt: serverTimestamp(),
      };

      // Update flyer if changed
      if (flyer && !flyer.isExisting) {
        updateData.flyer = `data:${flyer.type};base64,${flyer.base64}`;
      }

      await updateDoc(doc(db, 'Events', event.id), updateData);

      Alert.alert('Success', 'Event updated successfully! 🎉', [
        {
          text: 'OK',
          onPress: () => {
            onEventUpdated();
          },
        },
      ]);
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step navigation with validation
  const nextStep = () => {
    const errors = validateStep(currentStep);

    if (errors.length > 0) {
      setStepErrors({...stepErrors, [currentStep]: errors});
      Alert.alert(
        'Please Complete Required Fields',
        'Fix the highlighted errors before proceeding',
      );
      return;
    }

    const newErrors = {...stepErrors};
    delete newErrors[currentStep];
    setStepErrors(newErrors);

    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Step indicator
  const renderStepIndicator = () => (
    <View className="flex-row justify-center items-center mb-6">
      {[1, 2, 3, 4].map(step => (
        <View key={step} className="flex-row items-center">
          <View
            className={`w-10 h-10 rounded-full items-center justify-center border-2 ${
              stepErrors[step]
                ? 'bg-red-100 border-red-400'
                : step <= currentStep
                ? 'bg-primary border-primary'
                : 'bg-gray-100 border-gray-300'
            }`}>
            {stepErrors[step] ? (
              <Icon name="error" size={16} color="#EF4444" />
            ) : (
              <Text
                className={`font-bold ${
                  step <= currentStep ? 'text-white' : 'text-gray-600'
                }`}>
                {step}
              </Text>
            )}
          </View>
          {step < 4 && (
            <View
              className={`w-8 h-1 ${
                step < currentStep ? 'bg-primary' : 'bg-gray-300'
              }`}
            />
          )}
        </View>
      ))}
    </View>
  );

  // Step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View className="space-y-6">
            <Text className="text-gray-800 font-bold text-xl mb-4">
              Basic Information
            </Text>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Event Title *
                {hasFieldError('title') && (
                  <Text className="text-red-500"> (Required)</Text>
                )}
              </Text>
              <TextInput
                className={getFieldStyle('title')}
                placeholder="Enter a compelling event title"
                value={eventData.title}
                onChangeText={text => setEventData({...eventData, title: text})}
                maxLength={100}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Description *
                {hasFieldError('description') && (
                  <Text className="text-red-500"> (Required)</Text>
                )}
              </Text>
              <TextInput
                className={getFieldStyle('description')}
                placeholder="Describe your event in detail"
                value={eventData.description}
                onChangeText={text =>
                  setEventData({...eventData, description: text})
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Category *
                {hasFieldError('category') && (
                  <Text className="text-red-500"> (Required)</Text>
                )}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row space-x-3">
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category}
                      className={`px-4 py-3 rounded-xl border-2 ${
                        eventData.category === category
                          ? 'bg-primary border-primary'
                          : 'bg-white border-gray-300'
                      }`}
                      onPress={() => setEventData({...eventData, category})}>
                      <Text
                        className={`font-medium ${
                          eventData.category === category
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

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Event Type *
              </Text>
              <View className="flex-row space-x-4">
                {eventTypes.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    className={`flex-1 p-4 rounded-xl border-2 ${
                      eventData.eventType === type.value
                        ? 'bg-primary border-primary'
                        : 'bg-white border-gray-300'
                    }`}
                    onPress={() =>
                      setEventData({...eventData, eventType: type.value})
                    }>
                    <View className="items-center">
                      <Icon
                        name={type.icon}
                        size={28}
                        color={
                          eventData.eventType === type.value
                            ? '#FFFFFF'
                            : '#8BC34A'
                        }
                      />
                      <Text
                        className={`font-medium mt-2 ${
                          eventData.eventType === type.value
                            ? 'text-white'
                            : 'text-gray-700'
                        }`}>
                        {type.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View className="space-y-6">
            <Text className="text-gray-800 font-bold text-xl mb-4">
              Date, Time & Location
            </Text>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Event Date *
              </Text>
              <TouchableOpacity
                className={`${getFieldStyle(
                  'date',
                )} flex-row items-center justify-between`}
                onPress={() => setShowDatePicker(true)}>
                <Text className="text-gray-800">
                  {eventData.date.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Icon name="calendar-today" size={20} color="#8BC34A" />
              </TouchableOpacity>
            </View>

            <View className="flex-row space-x-4">
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">
                  Start Time *
                </Text>
                <TouchableOpacity
                  className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex-row items-center justify-between"
                  onPress={() => setShowStartTimePicker(true)}>
                  <Text className="text-gray-800">
                    {formatTime(eventData.startTime)}
                  </Text>
                  <Icon name="access-time" size={20} color="#8BC34A" />
                </TouchableOpacity>
              </View>

              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">
                  End Time *
                </Text>
                <TouchableOpacity
                  className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex-row items-center justify-between"
                  onPress={() => setShowEndTimePicker(true)}>
                  <Text className="text-gray-800">
                    {formatTime(eventData.endTime)}
                  </Text>
                  <Icon name="access-time" size={20} color="#8BC34A" />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Venue Name *
                {hasFieldError('venue') && (
                  <Text className="text-red-500"> (Required)</Text>
                )}
              </Text>
              <TextInput
                className={getFieldStyle('venue')}
                placeholder="Enter venue name"
                value={eventData.venue}
                onChangeText={text => setEventData({...eventData, venue: text})}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Full Address *
                {hasFieldError('address') && (
                  <Text className="text-red-500"> (Required)</Text>
                )}
              </Text>
              <TextInput
                className={getFieldStyle('address')}
                placeholder="Enter complete address"
                value={eventData.address}
                onChangeText={text =>
                  setEventData({...eventData, address: text})
                }
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Maximum Capacity *
                {hasFieldError('maxCapacity') && (
                  <Text className="text-red-500"> (Required)</Text>
                )}
              </Text>
              <TextInput
                className={getFieldStyle('maxCapacity')}
                placeholder="Enter maximum capacity"
                value={eventData.maxCapacity}
                onChangeText={text =>
                  setEventData({...eventData, maxCapacity: text})
                }
                keyboardType="numeric"
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Age Restriction
              </Text>
              <View className="flex-row space-x-3">
                {ageRestrictions.map(restriction => (
                  <TouchableOpacity
                    key={restriction.value}
                    className={`px-4 py-3 rounded-xl border-2 ${
                      eventData.ageRestriction === restriction.value
                        ? 'bg-primary border-primary'
                        : 'bg-white border-gray-300'
                    }`}
                    onPress={() =>
                      setEventData({
                        ...eventData,
                        ageRestriction: restriction.value,
                      })
                    }>
                    <Text
                      className={`font-medium ${
                        eventData.ageRestriction === restriction.value
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}>
                      {restriction.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View className="space-y-6">
            <Text className="text-gray-800 font-bold text-xl mb-4">
              {eventData.eventType === 'paid'
                ? 'Ticket Pricing'
                : 'Free Event Settings'}
            </Text>

            {eventData.eventType === 'paid' ? (
              <View className="space-y-4">
                {/* General Tickets */}
                <View className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <Text className="text-blue-800 font-medium mb-3">
                    General Tickets *
                    {(hasFieldError('generalPrice') ||
                      hasFieldError('generalQuantity')) && (
                      <Text className="text-red-500"> (Required)</Text>
                    )}
                  </Text>
                  <View className="flex-row space-x-3">
                    <View className="flex-1">
                      <Text className="text-blue-700 text-sm mb-1">
                        Price (₹)
                      </Text>
                      <TextInput
                        className={
                          hasFieldError('generalPrice')
                            ? 'bg-red-50 rounded-lg px-3 py-2 text-gray-800 border-2 border-red-300'
                            : 'bg-white rounded-lg px-3 py-2 text-gray-800 border border-gray-200'
                        }
                        placeholder="500"
                        value={eventData.generalPrice}
                        onChangeText={text =>
                          setEventData({...eventData, generalPrice: text})
                        }
                        keyboardType="numeric"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-blue-700 text-sm mb-1">
                        Available
                      </Text>
                      <TextInput
                        className={
                          hasFieldError('generalQuantity')
                            ? 'bg-red-50 rounded-lg px-3 py-2 text-gray-800 border-2 border-red-300'
                            : 'bg-white rounded-lg px-3 py-2 text-gray-800 border border-gray-200'
                        }
                        placeholder="100"
                        value={eventData.generalQuantity}
                        onChangeText={text =>
                          setEventData({...eventData, generalQuantity: text})
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  {event.pricing?.general?.sold > 0 && (
                    <Text className="text-blue-600 text-sm mt-2">
                      Sold: {event.pricing.general.sold} tickets
                    </Text>
                  )}
                </View>

                {/* VIP Tickets */}
                <View className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <Text className="text-purple-800 font-medium mb-3">
                    VIP Tickets (Optional)
                  </Text>
                  <View className="flex-row space-x-3">
                    <View className="flex-1">
                      <Text className="text-purple-700 text-sm mb-1">
                        Price (₹)
                      </Text>
                      <TextInput
                        className="bg-white rounded-lg px-3 py-2 text-gray-800 border border-gray-200"
                        placeholder="1500"
                        value={eventData.vipPrice}
                        onChangeText={text =>
                          setEventData({...eventData, vipPrice: text})
                        }
                        keyboardType="numeric"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-purple-700 text-sm mb-1">
                        Available
                      </Text>
                      <TextInput
                        className="bg-white rounded-lg px-3 py-2 text-gray-800 border border-gray-200"
                        placeholder="50"
                        value={eventData.vipQuantity}
                        onChangeText={text =>
                          setEventData({...eventData, vipQuantity: text})
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  {event.pricing?.vip?.sold > 0 && (
                    <Text className="text-purple-600 text-sm mt-2">
                      Sold: {event.pricing.vip.sold} tickets
                    </Text>
                  )}
                </View>

                {/* Premium Tickets */}
                <View className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <Text className="text-yellow-800 font-medium mb-3">
                    Premium Tickets (Optional)
                  </Text>
                  <View className="flex-row space-x-3">
                    <View className="flex-1">
                      <Text className="text-yellow-700 text-sm mb-1">
                        Price (₹)
                      </Text>
                      <TextInput
                        className="bg-white rounded-lg px-3 py-2 text-gray-800 border border-gray-200"
                        placeholder="2500"
                        value={eventData.premiumPrice}
                        onChangeText={text =>
                          setEventData({...eventData, premiumPrice: text})
                        }
                        keyboardType="numeric"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-yellow-700 text-sm mb-1">
                        Available
                      </Text>
                      <TextInput
                        className="bg-white rounded-lg px-3 py-2 text-gray-800 border border-gray-200"
                        placeholder="25"
                        value={eventData.premiumQuantity}
                        onChangeText={text =>
                          setEventData({...eventData, premiumQuantity: text})
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  {event.pricing?.premium?.sold > 0 && (
                    <Text className="text-yellow-600 text-sm mt-2">
                      Sold: {event.pricing.premium.sold} tickets
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View className="bg-green-50 rounded-xl p-6 border border-green-200">
                <View className="flex-row items-center mb-3">
                  <Icon name="event-available" size={32} color="#10B981" />
                  <Text className="text-green-800 font-bold text-lg ml-3">
                    Free Event
                  </Text>
                </View>
                <Text className="text-green-700">
                  This is a free event. Attendees can register without payment.
                  Maximum capacity: {eventData.maxCapacity || 'Not set'}
                </Text>
                {event.pricing?.free?.sold > 0 && (
                  <Text className="text-green-600 text-sm mt-2">
                    Registered: {event.pricing.free.sold} attendees
                  </Text>
                )}
              </View>
            )}

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Contact Email
                {hasFieldError('contactEmail') && (
                  <Text className="text-red-500"> (Invalid format)</Text>
                )}
              </Text>
              <TextInput
                className={getFieldStyle('contactEmail')}
                placeholder="contact@example.com"
                value={eventData.contactEmail}
                onChangeText={text =>
                  setEventData({...eventData, contactEmail: text})
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Contact Phone
                {hasFieldError('contactPhone') && (
                  <Text className="text-red-500"> (Min 10 digits)</Text>
                )}
              </Text>
              <TextInput
                className={getFieldStyle('contactPhone')}
                placeholder="+91 9876543210"
                value={eventData.contactPhone}
                onChangeText={text =>
                  setEventData({...eventData, contactPhone: text})
                }
                keyboardType="phone-pad"
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View className="space-y-6">
            <Text className="text-gray-800 font-bold text-xl mb-4">
              Additional Details & Status
            </Text>

            {/* Event Status */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Event Status *
              </Text>
              <View className="flex-row flex-wrap space-x-2">
                {eventStatuses.map(status => (
                  <TouchableOpacity
                    key={status.value}
                    className={`px-4 py-3 rounded-xl border-2 mb-2 ${
                      eventData.status === status.value
                        ? 'border-2'
                        : 'bg-white border-gray-300'
                    }`}
                    style={{
                      backgroundColor:
                        eventData.status === status.value
                          ? status.color + '20'
                          : '#FFFFFF',
                      borderColor:
                        eventData.status === status.value
                          ? status.color
                          : '#D1D5DB',
                    }}
                    onPress={() =>
                      setEventData({...eventData, status: status.value})
                    }>
                    <Text
                      className={`font-medium ${
                        eventData.status === status.value
                          ? 'text-gray-800'
                          : 'text-gray-700'
                      }`}
                      style={{
                        color:
                          eventData.status === status.value
                            ? status.color
                            : '#374151',
                      }}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Event Flyer
              </Text>
              <TouchableOpacity
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 items-center bg-gray-50"
                onPress={selectFlyer}>
                {flyer ? (
                  <View className="items-center">
                    <Image
                      source={{uri: flyer.uri}}
                      className="w-40 h-48 rounded-lg mb-3"
                      resizeMode="cover"
                    />
                    <Text className="text-primary font-medium">
                      {flyer.isExisting
                        ? '✓ Current flyer - Tap to change'
                        : '✓ New flyer selected'}
                    </Text>
                  </View>
                ) : (
                  <View className="items-center">
                    <Icon name="image" size={48} color="#D1D5DB" />
                    <Text className="text-gray-500 font-medium mt-2">
                      Add Event Flyer
                    </Text>
                    <Text className="text-gray-400 text-sm mt-1">
                      Recommended: 1200x1600px
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">Tags</Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                placeholder="e.g. live music, outdoor, family-friendly"
                value={eventData.tags}
                onChangeText={text => setEventData({...eventData, tags: text})}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">Dress Code</Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                placeholder="e.g. Casual, Formal, Traditional"
                value={eventData.dresscode}
                onChangeText={text =>
                  setEventData({...eventData, dresscode: text})
                }
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Special Instructions
              </Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                placeholder="Any special instructions for attendees"
                value={eventData.specialInstructions}
                onChangeText={text =>
                  setEventData({...eventData, specialInstructions: text})
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Event Analytics */}
            {event.analytics && (
              <View className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <Text className="text-blue-800 font-bold text-lg mb-3">
                  📊 Event Analytics
                </Text>
                <View className="space-y-2">
                  <Text className="text-blue-700 text-sm">
                    <Text className="font-semibold">Views:</Text>{' '}
                    {event.analytics.views || 0}
                  </Text>
                  <Text className="text-blue-700 text-sm">
                    <Text className="font-semibold">Bookings:</Text>{' '}
                    {event.analytics.bookings || 0}
                  </Text>
                  <Text className="text-blue-700 text-sm">
                    <Text className="font-semibold">Revenue:</Text> ₹
                    {event.analytics.revenue || 0}
                  </Text>
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        {/* Enhanced Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-100">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-800 text-2xl font-bold">Edit Event</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Step Title */}
          <Text className="text-center text-gray-600 font-medium">
            Step {currentStep} of 4:{' '}
            {currentStep === 1
              ? 'Basic Information'
              : currentStep === 2
              ? 'Date & Location'
              : currentStep === 3
              ? 'Pricing & Contact'
              : 'Additional Details'}
          </Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-4">
            <View className="bg-white rounded-2xl p-6 shadow-sm">
              {renderStepContent()}
            </View>
          </View>
        </ScrollView>

        {/* Enhanced Navigation Buttons */}
        <View className="bg-white px-4 py-6 border-t border-gray-100">
          <View className="flex-row space-x-3">
            {currentStep > 1 && (
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-xl py-4 flex-row items-center justify-center"
                onPress={prevStep}>
                <Icon name="arrow-back" size={20} color="#374151" />
                <Text className="text-gray-700 font-bold ml-2">Previous</Text>
              </TouchableOpacity>
            )}

            {currentStep < 4 ? (
              <TouchableOpacity
                className="flex-1 bg-primary rounded-xl py-4 flex-row items-center justify-center"
                onPress={nextStep}>
                <Text className="text-white font-bold mr-2">Next</Text>
                <Icon name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className={`flex-1 rounded-xl py-4 flex-row items-center justify-center ${
                  loading ? 'bg-gray-400' : 'bg-orange-600'
                }`}
                onPress={updateEvent}
                disabled={loading}>
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-white font-bold ml-2">
                      Updating...
                    </Text>
                  </>
                ) : (
                  <>
                    <Icon name="save" size={20} color="#FFFFFF" />
                    <Text className="text-white font-bold ml-2">
                      Update Event
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Date/Time Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={eventData.date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showStartTimePicker && (
          <DateTimePicker
            value={eventData.startTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onStartTimeChange}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={eventData.endTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onEndTimeChange}
          />
        )}
      </View>
    </Modal>
  );
}
