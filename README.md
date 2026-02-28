<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5dd7202b-76ae-44df-bae8-17d9381633b3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure AI provider in `.env.local`:

   OpenAI-compatible (recommended while Gemini is offline):

   ```
   OPENAI_API_KEY=your_key
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_MODEL=gpt-4.1-mini
   ```

   Gemini fallback (optional):

   ```
   GEMINI_API_KEY=your_key
   ```

3. Run the app:
   `npm run dev`
