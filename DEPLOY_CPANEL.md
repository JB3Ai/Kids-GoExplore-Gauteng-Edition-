# cPanel Live Deploy via GitHub Actions

This project auto-deploys to cPanel when you push to `main`.

## 1) Add GitHub repository secrets

In GitHub repo settings → **Secrets and variables** → **Actions**, add:

- `CPANEL_FTP_SERVER` (example: `ftp.yourdomain.com`)
- `CPANEL_FTP_USERNAME`
- `CPANEL_FTP_PASSWORD`

The workflow deploys to:

- `/public_html/kids-goexplore/`

Optional for AI provider config (used at build time if needed in Vite):

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL` (default: `https://api.openai.com/v1`)
- `OPENAI_MODEL` (default: `gpt-4.1-mini`)
- `GEMINI_API_KEY` (fallback only)

## 2) Push to main

Any push to `main` triggers `.github/workflows/deploy-cpanel.yml`:

1. install deps
2. build app (`npm run build`)
3. upload `dist/` to your cPanel path

## 3) Trigger manually

Use GitHub Actions → **Deploy to cPanel** → **Run workflow**.
