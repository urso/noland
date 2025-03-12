/**
 * Application configuration
 */

// API configuration
export const API_CONFIG = {
  // Base URL for the Python backend API
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:6666',
};

// Export default config object
export default {
  API: API_CONFIG,
}; 