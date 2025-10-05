// Configuration file template
// Copy this file to config.js and add your OpenAI API key

const CONFIG = {
  OPENAI_API_KEY: 'YOUR_OPENAI_API_KEY_HERE',
  OPENAI_MODEL: 'gpt-4o-mini',
  MAX_OUTPUT_TOKENS: 128,

  // Timing settings (in milliseconds)
  NORMAL_PAGE_DELAY: 30000,      // 30 seconds
  GENERAL_PURPOSE_INTERVAL: 60000, // 60 seconds
  RETRY_DELAY: 30000,             // 30 seconds
  IGNORE_DURATION: 600000,        // 10 minutes

  // Rate limits
  MAX_EVALS_PER_SESSION: 10,
  MIN_EVAL_INTERVAL: 60000,       // 1 minute per tab

  // Content extraction
  MAX_WORDS: 500,
  MIN_TEXT_LENGTH: 50,

  // Alert threshold
  OFF_TOPIC_THRESHOLD: 80         // Score < 80 triggers alert
};

// Export for use in service worker
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
