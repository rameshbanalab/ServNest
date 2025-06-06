/**
 * Standardized time conversion utility for business hours
 */

/**
 * Convert various time formats to Date object
 * @param {*} timeValue - Can be Date, Firestore Timestamp, ISO string, or number
 * @returns {Date} - Valid Date object
 */
export const convertToDate = timeValue => {
  if (!timeValue) {
    console.warn('No time value provided, using default');
    return new Date(2024, 0, 1, 9, 0, 0); // Default 9 AM
  }

  // If it's already a Date object
  if (timeValue instanceof Date) {
    return timeValue;
  }

  // If it's a Firestore Timestamp
  if (timeValue && typeof timeValue.toDate === 'function') {
    return timeValue.toDate();
  }

  // If it's an ISO string or timestamp
  if (typeof timeValue === 'string' || typeof timeValue === 'number') {
    const dateFromValue = new Date(timeValue);

    // Check if the conversion was successful
    if (!isNaN(dateFromValue.getTime())) {
      return dateFromValue;
    }
  }

  // If it's an object with seconds (Firestore Timestamp format)
  if (timeValue && typeof timeValue === 'object' && timeValue.seconds) {
    return new Date(timeValue.seconds * 1000);
  }

  console.warn('Invalid time value, using default:', timeValue);
  return new Date(2024, 0, 1, 9, 0, 0); // Default fallback
};

/**
 * Format time for display
 * @param {Date|string|object} timeValue - Time value to format
 * @returns {string} - Formatted time string
 */
export const formatTime = timeValue => {
  const date = convertToDate(timeValue);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Process weekly schedule data for consistent format
 * @param {Object} weeklySchedule - Raw weekly schedule from database
 * @returns {Object} - Processed weekly schedule with Date objects
 */
export const processWeeklySchedule = weeklySchedule => {
  if (!weeklySchedule || typeof weeklySchedule !== 'object') {
    return null;
  }

  const processedSchedule = {};

  Object.keys(weeklySchedule).forEach(day => {
    const dayData = weeklySchedule[day];

    if (dayData && typeof dayData === 'object') {
      processedSchedule[day] = {
        isOpen: Boolean(dayData.isOpen),
        openTime: convertToDate(dayData.openTime),
        closeTime: convertToDate(dayData.closeTime),
      };
    } else {
      // Default schedule if data is invalid
      processedSchedule[day] = {
        isOpen: false,
        openTime: new Date(2024, 0, 1, 9, 0, 0),
        closeTime: new Date(2024, 0, 1, 17, 0, 0),
      };
    }
  });

  return processedSchedule;
};

/**
 * Create time object for storage (consistent format)
 * @param {Date} dateTime - Date object
 * @returns {string} - ISO string for storage
 */
export const createStorageTime = dateTime => {
  if (!(dateTime instanceof Date)) {
    dateTime = convertToDate(dateTime);
  }
  return dateTime.toISOString();
};
