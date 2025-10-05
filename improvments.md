# Focus Guard MVP – Proposed Improvements

These refinements are based on the initial MVP spec, with added detail for stricter evaluation cadence, user input on distractions, and stronger alert UX.

---

## 1) Evaluation cadence refinement
- **Current MVP rule:** `1 evaluation / tab / minute` rate limit.  
- **Problem:** If the user navigates to a completely new URL within the same tab, the evaluation may be delayed unnecessarily.  
- **Improvement:**  
  - **Reset evaluation timer on URL change.**  
  - New pages are always evaluated after **30s dwell**, regardless of the last evaluation timestamp.  
  - Rate limit still applies for repeated checks on the *same page*, but never blocks the **first evaluation on a new URL**.  

---

## 2) Handling distraction detection
- **Current MVP rule:** If `goal_related_score < 80`, show alert with options (return, park, ignore).  
- **Improvement:** Add an **interactive recovery option**:  
  - Alert includes a **text box** labeled *“Explain why this page matters for your goal”*.  
  - User can type a short justification.  
  - This justification is sent to the LLM along with the page snippet and goal for **revalidation**.  
  - Model re-checks relevance with this extra context.  
  - If the new `goal_related_score` ≥ 80, the alert is dismissed; otherwise, it remains.  

**Prompt addition for revalidation:**
```
The user provided an explanation why this page may still be relevant:
{user_explanation}

Re-evaluate the page vs. the GOAL considering this explanation.
Return updated JSON with goal_related_score, verdict, rationale, matched_terms.
```

---

## 3) Alert UX: stronger intervention
- **Current MVP:** Small floating banner (top-right).  
- **Problem:** Too subtle; easy to ignore → defeats purpose for ADHD focus aid.  
- **Improvement:**  
  - When page is flagged as `off_topic`, show a **full-page overlay modal**:  
    - Dim background.  
    - Centered alert box with red highlight.  
    - Options:  
      - **Return to goal** (dismiss and optionally refocus to previous on-topic tab).  
      - **Park this page** (save URL and dismiss).  
      - **Explain relevance** (shows text box for justification → triggers revalidation).  
      - **Ignore for 10 min** (dismiss temporarily).  
  - Only `borderline` verdicts still use the subtle banner.  
  - This ensures hard off-topic distractions cannot be overlooked.  

---

## 4) Acceptance criteria for improvements
- [ ] Evaluation timer resets immediately upon URL change (no artificial 1-min wait).  
- [ ] Full-page modal alert shown for `off_topic`.  
- [ ] Modal includes text box for user justification.  
- [ ] Justification triggers revalidation (goal + page + explanation).  
- [ ] If revalidation score ≥ 80, modal closes automatically.  
- [ ] If revalidation score < 80, modal remains until user chooses another action.  

---