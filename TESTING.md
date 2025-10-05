# Testing Guide for AI Focus Guard

This guide will help you test all the features of the AI Focus Guard extension.

## Prerequisites

1. Extension loaded in Chrome
2. OpenAI API key configured in `service-worker.js`
3. Sufficient OpenAI API credits

## Test Scenarios

### 1. Basic Goal Setting

**Test**: Set a research goal
- [ ] Click extension icon
- [ ] Enter goal: "Research machine learning classification techniques"
- [ ] Click "Start Focus Session"
- [ ] Verify popup shows "Current Goal" with your text
- [ ] Verify "Evaluations: 0/10" is displayed

**Expected**: Session starts, UI switches to active session view

### 2. On-Topic Page Evaluation

**Test**: Visit a relevant page
- [ ] Visit a page related to your goal (e.g., Wikipedia article on ML)
- [ ] Wait 30 seconds
- [ ] Check for green indicator in top-right corner

**Expected**:
- Green "✅ On topic" indicator appears
- Hovering shows rationale
- Popup shows "Evaluations: 1/10"

### 3. Off-Topic Page Alert

**Test**: Visit an unrelated page
- [ ] Visit a page unrelated to goal (e.g., cooking recipes)
- [ ] Wait 30 seconds
- [ ] Check for red alert banner

**Expected**:
- Red "⛔ Off-topic page detected" banner appears
- Shows rationale and matched terms (if any)
- Three action buttons present: Return, Park, Ignore

### 4. Borderline Page

**Test**: Visit a partially relevant page
- [ ] Visit a page loosely related to goal
- [ ] Wait 30 seconds
- [ ] Check for amber indicator

**Expected**:
- Amber "⚠️ Borderline" indicator appears
- Hovering shows explanation

### 5. Park Page Functionality

**Test**: Park an off-topic page
- [ ] Trigger off-topic alert (see test 3)
- [ ] Click "Park page" button
- [ ] Open extension popup
- [ ] Check "Parked Pages" section

**Expected**:
- Alert dismisses
- Page appears in parked list
- Count shows "Parked Pages (1)"
- Clicking parked link opens the page

### 6. Ignore Functionality

**Test**: Ignore tab for 10 minutes
- [ ] Trigger off-topic alert
- [ ] Click "Ignore 10 min" button
- [ ] Refresh the page
- [ ] Wait 30 seconds

**Expected**:
- Alert dismisses
- No new evaluation occurs on same tab
- Other tabs still get evaluated
- After 10 minutes, evaluations resume

### 7. Return to Goal

**Test**: Return action works
- [ ] Navigate to page A (on-topic)
- [ ] Navigate to page B (off-topic)
- [ ] Wait for alert
- [ ] Click "Return to goal"

**Expected**:
- Browser navigates back to page A
- Alert dismisses

### 8. General-Purpose Page Detection

**Test**: Search engine behavior
- [ ] Visit Google.com
- [ ] Wait 30 seconds (should NOT evaluate yet)
- [ ] Type a search query related to your goal
- [ ] Wait for results to load
- [ ] Wait 60 seconds

**Expected**:
- No immediate evaluation on blank Google page
- After query + results, evaluation triggers
- Re-evaluations every 60 seconds while active

**Test pages**:
- google.com
- chatgpt.com
- perplexity.ai
- bing.com

### 9. Rate Limiting

**Test A**: Tab rate limit (1 eval/minute)
- [ ] Visit page, wait for evaluation
- [ ] Refresh page immediately
- [ ] Wait 30 seconds

**Expected**: No new evaluation (must wait 60s from last eval)

**Test B**: Session limit (10 evals max)
- [ ] Visit 10 different pages, trigger 10 evaluations
- [ ] Popup shows "Evaluations: 10/10"
- [ ] Visit 11th page, wait 30 seconds

**Expected**: No evaluation on 11th page (limit reached)

### 10. Text Change Detection

**Test**: Dynamic content pages
- [ ] Visit a page with minimal initial content
- [ ] Wait for dynamic content to load (e.g., infinite scroll)
- [ ] Observer should detect text changes

**Expected**: Evaluation triggers when meaningful content appears

### 11. Insufficient Content Handling

**Test**: Pages with little text
- [ ] Visit image-heavy page or video page (YouTube)
- [ ] Wait 30 seconds

**Expected**:
- No evaluation (less than 50 chars of text)
- No alert shown
- Console shows "Skipping evaluation: insufficient text"

### 12. Session End

**Test**: End active session
- [ ] Click extension icon
- [ ] Click "End Session"
- [ ] Confirm dialog

**Expected**:
- Session ends
- Popup returns to goal input screen
- All alerts disappear from pages
- Session count resets

### 13. API Error Handling

**Test**: Invalid API key
- [ ] Temporarily set invalid API key in service-worker.js
- [ ] Visit a page, wait 30 seconds
- [ ] Check console

**Expected**:
- Error logged in console
- No alert shown (neutral state)
- Retry scheduled for 30s later

### 14. Malformed Response Handling

**Test**: This requires modifying service-worker.js temporarily
- Mock a malformed JSON response from OpenAI
- Verify graceful failure

**Expected**:
- Error logged
- No crash
- Neutral state maintained

## Debugging Tips

### Chrome DevTools

1. **Service Worker Console**:
   - Go to `chrome://extensions/`
   - Find AI Focus Guard
   - Click "service worker" link
   - Check for API errors, JSON parsing errors

2. **Content Script Console**:
   - Open DevTools on any webpage (F12)
   - Check Console tab
   - Look for "Skipping evaluation" messages
   - Check for extraction issues

3. **Storage Inspection**:
   - DevTools → Application tab → Storage → Local Storage
   - Extension ID → chrome.storage.local
   - View current goal, evaluations, parked pages

### Common Issues

| Issue | Solution |
|-------|----------|
| No evaluations happening | Check API key, verify goal is set, check console |
| Alert not showing | Check styles.css loaded, verify score < 80 |
| "Rate limit" errors | Wait 60s between evals on same tab |
| Extension icon not showing | Add icon files or remove icon refs from manifest |
| API errors | Check API key, OpenAI credits, network |

## Performance Testing

- [ ] Test on heavy pages (Reddit, Twitter)
- [ ] Test on single-page apps (React apps)
- [ ] Test with multiple tabs open simultaneously
- [ ] Test memory usage over extended session

## Acceptance Criteria (from description.md)

- [x] User can set a session goal
- [x] Pages evaluated at correct cadence (30s normal, 60s general-purpose)
- [x] Alerts shown when score < 80
- [x] Model decides `general_purpose` correctly
- [x] Parked pages saved locally
- [ ] Privacy guardrails applied (skipped for MVP)
- [x] Rate limits respected (1/tab/min, 10/session)

## Test Results Template

```
Date: ___________
Chrome Version: ___________
Extension Version: 1.0.0

Test 1 (Goal Setting): ☐ Pass ☐ Fail
Test 2 (On-Topic): ☐ Pass ☐ Fail
Test 3 (Off-Topic): ☐ Pass ☐ Fail
Test 4 (Borderline): ☐ Pass ☐ Fail
Test 5 (Park Page): ☐ Pass ☐ Fail
Test 6 (Ignore): ☐ Pass ☐ Fail
Test 7 (Return): ☐ Pass ☐ Fail
Test 8 (General-Purpose): ☐ Pass ☐ Fail
Test 9 (Rate Limiting): ☐ Pass ☐ Fail
Test 10 (Text Changes): ☐ Pass ☐ Fail
Test 11 (Insufficient Content): ☐ Pass ☐ Fail
Test 12 (Session End): ☐ Pass ☐ Fail

Notes:
_____________________________________
```
