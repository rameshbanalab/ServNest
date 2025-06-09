import React, {useState} from 'react';
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
import {collection, addDoc, serverTimestamp} from 'firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function CreateEventModal({visible, onClose, onEventCreated}) {
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

  // Reset form
  const resetForm = () => {
    setEventData({
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
    });
    setFlyer(null);
    setCurrentStep(1);
    setStepErrors({});
  };

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
        });
      }
    });
  };

  // Handle date/time changes
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEventData({...eventData, date: selectedDate});
      // Clear date error if it exists
      if (stepErrors[2]?.includes('date')) {
        const newErrors = {...stepErrors};
        newErrors[2] = newErrors[2].filter(err => err !== 'date');
        setStepErrors(newErrors);
      }
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

  // ✅ Enhanced step validation
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
        if (eventData.date < new Date()) errors.push('date');
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

      case 4:
        // Step 4 is optional, no required fields
        break;
    }

    return errors;
  };

  // ✅ Check if field has error
  const hasFieldError = fieldName => {
    return stepErrors[currentStep]?.includes(fieldName);
  };

  // ✅ Get field error style
  const getFieldStyle = fieldName => {
    return hasFieldError(fieldName)
      ? 'bg-red-50 rounded-xl px-4 py-3 text-gray-800 border-2 border-red-300'
      : 'bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200';
  };

  // Enhanced form validation
  const validateForm = () => {
    const allErrors = {};

    // Validate all steps
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

      const fieldNames = {
        title: 'Event Title',
        description: 'Description',
        category: 'Category',
        venue: 'Venue Name',
        address: 'Address',
        maxCapacity: 'Maximum Capacity',
        date: 'Event Date',
        generalPrice: 'General Ticket Price',
        generalQuantity: 'General Ticket Quantity',
        contactEmail: 'Contact Email',
        contactPhone: 'Contact Phone',
      };

      const firstError = allErrors[firstErrorStep][0];
      const fieldName = fieldNames[firstError] || firstError;

      Alert.alert(
        'Validation Error',
        `Please fix the error in "${fieldName}" on step ${firstErrorStep}`,
      );
      return false;
    }

    return true;
  };

  // Create event with enhanced validation
  const createEvent = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to create events');
        return;
      }

      // Prepare pricing object
      let pricing = {};

      if (eventData.eventType === 'paid') {
        pricing.general = {
          price: parseInt(eventData.generalPrice),
          available: parseInt(eventData.generalQuantity),
          sold: 0,
        };

        if (eventData.vipPrice && eventData.vipQuantity) {
          pricing.vip = {
            price: parseInt(eventData.vipPrice),
            available: parseInt(eventData.vipQuantity),
            sold: 0,
          };
        }

        if (eventData.premiumPrice && eventData.premiumQuantity) {
          pricing.premium = {
            price: parseInt(eventData.premiumPrice),
            available: parseInt(eventData.premiumQuantity),
            sold: 0,
          };
        }
      } else {
        pricing.free = {
          price: 0,
          available: parseInt(eventData.maxCapacity),
          sold: 0,
        };
      }

      // Prepare enhanced event object
      const newEvent = {
        title: eventData.title.trim(),
        description: eventData.description.trim(),
        organizerId: currentUser.uid,
        category: eventData.category,
        date: eventData.date.toISOString().split('T')[0],
        startTime: formatTime(eventData.startTime),
        endTime: formatTime(eventData.endTime),
        location: {
          venue: eventData.venue.trim(),
          address: eventData.address.trim(),
          coordinates: {latitude: 0, longitude: 0},
        },
        pricing: pricing,
        flyer: flyer ? `data:${flyer.type};base64,${flyer.base64}` : '',
        status: 'active',
        featured: false,
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        analytics: {
          views: 0,
          bookings: 0,
          revenue: 0,
        },
      };

      await addDoc(collection(db, 'Events'), newEvent);

      Alert.alert('Success', 'Event created successfully! 🎉', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onEventCreated();
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Enhanced step navigation with validation
  const nextStep = () => {
    const errors = validateStep(currentStep);

    if (errors.length > 0) {
      setStepErrors({...stepErrors, [currentStep]: errors});

      const fieldNames = {
        title: 'Event Title',
        description: 'Description',
        category: 'Category',
        venue: 'Venue Name',
        address: 'Address',
        maxCapacity: 'Maximum Capacity',
        date: 'Event Date (must be in future)',
        generalPrice: 'General Ticket Price',
        generalQuantity: 'General Ticket Quantity',
        contactEmail: 'Valid Contact Email',
        contactPhone: 'Valid Contact Phone (10+ digits)',
      };

      const errorMessages = errors.map(field => fieldNames[field] || field);

      Alert.alert(
        'Please Complete Required Fields',
        `The following fields are required:\n\n• ${errorMessages.join('\n• ')}`,
        [{text: 'OK'}],
      );
      return;
    }

    // Clear errors for current step
    const newErrors = {...stepErrors};
    delete newErrors[currentStep];
    setStepErrors(newErrors);

    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // ✅ Enhanced step indicator with error states
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

  // ✅ Enhanced step content with error handling
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
              <Text className="text-gray-400 text-xs mt-1">
                {eventData.title.length}/100 characters
              </Text>
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
                placeholder="Describe your event in detail - what makes it special?"
                value={eventData.description}
                onChangeText={text =>
                  setEventData({...eventData, description: text})
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text className="text-gray-400 text-xs mt-1">
                {eventData.description.length}/500 characters
              </Text>
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
                          : hasFieldError('category')
                          ? 'bg-white border-red-300'
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

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Tags (Optional)
              </Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                placeholder="e.g. live music, outdoor, family-friendly"
                value={eventData.tags}
                onChangeText={text => setEventData({...eventData, tags: text})}
              />
              <Text className="text-gray-400 text-xs mt-1">
                Separate tags with commas to help people find your event
              </Text>
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
                {hasFieldError('date') && (
                  <Text className="text-red-500"> (Must be in future)</Text>
                )}
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
                placeholder="Enter venue name (e.g. City Convention Center)"
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
                placeholder="Enter complete address with city and state"
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
                placeholder="Enter maximum number of attendees"
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
                        Quantity
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
                        Quantity
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
                        Quantity
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
                  This is a free event. Attendees can register without any
                  payment. Maximum capacity:{' '}
                  {eventData.maxCapacity || 'Not set'}
                </Text>
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
              Additional Details
            </Text>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Event Flyer (Optional)
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
                      ✓ Flyer uploaded - Tap to change
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
                    <Text className="text-gray-400 text-xs mt-1">
                      JPG, PNG up to 5MB
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Dress Code (Optional)
              </Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                placeholder="e.g. Casual, Formal, Traditional, Smart Casual"
                value={eventData.dresscode}
                onChangeText={text =>
                  setEventData({...eventData, dresscode: text})
                }
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                Special Instructions (Optional)
              </Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                placeholder="Any special instructions for attendees (parking, entry requirements, etc.)"
                value={eventData.specialInstructions}
                onChangeText={text =>
                  setEventData({...eventData, specialInstructions: text})
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Enhanced Event Preview */}
            <View className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
              <Text className="text-blue-800 font-bold text-lg mb-3">
                📋 Event Preview
              </Text>
              <View className="space-y-2">
                <Text className="text-blue-700 text-sm">
                  <Text className="font-semibold">Title:</Text>{' '}
                  {eventData.title || 'Not set'}
                </Text>
                <Text className="text-blue-700 text-sm">
                  <Text className="font-semibold">Date:</Text>{' '}
                  {eventData.date.toLocaleDateString('en-IN')}
                </Text>
                <Text className="text-blue-700 text-sm">
                  <Text className="font-semibold">Time:</Text>{' '}
                  {formatTime(eventData.startTime)} -{' '}
                  {formatTime(eventData.endTime)}
                </Text>
                <Text className="text-blue-700 text-sm">
                  <Text className="font-semibold">Venue:</Text>{' '}
                  {eventData.venue || 'Not set'}
                </Text>
                <Text className="text-blue-700 text-sm">
                  <Text className="font-semibold">Type:</Text>{' '}
                  {eventData.eventType === 'paid'
                    ? '💰 Paid Event'
                    : '🆓 Free Event'}
                </Text>
                <Text className="text-blue-700 text-sm">
                  <Text className="font-semibold">Capacity:</Text>{' '}
                  {eventData.maxCapacity || 'Not set'} people
                </Text>
              </View>
            </View>
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
            <Text className="text-gray-800 text-2xl font-bold">
              Create New Event
            </Text>
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
                  loading ? 'bg-gray-400' : 'bg-green-600'
                }`}
                onPress={createEvent}
                disabled={loading}>
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-white font-bold ml-2">
                      Creating...
                    </Text>
                  </>
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color="#FFFFFF" />
                    <Text className="text-white font-bold ml-2">
                      Create Event
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
