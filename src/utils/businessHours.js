import {convertToDate, formatTime} from './timeUtils';

export const getBusinessStatus = weeklySchedule => {
  if (!weeklySchedule) {
    return {
      status: 'unknown',
      message: 'Hours not available',
    };
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', {weekday: 'long'});
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

  const todaySchedule = weeklySchedule[currentDay];

  if (!todaySchedule || !todaySchedule.isOpen) {
    return {
      status: 'closed',
      message: 'Closed today',
    };
  }

  // FIXED: Use standardized time conversion
  const openTime = convertToDate(todaySchedule.openTime);
  const closeTime = convertToDate(todaySchedule.closeTime);

  const openMinutes = openTime.getHours() * 60 + openTime.getMinutes();
  const closeMinutes = closeTime.getHours() * 60 + closeTime.getMinutes();

  if (currentTime >= openMinutes && currentTime <= closeMinutes) {
    return {
      status: 'open',
      message: `Closes at ${formatTime(closeTime)}`,
    };
  } else if (currentTime < openMinutes) {
    return {
      status: 'closed',
      message: `Opens at ${formatTime(openTime)}`,
    };
  } else {
    return {
      status: 'closed',
      message: 'Closed for today',
    };
  }
};

export const generateOperatingHoursDisplay = weeklySchedule => {
  if (!weeklySchedule) return 'Hours not available';

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const openDays = daysOfWeek.filter(
    day => weeklySchedule[day] && weeklySchedule[day].isOpen,
  );

  if (openDays.length === 0) {
    return 'Closed all days';
  }

  if (openDays.length <= 2) {
    return openDays
      .map(day => {
        const dayHours = weeklySchedule[day];
        return `${day}: ${formatTime(dayHours.openTime)} - ${formatTime(
          dayHours.closeTime,
        )}`;
      })
      .join(', ');
  }

  return `${openDays.length} days configured`;
};
