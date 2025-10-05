// Content Script for AI Focus Guard
// Handles page text extraction, evaluation timing, and alert UI

class FocusGuard {
  constructor() {
    this.evaluationTimer = null;
    this.reEvaluationTimer = null;
    this.mutationObserver = null;
    this.lastEvaluation = null;
    this.isGeneralPurpose = null;
    this.hasGoal = false;
    this.lastTextHash = null;
    this.alertUI = null;
  }

  async init() {
    // Check if session is active
    const goal = await this.getGoal();
    this.hasGoal = !!goal;

    if (this.hasGoal) {
      this.start();
    }

    // Listen for session changes
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SESSION_STARTED') {
        this.hasGoal = true;
        this.start();
      } else if (message.type === 'SESSION_ENDED') {
        this.hasGoal = false;
        this.stop();
      } else if (message.type === 'RETRY_EVALUATION') {
        setTimeout(() => this.triggerEvaluation(true), message.delay);
      }
    });
  }

  async getGoal() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['current_goal'], (result) => {
        resolve(result.current_goal || null);
      });
    });
  }

  start() {
    // Start initial evaluation timer (30s for normal pages)
    this.evaluationTimer = setTimeout(() => {
      this.triggerEvaluation(false);
    }, 30000);

    // Set up mutation observer for text changes
    this.setupMutationObserver();
  }

  stop() {
    // Clear timers
    if (this.evaluationTimer) {
      clearTimeout(this.evaluationTimer);
      this.evaluationTimer = null;
    }

    if (this.reEvaluationTimer) {
      clearInterval(this.reEvaluationTimer);
      this.reEvaluationTimer = null;
    }

    // Disconnect observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Remove alert UI
    this.removeAlertUI();

    // Reset state
    this.lastEvaluation = null;
    this.isGeneralPurpose = null;
    this.lastTextHash = null;
  }

  setupMutationObserver() {
    const targetNode = document.body;
    if (!targetNode) return;

    const config = {
      childList: true,
      subtree: true,
      characterData: true
    };

    this.mutationObserver = new MutationObserver((mutations) => {
      // Debounce - check if text actually changed
      const currentHash = this.getTextHash();
      if (currentHash !== this.lastTextHash) {
        this.lastTextHash = currentHash;
        this.handleTextChange();
      }
    });

    this.mutationObserver.observe(targetNode, config);
  }

  getTextHash() {
    const text = this.extractPageText(100); // Use first 100 words for hash
    return this.simpleHash(text);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  handleTextChange() {
    // If it's a general-purpose page and not yet evaluated, trigger evaluation
    if (this.isGeneralPurpose === null) {
      // Check if there's meaningful content now
      const text = this.extractPageText(500);
      if (text.length > 100) {
        this.triggerEvaluation(false);
      }
    } else if (this.isGeneralPurpose === false && this.lastEvaluation) {
      // For normal pages, only re-evaluate on significant changes
      // This is handled by checking if enough time has passed (rate limit)
    }
  }

  async triggerEvaluation(isRetry = false) {
    if (!this.hasGoal) return;

    const pageTitle = document.title;
    const pageUrl = window.location.href;
    const pageText = this.extractPageText(500);

    // Skip if page has very little text
    if (pageText.length < 50) {
      console.log('Skipping evaluation: insufficient text');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EVALUATE_PAGE',
        pageTitle,
        pageUrl,
        pageText,
        isRetry
      });

      if (response.success) {
        this.lastEvaluation = response.data;
        this.isGeneralPurpose = response.data.general_purpose;

        // Show alert UI
        this.updateAlertUI(response.data);

        // Set up re-evaluation for general-purpose pages
        if (this.isGeneralPurpose && !this.reEvaluationTimer) {
          this.reEvaluationTimer = setInterval(() => {
            this.triggerEvaluation(false);
          }, 60000); // 60 seconds
        }
      } else {
        console.log('Evaluation failed:', response.error);
      }
    } catch (error) {
      console.error('Error triggering evaluation:', error);
    }
  }

  extractPageText(maxWords = 500) {
    // Try to extract main content
    let contentElement = document.querySelector('main') ||
                        document.querySelector('article') ||
                        document.querySelector('[role="main"]') ||
                        document.body;

    if (!contentElement) return '';

    // Clone to avoid modifying the actual page
    const clone = contentElement.cloneNode(true);

    // Remove script, style, nav, footer, header
    const elementsToRemove = clone.querySelectorAll('script, style, nav, footer, header, aside, .nav, .menu, .footer');
    elementsToRemove.forEach(el => el.remove());

    // Get text content
    let text = clone.textContent || '';

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Truncate to maxWords
    const words = text.split(' ').slice(0, maxWords);
    return words.join(' ');
  }

  updateAlertUI(evaluation) {
    // Remove existing alert if any
    this.removeAlertUI();

    // Create alert based on verdict
    const { verdict, goal_related_score, rationale, matched_terms } = evaluation;

    if (verdict === 'on_topic') {
      this.showStatusIndicator('on-topic', '✅ On topic', rationale);
    } else if (verdict === 'borderline') {
      this.showStatusIndicator('borderline', '⚠️ Borderline', rationale);
    } else {
      this.showOffTopicAlert(rationale, matched_terms);
    }
  }

  showStatusIndicator(type, text, rationale) {
    const indicator = document.createElement('div');
    indicator.className = `focus-guard-indicator focus-guard-${type}`;
    indicator.innerHTML = `
      <span class="indicator-text">${text}</span>
      <div class="indicator-tooltip">${this.escapeHtml(rationale)}</div>
    `;
    document.body.appendChild(indicator);
    this.alertUI = indicator;
  }

  showOffTopicAlert(rationale, matchedTerms) {
    const alert = document.createElement('div');
    alert.className = 'focus-guard-alert focus-guard-off-topic';
    alert.innerHTML = `
      <div class="alert-header">
        <span class="alert-icon">⛔</span>
        <span class="alert-title">Off-topic page detected</span>
        <button class="alert-close" id="focus-guard-close">×</button>
      </div>
      <div class="alert-body">
        <p class="alert-rationale">${this.escapeHtml(rationale)}</p>
        ${matchedTerms && matchedTerms.length > 0 ? `
          <p class="alert-terms">Matched: ${matchedTerms.map(t => this.escapeHtml(t)).join(', ')}</p>
        ` : ''}
      </div>
      <div class="alert-actions">
        <button class="alert-btn alert-btn-primary" id="focus-guard-return">Return to goal</button>
        <button class="alert-btn alert-btn-secondary" id="focus-guard-park">Park page</button>
        <button class="alert-btn alert-btn-tertiary" id="focus-guard-ignore">Ignore 10 min</button>
      </div>
    `;

    document.body.appendChild(alert);
    this.alertUI = alert;

    // Add event listeners
    document.getElementById('focus-guard-close')?.addEventListener('click', () => {
      this.removeAlertUI();
    });

    document.getElementById('focus-guard-return')?.addEventListener('click', () => {
      window.history.back();
    });

    document.getElementById('focus-guard-park')?.addEventListener('click', async () => {
      await this.parkCurrentPage();
      this.removeAlertUI();
    });

    document.getElementById('focus-guard-ignore')?.addEventListener('click', async () => {
      await this.ignoreCurrentTab();
      this.removeAlertUI();
    });
  }

  async parkCurrentPage() {
    try {
      await chrome.runtime.sendMessage({
        type: 'PARK_PAGE',
        url: window.location.href,
        title: document.title
      });
      console.log('Page parked');
    } catch (error) {
      console.error('Error parking page:', error);
    }
  }

  async ignoreCurrentTab() {
    try {
      await chrome.runtime.sendMessage({
        type: 'IGNORE_TAB'
      });
      console.log('Tab ignored for 10 minutes');
    } catch (error) {
      console.error('Error ignoring tab:', error);
    }
  }

  removeAlertUI() {
    if (this.alertUI) {
      this.alertUI.remove();
      this.alertUI = null;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
const focusGuard = new FocusGuard();
focusGuard.init();
