// Popup script for AI Focus Guard

document.addEventListener('DOMContentLoaded', async () => {
  const noGoalView = document.getElementById('no-goal-view');
  const activeSessionView = document.getElementById('active-session-view');
  const goalInput = document.getElementById('goal-input');
  const startSessionBtn = document.getElementById('start-session-btn');
  const endSessionBtn = document.getElementById('end-session-btn');
  const currentGoalEl = document.getElementById('current-goal');
  const evalCountEl = document.getElementById('eval-count');
  const parkedCountEl = document.getElementById('parked-count');
  const parkedListEl = document.getElementById('parked-list');

  // Load current state
  await loadState();

  // Event listeners
  startSessionBtn.addEventListener('click', startSession);
  endSessionBtn.addEventListener('click', endSession);

  async function loadState() {
    const goal = await StorageManager.getGoal();

    if (goal) {
      showActiveSession(goal);
    } else {
      showNoGoal();
    }
  }

  function showNoGoal() {
    noGoalView.classList.remove('hidden');
    activeSessionView.classList.add('hidden');
  }

  async function showActiveSession(goal) {
    noGoalView.classList.add('hidden');
    activeSessionView.classList.remove('hidden');

    currentGoalEl.textContent = goal;

    // Load session stats
    const count = await StorageManager.getSessionCount();
    evalCountEl.textContent = count;

    // Load parked pages
    const parkedPages = await StorageManager.getParkedPages();
    parkedCountEl.textContent = parkedPages.length;

    if (parkedPages.length === 0) {
      parkedListEl.innerHTML = '<div class="parked-empty">No parked pages yet</div>';
    } else {
      parkedListEl.innerHTML = parkedPages
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(page => `
          <div class="parked-item">
            <a href="${escapeHtml(page.url)}" target="_blank" title="${escapeHtml(page.title)}">
              ${escapeHtml(page.title || page.url)}
            </a>
          </div>
        `)
        .join('');
    }
  }

  async function startSession() {
    const goal = goalInput.value.trim();

    if (!goal) {
      alert('Please enter a research goal');
      return;
    }

    if (goal.length < 10) {
      alert('Please provide a more detailed goal (at least 10 characters)');
      return;
    }

    startSessionBtn.disabled = true;
    startSessionBtn.textContent = 'Starting...';

    try {
      await StorageManager.setGoal(goal);
      await showActiveSession(goal);

      // Notify content scripts that session has started
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: 'SESSION_STARTED', goal }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      }
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session. Please try again.');
    } finally {
      startSessionBtn.disabled = false;
      startSessionBtn.textContent = 'Start Focus Session';
    }
  }

  async function endSession() {
    if (!confirm('Are you sure you want to end this focus session?')) {
      return;
    }

    endSessionBtn.disabled = true;

    try {
      await StorageManager.clearGoal();

      // Notify content scripts that session has ended
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: 'SESSION_ENDED' }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      }

      goalInput.value = '';
      showNoGoal();
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session. Please try again.');
    } finally {
      endSessionBtn.disabled = false;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
