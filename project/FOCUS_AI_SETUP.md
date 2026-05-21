# Focus AI Setup Guide

Complete guide to set up and run the new Focus AI system with Poe integration and Supabase.

## Overview

The Focus AI system has been completely rewritten to:
- Use **Poe API** with your custom "momo.ai-focuspath" bot
- Fetch **real user session history** from Supabase
- Provide **personalized coaching** based on actual productivity data
- Store conversations in **Supabase** (not Firebase)
- Support **rate limiting** (20 messages/day free, unlimited premium)

## Architecture

```
Frontend (React/Vite)
    ↓
Python Backend (FastAPI)
    ↓
Poe API + Supabase Database
```

## Prerequisites

1. **Supabase Account** - Database already configured
2. **Poe API Key** - Already have: `myOe2husQA-JfKATcqQE7cc3JiZDFiyqDIW7Asmjl3o`
3. **Python 3.9+** - For backend service
4. **Node.js 18+** - For frontend

## Step-by-Step Setup

### 1. Apply Database Migration

The usage tracking table needs to be created in Supabase:

```bash
# Migration file already created at:
# supabase/migrations/20251117200000_create_momo_ai_usage_tracking.sql

# If using Supabase CLI:
supabase db push

# Or manually apply via Supabase Dashboard:
# Go to SQL Editor and run the migration file
```

### 2. Get Supabase Service Role Key

The backend needs the **service role key** (not the anon key).

1. Go to: https://supabase.com/dashboard/project/ahxhkzstrfmdiecqqjdh/settings/api
2. Copy the "service_role" key (under "Project API keys")
3. Save it for the next step

### 3. Set Up Python Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env  # Edit with your values
```

Edit `backend/.env`:
```env
POE_API_KEY=myOe2husQA-JfKATcqQE7cc3JiZDFiyqDIW7Asmjl3o
SUPABASE_URL=https://ahxhkzstrfmdiecqqjdh.supabase.co
SUPABASE_SERVICE_KEY=<your_service_role_key_here>
FRONTEND_URL=http://localhost:5173
PORT=8000
```

### 4. Start the Backend

```bash
# From backend/ directory
python main.py

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000
```

Test it's working:
```bash
curl http://localhost:8000
# Should return: {"status":"Focus Path AI Backend is running","version":"1.0.0"}
```

### 5. Update Frontend Environment

The frontend is already configured to use `http://localhost:8000` for local development.

If you need to change it:
```bash
# Edit .env in project root
VITE_BACKEND_URL=http://localhost:8000
```

### 6. Start the Frontend

```bash
# From project root
npm run dev
```

### 7. Test Focus AI

1. Open browser to `http://localhost:5173`
2. Log in with your account
3. Navigate to "Focus AI" section
4. Try sending a message like:
   - "How can I improve my focus?"
   - "Analyze my recent progress"
   - "What are my productivity patterns?"

The AI will:
- Fetch your real session history from Supabase
- Analyze your focus patterns, distractions, completion rates
- Provide personalized advice based on YOUR data

## What Changed

### Before (Broken)
- Used Firebase Cloud Functions (not deployed/broken)
- No access to actual user session data
- Generic responses without context
- Error: "Failed to get AI response"

### After (Fixed)
- Python backend with fastapi-poe library
- Direct integration with Poe API
- Comprehensive user context from Supabase:
  - All focus sessions with completion rates
  - Distraction patterns and analysis
  - Focus scores and trends
  - Recent activity (last 7-30 days)
  - Streak information
- Personalized responses based on real productivity data
- Proper error handling with specific messages

## Deployment

### Backend Deployment Options

#### Option 1: Railway (Recommended)
1. Go to https://railway.app
2. Create new project from GitHub repo
3. Select `backend` folder as root directory
4. Add environment variables in Railway dashboard
5. Deploy automatically

#### Option 2: Render
1. Go to https://render.com
2. Create Web Service
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy

#### Option 3: Fly.io
```bash
cd backend
flyctl launch
flyctl secrets set POE_API_KEY=your_key
flyctl secrets set SUPABASE_URL=your_url
flyctl secrets set SUPABASE_SERVICE_KEY=your_key
flyctl deploy
```

### Update Frontend After Deployment

After deploying backend, update frontend `.env`:
```env
VITE_BACKEND_URL=https://your-backend-url.railway.app
```

Then rebuild and redeploy frontend.

## Troubleshooting

### Backend won't start
**Error**: `ModuleNotFoundError: No module named 'fastapi_poe'`
**Fix**: Run `pip install -r requirements.txt`

### "Failed to connect to AI service"
**Cause**: Backend not running or wrong URL
**Fix**:
1. Check backend is running: `curl http://localhost:8000`
2. Verify `VITE_BACKEND_URL` in frontend `.env`

### "Poe API key not configured"
**Cause**: Missing POE_API_KEY in backend `.env`
**Fix**: Add `POE_API_KEY=myOe2husQA-JfKATcqQE7cc3JiZDFiyqDIW7Asmjl3o`

### "Failed to connect to Supabase"
**Cause**: Wrong service key or URL
**Fix**:
1. Verify SUPABASE_URL in backend `.env`
2. Make sure using **service_role** key (not anon key)
3. Check key has no extra spaces

### "Daily message limit reached"
**Expected**: Free users have 20 messages/day
**Fix**: Upgrade to premium or wait for reset (midnight)

### AI responses are generic (not personalized)
**Cause**: User has no session history yet
**Fix**: Complete some focus sessions first, then AI will have data

### CORS errors in browser console
**Cause**: Frontend URL not in CORS whitelist
**Fix**: Add your frontend URL to `allow_origins` in `backend/main.py`

## Verifying It Works

### Check User Context
The backend logs show what context is being sent to AI:

```bash
# In backend terminal, you should see logs like:
INFO: Fetched user context for user abc123
INFO: User has 15 sessions, completion rate 87.5%
```

### Check Conversations Are Saved
Query Supabase to verify conversations are being stored:

```sql
SELECT * FROM momo_conversations WHERE user_id = 'your-user-id';
SELECT * FROM momo_messages WHERE user_id = 'your-user-id';
```

### Check Usage Tracking
Verify rate limiting is working:

```sql
SELECT * FROM momo_ai_usage WHERE user_id = 'your-user-id';
```

## Files Changed/Created

### New Files
- `backend/main.py` - FastAPI server with Poe integration
- `backend/supabase_service.py` - Supabase data fetching
- `backend/requirements.txt` - Python dependencies
- `backend/.env` - Backend configuration
- `backend/README.md` - Backend documentation
- `src/services/SupabaseMomoAIService.ts` - Frontend service
- `supabase/migrations/20251117200000_create_momo_ai_usage_tracking.sql` - Usage tracking table

### Modified Files
- `src/components/FocusAI/FocusAIChat.tsx` - Updated to use new service
- `.env` - Added VITE_BACKEND_URL
- `.env.example` - Added backend URL example

### Unchanged (No longer used)
- `src/services/PoeService.ts` - Old Firebase function approach
- `src/services/FirestoreChatService.ts` - Old Firebase storage
- `functions/index.js` - Firebase Cloud Function (still has other functions)

## Next Steps

1. Test with a user who has session history
2. Verify AI responses are personalized
3. Monitor Poe API usage and costs
4. Deploy backend to production
5. Update frontend environment for production
6. Set up monitoring and logging
7. Consider adding response streaming for real-time typing effect

## Support

If issues persist:
1. Check backend logs for errors
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Test Poe API key works: https://poe.com/api_key
5. Check Supabase tables exist and have data

## Cost Considerations

- **Poe API**: Charged per request
- **Supabase**: Free tier should be sufficient
- **Backend Hosting**: ~$5-10/month on Railway/Render

Monitor usage in:
- Poe dashboard
- Supabase dashboard > Database > momo_ai_usage table
- Backend hosting platform metrics
