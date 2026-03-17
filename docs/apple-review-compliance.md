# Aster Apple Review Compliance Report

Date: 2026-03-09

## 1) Third-Party Services Audit (Part 1)

| Service | Endpoint / Integration | Data Sent | Trigger | Consent Gate | Source Location |
|---|---|---|---|---|---|
| PostHog | `https://us.i.posthog.com` | Analytics events, screen names, app lifecycle events, user identifier traits (when signed in and consented) | App lifecycle, screen changes, feature interactions | Yes. PostHog client is only initialized after consent; opt-out + reset when disabled | `aster-app/App.js`, plus event calls in feature screens/components |
| Supabase Edge Function (Food Analysis) | `https://iinbwdrzmmcwajbmuynh.supabase.co/functions/v1/food-analysis` | Meal photo payload (`base64Image`), auth token | Photo nutrition analysis | Yes. Blocked when consent is not granted | `aster-app/services/geminiService.js` |
| Supabase Edge Function (Chatbot Proxy) | `https://iinbwdrzmmcwajbmuynh.supabase.co/functions/v1/chatbot-proxy` | User message, sanitized context, auth token | Chatbot send message | Yes. Blocked when consent is not granted | `aster-app/services/chatbotAPIService_EdgeFunction.js` |
| Open Food Facts | `https://world.openfoodfacts.org/api/v0/product/{barcode}.json` | Barcode lookup query | Barcode nutrition lookup | Yes. Blocked when consent is not granted | `aster-app/services/openFoodFactsService.js` |

## 2) Privacy Compliance Changes (Guidelines 5.1.1(i), 5.1.2(i))

### Consent system
- Added reusable modal: `aster-app/components/PrivacyAIConsentModal.js`
- Added consent persistence utility: `aster-app/utils/userDataSharingConsent.js`
- Added consent hook/provider:
  - `aster-app/hooks/useUserDataSharingConsent.js`
  - Exposes `{ consentGranted, requestConsent }`

### AI request gating
- Photo AI analysis requires consent: `aster-app/screens/PhotoConfirmationScreen.js`
- Gemini/food analysis service hard-blocks without consent: `aster-app/services/geminiService.js`
- Chatbot service hard-blocks without consent and returns graceful fallback: `aster-app/services/chatbotAPIService_EdgeFunction.js`
- Open Food Facts barcode lookup blocked without consent: `aster-app/services/openFoodFactsService.js`
- Chatbot UI asks consent before sending and shows fallback if denied: `aster-app/components/ChatBotModal.js`

### PostHog compliance
- PostHog init deferred until consent is granted: `aster-app/App.js`
- If consent is denied/revoked:
  - `optOut()` + `reset()` applied
  - Client cleared and provider not mounted
- Screen tracking only occurs when consent is granted

### Transparency UI
- Added `Data & AI Processing` section in Settings with:
  - Explanation of third-party processing
  - Data categories
  - Third-party service disclosure
  - Toggle: `Allow AI features to process my data`
  - Privacy policy link
- File: `aster-app/screens/SettingsScreen.js`

### Privacy disclosure copy
- Updated privacy language in:
  - `aster-app/screens/PrivacyConsentScreen.js`
  - `aster-app/screens/HelpFeedbackScreen.js`

## 3) Citation Compliance Changes (Guideline 1.4.1)

### Sources dataset
- Added chatbot citation category with reputable sources and methodology:
  - `chatbot_health_responses`
- File: `aster-app/data/healthInsightSources.js`

### Citation discoverability and modal usage
- Chatbot now has visible `ⓘ` next to title and opens `SourcesModal`
- File: `aster-app/components/ChatBotModal.js`

- Food Log now has source access on major nutrition cards (including macros/water)
- File: `aster-app/screens/FoodLogScreen.js`

- Shared sources modal already uses title `Sources and Methodology`, shows methodology/context, and has tappable links
- File: `aster-app/components/SourcesModal.js`

## 4) Part 8 Deliverables Summary

### Third-party services detected
- PostHog analytics
- Supabase Edge Function (food-analysis)
- Supabase Edge Function (chatbot-proxy)
- Open Food Facts barcode API

### Files modified for privacy compliance
- `aster-app/App.js`
- `aster-app/components/PrivacyAIConsentModal.js`
- `aster-app/hooks/useUserDataSharingConsent.js`
- `aster-app/utils/userDataSharingConsent.js`
- `aster-app/services/geminiService.js`
- `aster-app/services/chatbotAPIService_EdgeFunction.js`
- `aster-app/services/openFoodFactsService.js`
- `aster-app/screens/PhotoConfirmationScreen.js`
- `aster-app/components/ChatBotModal.js`
- `aster-app/screens/SettingsScreen.js`
- `aster-app/screens/PrivacyConsentScreen.js`
- `aster-app/screens/HelpFeedbackScreen.js`

### Files modified for citation fixes
- `aster-app/data/healthInsightSources.js`
- `aster-app/components/ChatBotModal.js`
- `aster-app/screens/FoodLogScreen.js`

### Core consent-gating snippets added
- `useUserDataSharingConsent()` returns:
  - `{ consentGranted, requestConsent }`
- AI and third-party services check consent before network calls
- PostHog only initializes after consent and is disabled/reset when not allowed

### Confirmation statements
- By code path, third-party analytics/AI/network calls listed above are blocked unless consent is granted.
- Citation entry points (`ⓘ` -> `Sources and Methodology`) are implemented on major health insight surfaces and chatbot responses.
- Final verification still requires manual on-device QA and link-tap validation.

## 5) Manual Verification Still Required (Outside Repo)

1. Run iOS manual QA for consent denied/allowed/revoked flows and restart persistence.
2. Capture proxy evidence (Charles/Proxyman): no third-party calls before consent.
3. Update and verify hosted privacy policy page content at `https://aster.fit/privacypolicy/` matches app disclosures.
4. Attach screenshots/video and this report in App Store Review response.
