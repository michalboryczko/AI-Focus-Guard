// Storage management for AI Focus Guard

const StorageManager = {
  // Keys for storage
  KEYS: {
    GOAL: 'current_goal',
    SESSION_COUNT: 'session_eval_count',
    TAB_EVALS: 'tab_evaluations',
    PARKED_PAGES: 'parked_pages',
    IGNORED_TABS: 'ignored_tabs'
  },

  // Get current goal
  async getGoal() {
    const result = await chrome.storage.local.get([this.KEYS.GOAL]);
    return result[this.KEYS.GOAL] || null;
  },

  // Set current goal
  async setGoal(goal) {
    await chrome.storage.local.set({ [this.KEYS.GOAL]: goal });
    // Reset session count when new goal is set
    await this.resetSessionCount();
  },

  // Clear goal
  async clearGoal() {
    await chrome.storage.local.remove([this.KEYS.GOAL]);
    await this.resetSessionCount();
  },

  // Session evaluation count (max 10 per session)
  async getSessionCount() {
    const result = await chrome.storage.local.get([this.KEYS.SESSION_COUNT]);
    return result[this.KEYS.SESSION_COUNT] || 0;
  },

  async incrementSessionCount() {
    const count = await this.getSessionCount();
    await chrome.storage.local.set({ [this.KEYS.SESSION_COUNT]: count + 1 });
    return count + 1;
  },

  async resetSessionCount() {
    await chrome.storage.local.set({ [this.KEYS.SESSION_COUNT]: 0 });
  },

  // Tab evaluations (for rate limiting: 1 eval/tab/minute)
  async getTabEval(tabId) {
    const result = await chrome.storage.local.get([this.KEYS.TAB_EVALS]);
    const tabEvals = result[this.KEYS.TAB_EVALS] || {};
    return tabEvals[tabId] || null;
  },

  async setTabEval(tabId, evalData, url) {
    const result = await chrome.storage.local.get([this.KEYS.TAB_EVALS]);
    const tabEvals = result[this.KEYS.TAB_EVALS] || {};
    tabEvals[tabId] = {
      ...evalData,
      timestamp: Date.now(),
      url: url || null
    };
    await chrome.storage.local.set({ [this.KEYS.TAB_EVALS]: tabEvals });
  },

  async clearTabEval(tabId) {
    const result = await chrome.storage.local.get([this.KEYS.TAB_EVALS]);
    const tabEvals = result[this.KEYS.TAB_EVALS] || {};
    delete tabEvals[tabId];
    await chrome.storage.local.set({ [this.KEYS.TAB_EVALS]: tabEvals });
  },

  // Check if tab can be evaluated (rate limit: 1/minute, but reset on URL change)
  async canEvaluateTab(tabId, currentUrl) {
    const tabEval = await this.getTabEval(tabId);
    if (!tabEval) return true;

    // If URL has changed, always allow evaluation (new page)
    if (currentUrl && tabEval.url !== currentUrl) {
      return true;
    }

    // For same URL, enforce 60-second rate limit
    const timeSinceLastEval = Date.now() - tabEval.timestamp;
    return timeSinceLastEval >= 60000; // 60 seconds
  },

  // Parked pages
  async getParkedPages() {
    const result = await chrome.storage.local.get([this.KEYS.PARKED_PAGES]);
    return result[this.KEYS.PARKED_PAGES] || [];
  },

  async parkPage(url, title, goal) {
    const parkedPages = await this.getParkedPages();
    parkedPages.push({
      url,
      title,
      goal,
      timestamp: Date.now()
    });
    await chrome.storage.local.set({ [this.KEYS.PARKED_PAGES]: parkedPages });
  },

  async clearParkedPages() {
    await chrome.storage.local.set({ [this.KEYS.PARKED_PAGES]: [] });
  },

  // Ignored tabs (ignore for 10 minutes)
  async isTabIgnored(tabId) {
    const result = await chrome.storage.local.get([this.KEYS.IGNORED_TABS]);
    const ignoredTabs = result[this.KEYS.IGNORED_TABS] || {};

    if (!ignoredTabs[tabId]) return false;

    const timeSinceIgnored = Date.now() - ignoredTabs[tabId];
    return timeSinceIgnored < 600000; // 10 minutes
  },

  async ignoreTab(tabId) {
    const result = await chrome.storage.local.get([this.KEYS.IGNORED_TABS]);
    const ignoredTabs = result[this.KEYS.IGNORED_TABS] || {};
    ignoredTabs[tabId] = Date.now();
    await chrome.storage.local.set({ [this.KEYS.IGNORED_TABS]: ignoredTabs });
  },

  async unignoreTab(tabId) {
    const result = await chrome.storage.local.get([this.KEYS.IGNORED_TABS]);
    const ignoredTabs = result[this.KEYS.IGNORED_TABS] || {};
    delete ignoredTabs[tabId];
    await chrome.storage.local.set({ [this.KEYS.IGNORED_TABS]: ignoredTabs });
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
