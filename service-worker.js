// Service Worker for AI Focus Guard
// Handles OpenAI API calls and message passing

importScripts('storage.js');

// OpenAI Configuration
const OPENAI_API_KEY = ''; // TODO: Replace with actual key
const OPENAI_MODEL = 'gpt-4o-mini'; // Using gpt-4o-mini as gpt-4.1-nano doesn't exist
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const MAX_OUTPUT_TOKENS = 128;

// System prompt for OpenAI
const SYSTEM_PROMPT = `You are an assistant that evaluates whether the current webpage content is relevant to the user's research goal.
You also decide if the page is a *general-purpose page* (search engine, chatbot, aggregator, dashboard, etc.)
based on its structure, function, and relation to the goal.
Return strict JSON only.`;

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EVALUATE_PAGE') {
    handleEvaluation(message, sender.tab.id).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.type === 'PARK_PAGE') {
    handleParkPage(message, sender.tab.id).then(sendResponse);
    return true;
  }

  if (message.type === 'IGNORE_TAB') {
    handleIgnoreTab(sender.tab.id).then(sendResponse);
    return true;
  }
});

async function handleEvaluation(message, tabId) {
  try {
    // Check if we have a goal
    const goal = await StorageManager.getGoal();
    if (!goal) {
      return { success: false, error: 'No active goal' };
    }

    // Check if tab is ignored
    const isIgnored = await StorageManager.isTabIgnored(tabId);
    if (isIgnored) {
      return { success: false, error: 'Tab is ignored' };
    }

    // Check rate limit for this tab
    const canEvaluate = await StorageManager.canEvaluateTab(tabId);
    if (!canEvaluate) {
      return { success: false, error: 'Rate limit: 1 evaluation per minute per tab' };
    }

    // Check session limit (10 evals per session)
    const sessionCount = await StorageManager.getSessionCount();
    if (sessionCount >= 10) {
      return { success: false, error: 'Session limit reached (10 evaluations)' };
    }

    // Call OpenAI API
    const result = await evaluateWithOpenAI(
      goal,
      message.pageTitle,
      message.pageUrl,
      message.pageText
    );

    if (!result.success) {
      // Retry once after 30s if failed
      if (!message.isRetry) {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            type: 'RETRY_EVALUATION',
            delay: 30000
          }).catch(() => {});
        }, 30000);
      }
      return result;
    }

    // Store evaluation result
    await StorageManager.setTabEval(tabId, result.data);
    await StorageManager.incrementSessionCount();

    return { success: true, data: result.data };

  } catch (error) {
    console.error('Error handling evaluation:', error);
    return { success: false, error: error.message };
  }
}

async function evaluateWithOpenAI(goal, pageTitle, pageUrl, pageText) {
  try {
    // Build user prompt
    const userPrompt = `GOAL:
${goal}

PAGE_META:
title: ${pageTitle}
url: ${pageUrl}

PAGE_TEXT_SNIPPET (~500 words):
${pageText}

TASK:
1. Decide if this page is a general-purpose page (true/false).
2. Score how related this page is to the GOAL on a 0–100 scale.
3. Provide a short rationale and up to 5 matched terms.

Return strict JSON:

{
  "general_purpose": true | false,
  "goal_related_score": <integer 0-100>,
  "verdict": "on_topic" | "borderline" | "off_topic",
  "rationale": "<max 2 sentences>",
  "matched_terms": ["<up to 5 terms>"]
}`;

    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || ''}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON response
    let evaluation;
    try {
      evaluation = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse OpenAI JSON response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate response structure
    if (
      typeof evaluation.general_purpose !== 'boolean' ||
      typeof evaluation.goal_related_score !== 'number' ||
      !['on_topic', 'borderline', 'off_topic'].includes(evaluation.verdict)
    ) {
      throw new Error('Invalid evaluation structure');
    }

    return { success: true, data: evaluation };

  } catch (error) {
    console.error('OpenAI API error:', error);
    return { success: false, error: error.message };
  }
}

async function handleParkPage(message, tabId) {
  try {
    const goal = await StorageManager.getGoal();
    await StorageManager.parkPage(message.url, message.title, goal);
    return { success: true };
  } catch (error) {
    console.error('Error parking page:', error);
    return { success: false, error: error.message };
  }
}

async function handleIgnoreTab(tabId) {
  try {
    await StorageManager.ignoreTab(tabId);
    return { success: true };
  } catch (error) {
    console.error('Error ignoring tab:', error);
    return { success: false, error: error.message };
  }
}

// Clean up ignored tabs periodically
setInterval(async () => {
  const result = await chrome.storage.local.get([StorageManager.KEYS.IGNORED_TABS]);
  const ignoredTabs = result[StorageManager.KEYS.IGNORED_TABS] || {};
  const now = Date.now();

  // Remove tabs ignored more than 10 minutes ago
  const cleaned = {};
  for (const [tabId, timestamp] of Object.entries(ignoredTabs)) {
    if (now - timestamp < 600000) {
      cleaned[tabId] = timestamp;
    }
  }

  await chrome.storage.local.set({ [StorageManager.KEYS.IGNORED_TABS]: cleaned });
}, 60000); // Check every minute
