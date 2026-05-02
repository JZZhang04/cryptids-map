# OpenAI AI Assist Setup

This project's first version AI-assisted description flow uses a Supabase Edge Function as a secure proxy to OpenAI.

## What it does

- Adds a `Generate Description` button inside the Add Creature modal
- Sends `name`, `location`, `category`, and any existing draft text to a Supabase Edge Function
- Calls OpenAI's Responses API from the Edge Function
- Returns a short English field-guide style description draft for the user to review before saving

## 1. Set Supabase function secrets

From the project root, run:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_MODEL` is optional. If you omit it, the function defaults to `gpt-4.1-mini`.

## 2. Deploy the Edge Function

```bash
supabase functions deploy ai-assist-description
```

If you are testing locally with the Supabase CLI:

```bash
supabase functions serve ai-assist-description --env-file .env.local
```

## 3. Keep your existing frontend env vars

The Vite app still only needs:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Do not put your OpenAI API key in the Vite frontend env file.

## 4. Notes

- This is a minimal prompt-based version, not full RAG yet.
- The generated description is meant to be edited by the user before saving.
- Later, this same function can be upgraded to use retrieval over approved lore documents and public reviewed entries.
