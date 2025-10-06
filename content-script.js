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
    this.currentUrl = window.location.href;
    this.urlCheckInterval = null;
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
    // Store initial URL
    this.currentUrl = window.location.href;

    // Start initial evaluation timer (30s for normal pages)
    this.evaluationTimer = setTimeout(() => {
      this.triggerEvaluation(false);
    }, 30000);

    // Set up mutation observer for text changes
    this.setupMutationObserver();

    // Monitor URL changes (for SPAs and history.pushState)
    this.setupUrlMonitoring();
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

    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
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

  setupUrlMonitoring() {
    // Check for URL changes every second (for SPAs)
    this.urlCheckInterval = setInterval(() => {
      const newUrl = window.location.href;
      if (newUrl !== this.currentUrl) {
        console.log('URL changed from', this.currentUrl, 'to', newUrl);
        this.handleUrlChange(newUrl);
      }
    }, 1000);
  }

  handleUrlChange(newUrl) {
    this.currentUrl = newUrl;

    // Clear existing evaluation timer
    if (this.evaluationTimer) {
      clearTimeout(this.evaluationTimer);
    }

    // Clear re-evaluation timer (if general-purpose)
    if (this.reEvaluationTimer) {
      clearInterval(this.reEvaluationTimer);
      this.reEvaluationTimer = null;
    }

    // Remove any existing alert
    this.removeAlertUI();

    // Reset state for new page
    this.lastEvaluation = null;
    this.isGeneralPurpose = null;
    this.lastTextHash = null;

    // Start new evaluation timer (30s)
    this.evaluationTimer = setTimeout(() => {
      this.triggerEvaluation(false);
    }, 30000);
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
    // Create full-page modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'focus-guard-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'focus-guard-modal';
    modal.innerHTML = `
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

        <div class="explanation-section">
          <label class="explanation-label" for="focus-guard-explanation">
            Why is this page relevant to your goal?
          </label>
          <textarea
            class="explanation-input"
            id="focus-guard-explanation"
            placeholder="Example: This page provides background context on neural networks which I need to understand before diving into classification techniques..."
            rows="3"
          ></textarea>
          <div class="revalidation-status" id="focus-guard-status"></div>
        </div>
      </div>
      <div class="alert-actions">
        <button class="alert-btn alert-btn-primary" id="focus-guard-return">Return to previous page</button>
        <button class="alert-btn alert-btn-secondary" id="focus-guard-explain">Explain relevance</button>
        <button class="alert-btn alert-btn-tertiary" id="focus-guard-park">Park page</button>
        <button class="alert-btn alert-btn-tertiary" id="focus-guard-ignore">Ignore for 10 min</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this.alertUI = overlay;

    // Add event listeners
    const closeModal = () => this.removeAlertUI();

    // Close button
    document.getElementById('focus-guard-close')?.addEventListener('click', closeModal);

    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Click overlay to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Return button
    document.getElementById('focus-guard-return')?.addEventListener('click', () => {
      window.history.back();
      closeModal();
    });

    // Explain relevance button
    document.getElementById('focus-guard-explain')?.addEventListener('click', async () => {
      await this.handleRevalidation();
    });

    // Park button
    document.getElementById('focus-guard-park')?.addEventListener('click', async () => {
      await this.parkCurrentPage();
      closeModal();
    });

    // Ignore button
    document.getElementById('focus-guard-ignore')?.addEventListener('click', async () => {
      await this.ignoreCurrentTab();
      closeModal();
    });
  }

  async handleRevalidation() {
    const explanationInput = document.getElementById('focus-guard-explanation');
    const statusDiv = document.getElementById('focus-guard-status');
    const explainBtn = document.getElementById('focus-guard-explain');

    if (!explanationInput || !statusDiv || !explainBtn) return;

    const userExplanation = explanationInput.value.trim();

    if (!userExplanation) {
      statusDiv.className = 'revalidation-status error';
      statusDiv.textContent = 'Please provide an explanation first.';
      return;
    }

    if (userExplanation.length < 20) {
      statusDiv.className = 'revalidation-status error';
      statusDiv.textContent = 'Please provide a more detailed explanation (at least 20 characters).';
      return;
    }

    // Show loading state
    statusDiv.className = 'revalidation-status loading';
    statusDiv.textContent = 'Revalidating with AI...';
    explainBtn.disabled = true;

    try {
      const pageTitle = document.title;
      const pageUrl = window.location.href;
      const pageText = this.extractPageText(500);

      const response = await chrome.runtime.sendMessage({
        type: 'REVALIDATE_PAGE',
        pageTitle,
        pageUrl,
        pageText,
        userExplanation
      });

      if (response.success) {
        const { goal_related_score, verdict } = response.data;

        if (goal_related_score >= 80) {
          // Success! Close modal
          statusDiv.className = 'revalidation-status success';
          statusDiv.textContent = `✓ Revalidation successful! Score: ${goal_related_score}/100`;

          // Update last evaluation
          this.lastEvaluation = response.data;

          // Close modal after short delay
          setTimeout(() => {
            this.removeAlertUI();
            // Show success indicator
            this.showStatusIndicator('on-topic', '✅ On topic (validated)', response.data.rationale);
          }, 1500);
        } else {
          // Still off-topic
          statusDiv.className = 'revalidation-status error';
          statusDiv.textContent = `Still off-topic (score: ${goal_related_score}/100). ${response.data.rationale}`;
          explainBtn.disabled = false;
        }
      } else {
        statusDiv.className = 'revalidation-status error';
        statusDiv.textContent = `Revalidation failed: ${response.error}`;
        explainBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error during revalidation:', error);
      statusDiv.className = 'revalidation-status error';
      statusDiv.textContent = 'An error occurred during revalidation.';
      explainBtn.disabled = false;
    }
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
