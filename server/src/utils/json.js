export const toJsonString = (value) => JSON.stringify(value ?? null);

export const fromJsonString = (value, fallback = null) => {
  if (typeof value !== 'string' || value.length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
