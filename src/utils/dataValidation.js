/**
 * Removes undefined values from an object recursively
 */
export const removeUndefinedFields = obj => {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj
      .map(item => removeUndefinedFields(item))
      .filter(item => item !== undefined && item !== null);
  }

  if (typeof obj === 'object') {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined && value !== null) {
        const cleanedValue = removeUndefinedFields(value);
        if (cleanedValue !== undefined && cleanedValue !== null) {
          cleaned[key] = cleanedValue;
        }
      }
    });
    return cleaned;
  }

  return obj;
};

/**
 * Validates required fields
 */
export const validateRequiredFields = (obj, requiredFields) => {
  const missingFields = [];

  requiredFields.forEach(field => {
    const fieldPath = field.split('.');
    let value = obj;

    for (const path of fieldPath) {
      if (value && typeof value === 'object') {
        value = value[path];
      } else {
        value = undefined;
        break;
      }
    }

    if (value === undefined || value === null || value === '') {
      missingFields.push(field);
    }
  });

  return missingFields;
};

/**
 * Sanitizes string values
 */
export const sanitizeString = str => {
  if (typeof str !== 'string') return str;
  return str.trim();
};

/**
 * Ensures array is valid
 */
export const ensureArray = arr => {
  return Array.isArray(arr) ? arr : [];
};
