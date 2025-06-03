// Utility functions for working with weekly schedule data

export const formatTime = date => {
  if (!date || !(date instanceof Date)) return 'Invalid Time';
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

  const openTime =
    todaySchedule.openTime.getHours() * 60 +
    todaySchedule.openTime.getMinutes();
  const closeTime =
    todaySchedule.closeTime.getHours() * 60 +
    todaySchedule.closeTime.getMinutes();

  return currentTime >= openTime && currentTime <= closeTime;
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
