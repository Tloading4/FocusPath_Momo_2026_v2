# Focus Path AI Backend

Python FastAPI backend service that powers the MoMo AI Focus Coach using Poe API and Supabase.

## Features

- **Poe API Integration**: Connects to custom "momo.ai-focuspath" bot on Poe
- **User Context Building**: Fetches comprehensive focus session history from Supabase
- **Personalized Coaching**: AI receives real user data for tailored productivity advice
- **Rate Limiting**: Enforces 20 messages/day for free users, unlimited for premium
- **Conversation Storage**: All chats saved in Supabase for history and continuity
- **CORS Enabled**: Configured for frontend communication

## Prerequisites

- Python 3.9+
- Supabase account with database set up
- Poe API key with access to "momo.ai-focuspath" bot

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
POE_API_KEY=myOe2husQA-JfKATcqQE7cc3JiZDFiyqDIW7Asmjl3o
SUPABASE_URL=https://ahxhkzstrfmdiecqqjdh.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
FRONTEND_URL=http://localhost:5173
PORT=8000
```

**Important**: Use the Supabase **service role key** (not anon key) for backend operations.

### 3. Run Migrations

Make sure all Supabase migrations are applied:

```bash
# The following tables must exist:
- user_profiles
- focus_sessions
- distractions
- momo_conversations
- momo_messages
- momo_ai_usage
```

### 4. Start the Server

```bash
python main.py
```

Or with uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /
```
Returns server status.

### Send Chat Message
```
POST /api/chat
```
Request body:
```json
{
  "message": "How can I improve my focus?",
  "user_id": "uuid",
  "conversation_id": "uuid (optional)"
}
```

Response:
```json
{
  "message": "AI response text",
  "conversation_id": "uuid",
  "remaining_messages": 19
}
```

### Get User Conversations
```
GET /api/conversations/{user_id}
```

### Get Conversation Messages
```
GET /api/conversations/{conversation_id}/messages?user_id={user_id}
```

### Get Usage Info
```
GET /api/usage/{user_id}
```

## User Context

The AI receives comprehensive context about each user:

- **Profile Data**: Level, XP, streaks, display name
- **Session Statistics**: Total sessions, completion rate, avg session length
- **Focus Metrics**: Average focus score, distraction patterns
- **Recent Activity**: Last 5 sessions with details
- **Distraction Analysis**: Most common distraction types

This allows the AI to provide personalized, data-driven coaching.

## Deployment

### Option 1: Railway

1. Create new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add environment variables in Railway dashboard
4. Deploy automatically from `main` branch

### Option 2: Render

1. Create new Web Service on [Render](https://render.com)
2. Connect repository
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables

### Option 3: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app
flyctl launch

# Set secrets
flyctl secrets set POE_API_KEY=your_key
flyctl secrets set SUPABASE_URL=your_url
flyctl secrets set SUPABASE_SERVICE_KEY=your_key

# Deploy
flyctl deploy
```

### Update Frontend

After deployment, update `.env` in the frontend:

```env
VITE_BACKEND_URL=https://your-backend-url.com
```

## Development

### Testing Locally

1. Start backend: `python main.py`
2. Start frontend: `npm run dev`
3. Test chat functionality in Focus AI screen

### Debugging

Check logs for errors:
```bash
# View real-time logs
tail -f logs/backend.log

# Or check console output
python main.py
```

### Common Issues

**"Poe API key not configured"**
- Check `.env` file has `POE_API_KEY` set
- Verify the key is valid on poe.com

**"Failed to connect to Supabase"**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Check that migrations are applied
- Ensure RLS policies allow service role access

**"CORS errors"**
- Update `FRONTEND_URL` in `.env`
- Add your production domain to CORS origins in `main.py`

## Security Notes

- Never commit `.env` file to git
- Use service role key only in backend (never expose to frontend)
- Implement rate limiting to prevent abuse
- Monitor Poe API usage and costs
- Keep dependencies updated

## Performance

- Consider adding caching for user context (Redis)
- Implement connection pooling for Supabase
- Add request queuing for high traffic
- Monitor response times and optimize queries

## License

MIT
