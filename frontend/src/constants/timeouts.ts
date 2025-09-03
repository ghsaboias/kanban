// Timeout and delay constants
export const TIMEOUTS = {
  // UI delays
  FOCUS_DELAY: 100,            // Auto-focus inputs
  RICH_TEXT_SAVE: 500,         // RichTextEditor save debounce
  
  // Socket retry
  SOCKET_RETRY_BASE: 1000,     // Base retry delay (1 second)
  SOCKET_RETRY_MAX: 10000,     // Max retry delay (10 seconds)
  
  // API performance expectations
  API_EXPECTED_MAX: 100,       // Expected API response time in tests
  
  // Test delays
  TEST_OPERATION: 150,         // Test operation delays
  
  // Text truncation
  DEFAULT_TRUNCATE_LENGTH: 100, // Default text truncation length
} as const