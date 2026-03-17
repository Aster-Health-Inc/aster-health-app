# App Store Review Response (Template)

Hello App Review Team,

Thank you for your review. We have implemented changes to address Guidelines **5.1.1(i)**, **5.1.2(i)**, and **1.4.1**.

## 1) Privacy and Data Sharing (5.1.1(i), 5.1.2(i))

### Explicit consent before third-party processing
- A consent modal appears when users first attempt AI-enabled features.
- Modal text explains that limited data may be sent to analytics and AI services to provide insights.
- Actions:
  - **Allow**: enables AI processing and analytics
  - **Not now**: keeps AI processing and analytics disabled

### User controls in Settings
- New Settings section: **Data & AI Processing**
- Toggle: **Allow AI features to process my data**
- Privacy policy link is provided in Settings

### Third-party services disclosed
- PostHog (analytics)
- AI processing via secure server-side edge functions
- Optional Open Food Facts lookup for barcode nutrition

### Behavior when consent is not granted
- AI requests are blocked with a graceful fallback message
- Analytics tracking is disabled/opted out

## 2) Medical / Wellness Citations (1.4.1)

### Citation discoverability
- Insight surfaces include a visible **ⓘ** icon next to titles.
- Tapping **ⓘ** opens a modal titled **Sources and Methodology**.

### Modal contents
- Explanation of how insights are calculated
- Reputable citations with clickable links (e.g., CDC, NIH, WHO, ACOG)

### Coverage
- Cycle insights and predictions
- Wellness/energy insights
- Nutrition insight cards
- Chatbot health response context

## 3) Where to test in app

1. Open chatbot or photo food analysis and observe consent modal.
2. Tap **Not now** and verify AI is disabled.
3. Go to Settings -> **Data & AI Processing**, enable toggle.
4. Retry AI feature and verify it works.
5. Open insight cards and tap **ⓘ** to view **Sources and Methodology**.

We appreciate your re-review.
