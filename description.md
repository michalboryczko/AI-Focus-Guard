# MVP: AI-assisted Focus Guard for Research Sessions

## 0) Goal (user story)
“As a researcher with ADHD, I start a focus session by writing a goal. While I browse, the app checks whether the current page actually supports my goal. If it doesn’t (score < 80), I get a gentle alert and quick actions (return/park/ignore). The AI model also decides whether the page is a *general-purpose page* (e.g. search engines, chatbots, dashboards) and adapts the evaluation cadence accordingly.”

---

## 1) Assumptions
1. External model: **OpenAI `gpt-4.1-nano`** (API key hardcoded for MVP).  
2. The user provides a **free-text goal description** at session start.  
3. For normal pages: **after 30s dwell**, extract up to **~500 words** (+ title + URL) and send to OpenAI. Model returns a **`goal_related_score`**. If **score < 80**, show an **alert**.  
4. The **model itself** determines whether a page is general-purpose. If yes → use a slower cadence (evaluate only when meaningful text or query is present, then re-check every 60s).  

---

## 2) Architecture
**A. Browser Extension (Manifest V3)**  
- Content script  
  - Extracts page title, URL, main visible text (~500 words).  
  - Uses a 30s timer after page load → triggers evaluation.  
  - Uses MutationObserver to detect text changes.  
  - Renders floating alert UI (top-right banner/pill).  

- Service worker (background)  
  - Holds session state (goal, last score/time).  
  - Calls OpenAI API.  
  - Enforces rate limits (1 eval / tab / minute).  

**B. OpenAI call**  
- Direct `fetch` to API.  
- Prompt instructs model to:  
  - Assess relevance to goal.  
  - Decide if page is general-purpose.  
  - Return strict JSON.  

**C. Local storage**  
- Keep goal, past evaluations

---

## 3) Content extraction
- Title: `document.title`  
- URL: `location.href`  
- Text:  
  - Use `<main>`, `<article>`, or largest visible block.  
  - Clean nav/footers if obvious.  
  - Normalize whitespace.  
  - Truncate to ~500 words.  

---

## 4) Prompt (JSON-only)
**System**
```
You are an assistant that evaluates whether the current webpage content is relevant to the user's research goal. 
You also decide if the page is a *general-purpose page* (search engine, chatbot, aggregator, dashboard, etc.) 
based on its structure, function, and relation to the goal. 
Return strict JSON only.
```

**User (template)**
```
GOAL:
{goal_description}

PAGE_META:
title: {page_title}
url: {page_url}

PAGE_TEXT_SNIPPET (~500 words):
{page_text_500}

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
}
```

---

## 5) Thresholds & cadence
- **Normal pages (`general_purpose=false`)**  
  - First evaluation at **30s dwell**.  
  - Re-check only if text changes significantly.  

- **General-purpose pages (`general_purpose=true`)**  
  - Skip initial 30s check.  
  - Wait until meaningful text or query appears.  
  - Then evaluate and re-check every **60s** while active.  

---

## 6) Example response
```json
{
  "general_purpose": true,
  "goal_related_score": 65,
  "verdict": "borderline",
  "rationale": "This is a Google search page. The query is loosely connected to RAG classification.",
  "matched_terms": ["RAG", "classification"]
}
```

---

## 7) UI (alert banner)
- Placement: top-right, floating pill/banner.  
- States:  
  - ✅ On-topic: green dot.  
  - ⚠️ Borderline: amber, hover shows rationale.  
  - ⛔ Off-topic: red banner with 3 actions:  
    - **Return to goal**  
    - **Park page**  
    - **Ignore for 10 min**

---

## 8) Evaluation cadence & token control
- Normal pages: max **1 call/tab/minute**, stop after evaluation unless large changes.  
- General-purpose: poll every **60s** once content/query detected.  
- Global cap: **10 calls/session**.  
- Limit output tokens to **128**.  

---

## 9) Privacy guardrails
- SKIP FOR MVP

---

## 10) Failure behavior
- If API call fails → neutral state (“not evaluated”).  
- Retry once after 30s.  
- If JSON malformed → treat as neutral, log locally.  

---

## 11) UX flow (happy path)
1. User enters goal.  
2. Opens article → after 30s evaluation, score = 85 → no alert.  
3. Opens YouTube → too little text → skip.  
4. Opens Google → model flags as general-purpose, waits for query.  
   - User types query, evaluation runs, score = 50 → alert shown.  
5. User chooses **Park page** → link saved, alert dismissed.  

---

## 12) Acceptance criteria
- [ ] User can set a session goal.  
- [ ] Pages evaluated at correct cadence.  
- [ ] Alerts shown when score < 80.  
- [ ] Model decides `general_purpose` correctly.  
- [ ] Parked pages saved locally.  
- [ ] Privacy guardrails applied.  
- [ ] Rate limits respected.  

---