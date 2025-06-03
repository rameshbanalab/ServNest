// Utility functions for working with weekly schedule data

export const formatTime = date => {
  // Handle Firestore Timestamp objects
  if (date && typeof date === 'object' && date.toDate) {
    date = date.toDate(); // Convert Firestore Timestamp to Date
  }

  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Invalid Time';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const generateOperatingHoursDisplay = weeklySchedule => {
  if (!weeklySchedule) return 'Hours not specified';

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const hoursString = daysOfWeek
    .filter(day => weeklySchedule[day]?.isOpen)
    .map(day => {
      const dayHours = weeklySchedule[day];
      return `${day}: ${formatTime(dayHours.openTime)} - ${formatTime(
        dayHours.closeTime,
      )}`;
    })
    .join(', ');

  return hoursString || 'Closed all days';
};

export const isBusinessOpenNow = weeklySchedule => {
  if (!weeklySchedule) return false;

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', {weekday: 'long'});
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes

  const todaySchedule = weeklySchedule[currentDay];
  if (!todaySchedule || !todaySchedule.isOpen) {
    return false;
  }

  // Handle Firestore Timestamps
  let openTime = todaySchedule.openTime;
  let closeTime = todaySchedule.closeTime;

  if (openTime && typeof openTime === 'object' && openTime.toDate) {
    openTime = openTime.toDate();
  }
  if (closeTime && typeof closeTime === 'object' && closeTime.toDate) {
    closeTime = closeTime.toDate();
  }

  // Validate that we have valid Date objects
  if (
    !openTime ||
    !closeTime ||
    !(openTime instanceof Date) ||
    !(closeTime instanceof Date)
  ) {
    return false;
  }

  const openTimeMinutes = openTime.getHours() * 60 + openTime.getMinutes();
  const closeTimeMinutes = closeTime.getHours() * 60 + closeTime.getMinutes();

  return currentTime >= openTimeMinutes && currentTime <= closeTimeMinutes;
};

export const getNextOpenDay = weeklySchedule => {
  if (!weeklySchedule) return null;

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Convert to our array index (Monday = 0)
  const todayIndex = today === 0 ? 6 : today - 1;

  for (let i = 1; i <= 7; i++) {
    const checkDayIndex = (todayIndex + i) % 7;
    const dayName = daysOfWeek[checkDayIndex];

    if (weeklySchedule[dayName]?.isOpen) {
      return {
        day: dayName,
        openTime: formatTime(weeklySchedule[dayName].openTime),
      };
    }
  }

  return null; // Business is closed all week
};

export const getBusinessStatus = weeklySchedule => {
  if (!weeklySchedule)
    return {status: 'unknown', message: 'Hours not available'};

  const isOpen = isBusinessOpenNow(weeklySchedule);

  if (isOpen) {
    return {status: 'open', message: 'Open now'};
  }

  const nextOpen = getNextOpenDay(weeklySchedule);
  if (nextOpen) {
    return {
      status: 'closed',
      message: `Closed • Opens ${nextOpen.day} at ${nextOpen.openTime}`,
    };
  }

  return {status: 'closed', message: 'Closed all week'};
};

// Helper function to convert Firestore Timestamp to Date
export const convertTimestampToDate = timestamp => {
  if (!timestamp) return null;

  // If it's already a Date object, return as is
  if (timestamp instanceof Date) return timestamp;

  // If it's a Firestore Timestamp, convert it
  if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
    return timestamp.toDate();
  }

  // If it's a timestamp object with seconds and nanoseconds
  if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
  }

  // Try to parse as Date if it's a string
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
};
