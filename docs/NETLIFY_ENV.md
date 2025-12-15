# ROMNA V7 Netlify Environment Variables

## ⚠️ SECURITY NOTICE

**AI API keys (Gemini, HuggingFace) are SERVER-ONLY.**

❌ **Never set:** `NEXT_PUBLIC_GEMINI_API_KEY` or `NEXT_PUBLIC_HUGGINGFACE_API_KEY`

These would expose your API keys in the client-side JavaScript bundle, allowing anyone to steal them.

---

## Required Variables

### Public (Exposed to Browser)
These use `NEXT_PUBLIC_` prefix and are safe to expose:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJhbGciOiJIUz...` |

### Server-Only (Never Expose)
These are accessed only by API routes:

| Variable | Description | Notes |
|----------|-------------|-------|
| `HF_API_KEY` | HuggingFace API key | Used by `/api/stt` |
| `GEMINI_API_KEY` | Google Gemini API key | Used by NLU |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key | For server-only operations |
| `CRON_SECRET` | Cron job authorization | Protects scheduled endpoints |
| `RESEND_API_KEY` | Resend email API key | For email sending |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | For WhatsApp |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | For WhatsApp |

---

## Setting Variables in Netlify

1. Go to **Site Settings** → **Environment Variables**
2. Add each variable with the correct value
3. **Important**: Do NOT prefix server-only variables with `NEXT_PUBLIC_`

---

## Pre-Deploy Security Checklist

Before every deploy, verify:

- [ ] `NEXT_PUBLIC_GEMINI_API_KEY` is **NOT** set
- [ ] `NEXT_PUBLIC_HUGGINGFACE_API_KEY` is **NOT** set
- [ ] `GEMINI_API_KEY` is set (server-only)
- [ ] `HF_API_KEY` is set (server-only)

---

## Verification

After deploying, verify environment with:

```bash
npm run verify:runtime
```

Or check the `/debug` page for API config status.

---

## Security Notes

⚠️ **Never commit `.env.local` to Git**  
⚠️ **Never expose `HF_API_KEY`, `GEMINI_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` in browser**  
⚠️ **Use Netlify's environment variable UI, not `netlify.toml`**
