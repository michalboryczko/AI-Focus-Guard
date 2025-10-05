# AI Focus Guard

A Chrome browser extension that helps researchers with ADHD stay focused during research sessions by using AI to evaluate whether visited pages are relevant to their stated goal.

## Features

- **Goal-based Focus Sessions**: Set a research goal at the start of your session
- **AI-Powered Evaluation**: Uses OpenAI to assess page relevance (0-100 score)
- **Smart Cadence**: Adapts evaluation frequency based on page type
  - Normal pages: Evaluated after 30s dwell time
  - General-purpose pages (search engines, chatbots): Evaluated every 60s when active
- **Visual Alerts**:
  - ✅ Green indicator for on-topic pages
  - ⚠️ Amber indicator for borderline pages
  - ⛔ Red banner for off-topic pages (score < 80)
- **Quick Actions**: When off-topic:
  - Return to previous page
  - Park page for later review
  - Ignore alerts for 10 minutes
- **Rate Limiting**: Max 1 evaluation per tab per minute, 10 evaluations per session

## Setup Instructions

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key

### 2. Configure the Extension

1. Open `service-worker.js`
2. Find line 9: `const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';`
3. Replace `YOUR_OPENAI_API_KEY_HERE` with your actual API key

### 3. Create Extension Icons

Create an `icons` folder and add three icon files:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Or temporarily remove the icon references from `manifest.json` if you want to test without icons.

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `ai-distuction-blocker` directory
5. The extension should now appear in your extensions list

### 5. Start Using

1. Click the extension icon in your Chrome toolbar
2. Enter your research goal (e.g., "Research RAG classification techniques for my ML project")
3. Click "Start Focus Session"
4. Browse the web - the extension will monitor and alert you about off-topic pages

## File Structure

```
ai-distuction-blocker/
├── manifest.json           # Extension configuration
├── service-worker.js       # Background service worker (API calls)
├── content-script.js       # Content script (page analysis)
├── storage.js              # Storage management utilities
├── popup.html              # Extension popup UI
├── popup.js                # Popup logic
├── popup.css               # Popup styles
├── styles.css              # Content script UI styles
└── icons/                  # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## How It Works

### Evaluation Flow

1. **Page Load**: When you visit a page, a 30-second timer starts
2. **Text Extraction**: After 30s, extracts ~500 words from the main content
3. **AI Evaluation**: Sends to OpenAI with your goal for assessment
4. **Response Processing**: Receives:
   - `general_purpose`: Whether page is a search engine, chatbot, etc.
   - `goal_related_score`: 0-100 relevance score
   - `verdict`: on_topic, borderline, or off_topic
   - `rationale`: Brief explanation
   - `matched_terms`: Relevant keywords found

5. **UI Update**: Shows appropriate indicator or alert

### General-Purpose Pages

For pages like Google Search, ChatGPT, etc.:
- Skips initial 30s timer
- Waits for meaningful content
- Re-evaluates every 60s while you're active
- Helps track whether your searches/queries stay on-topic

### Rate Limiting

- **Per Tab**: Maximum 1 evaluation per minute
- **Per Session**: Maximum 10 evaluations total
- Prevents excessive API usage and costs

## Privacy

The extension:
- Only sends page title, URL, and ~500 words of text to OpenAI
- Stores goal and evaluations locally in Chrome storage
- Does not track or share your browsing data
- Does not send data to any server except OpenAI

## Troubleshooting

### Extension doesn't load
- Check that all files are present in the directory
- Verify manifest.json is valid JSON
- Check Chrome Developer Console for errors

### Evaluations not working
- Verify OpenAI API key is correctly set in `service-worker.js`
- Check that you have API credits in your OpenAI account
- Open Chrome DevTools and check Console for error messages
- Verify you've started a focus session (set a goal)

### Alert UI not showing
- Check that `styles.css` is loaded
- Verify the page has enough text content (>50 characters)
- Check rate limits haven't been exceeded

## Development Notes

- Uses Manifest V3 (latest Chrome extension standard)
- OpenAI model: `gpt-4o-mini` (cost-effective for MVP)
- Max tokens per evaluation: 128 (keeps costs low)
- Uses `response_format: { type: 'json_object' }` for reliable JSON parsing

## Cost Estimate

With `gpt-4o-mini`:
- Input: ~600 tokens (prompt + page text)
- Output: ~100 tokens
- Cost per evaluation: ~$0.0002
- 10 evaluations per session: ~$0.002
- Very affordable for testing and personal use

## Future Enhancements

- [ ] Configurable API key via settings UI
- [ ] Adjustable score threshold (currently hardcoded at 80)
- [ ] Export parked pages list
- [ ] Session history and analytics
- [ ] Support for other AI models
- [ ] Privacy mode (skip sensitive pages)
- [ ] Custom evaluation cadence settings

## License

This is an MVP/prototype for personal use. Modify as needed.
