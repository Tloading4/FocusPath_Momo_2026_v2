# Poe API Integration Guide

This document explains the Poe API chatbot integration in Focus Path.

## Overview

Focus Path now features an intelligent AI coach powered by Poe API that provides personalized productivity advice, focus coaching, and behavioral insights based on your usage patterns.

## Architecture

### Backend (Firebase Functions)

**Function: `chatWithPoe`**
- Located in `functions/index.js`
- Handles secure communication with Poe API
- Implements usage tracking and rate limiting
- Stores conversations in Firestore
- Provides context-aware responses using user data

### Frontend Services

**PoeService** (`src/services/PoeService.ts`)
- Client-side service for calling Firebase Cloud Function
- Builds user context from session data
- Handles error states and user feedback

**FirestoreChatService** (`src/services/FirestoreChatService.ts`)
- Manages conversation history in Firestore
- Provides real-time message syncing
- Handles conversation export and deletion

### UI Component

**PoeEnhancedFocusAI** (`src/components/FocusAI/PoeEnhancedFocusAI.tsx`)
- Beautiful chat interface with glassmorphism design
- Conversation management (create, switch, delete)
- Usage limit display
- Quick prompt suggestions
- Message export functionality

## Setup Instructions

### 1. Configure Poe API Key

The API key is already set in `.env`:
```
VITE_POE_API_KEY=myOe2husQA-JfKATcqQE7cc3JiZDFiyqDIW7Asmjl3o
```

### 2. Deploy Firebase Functions

```bash
# Set the Poe API key in Firebase config
firebase functions:config:set poe.api_key="myOe2husQA-JfKATcqQE7cc3JiZDFiyqDIW7Asmjl3o"

# Deploy the functions
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 3. Deploy Firestore Rules

The security rules are already updated in `firestore.rules`. Deploy them:

```bash
firebase deploy --only firestore:rules
```

## Database Schema

### Collections

**chatConversations**
```
{
  userId: string,
  title: string,
  createdAt: timestamp,
  lastMessageAt: timestamp,
  messageCount: number
}
```

**chatConversations/{conversationId}/messages**
```
{
  role: 'user' | 'assistant',
  content: string,
  timestamp: timestamp
}
```

**poeUsageTracking**
```
{
  messageCount: number,
  resetDate: string (YYYY-MM-DD)
}
```

## Usage Limits

- **Free Tier**: 20 messages per day (resets at midnight)
- **Premium Tier**: Unlimited messages

Usage is tracked per user and resets daily. The Firebase Function automatically checks and enforces these limits.

## User Context

The AI coach receives context about the user to provide personalized advice:
- Current level and XP
- Streak count
- Total sessions completed
- Average session length
- Focus score
- Recent distraction count

This context allows the AI to give specific, actionable recommendations tailored to each user's productivity patterns.

## Features

1. **Intelligent Coaching**: Real AI responses powered by Poe's language models
2. **Conversation History**: All chats saved in Firestore with real-time sync
3. **Quick Prompts**: Pre-built prompts for common questions
4. **Usage Tracking**: Visual display of remaining daily messages
5. **Export Functionality**: Download conversations as markdown files
6. **Multi-Conversation**: Create and switch between multiple chat threads
7. **Context-Aware**: AI understands your focus patterns and provides personalized advice

## Testing

To test the integration:

1. Log in to the app
2. Navigate to the Focus AI section
3. Try sending a message like "How can I improve my focus?"
4. The AI should respond with personalized advice based on your data
5. Check that conversations are saved and can be accessed later

## Troubleshooting

### "Poe API not configured" error
- Ensure the Firebase Function config is set: `firebase functions:config:get`
- Redeploy functions if needed: `firebase deploy --only functions`

### "Daily message limit reached" error
- Free users have a 20 message/day limit
- Upgrade to premium for unlimited messages
- Limit resets at midnight (server time)

### Messages not saving
- Check Firestore security rules are deployed
- Verify user is authenticated
- Check browser console for errors

### AI responses are generic
- Ensure user has completed some sessions (for better context)
- Check that user profile data is properly loaded
- Context is built from actual usage data

## API Costs

Poe API usage is charged based on the number of API calls. Monitor usage in:
- Firebase Functions logs
- Poe API dashboard
- Firestore `poeUsageTracking` collection

Consider implementing additional cost controls for production deployment.

## Future Enhancements

- Streaming responses for real-time typing effect
- Voice input/output
- Image generation for motivational content
- Integration with focus timer for in-session coaching
- Multi-language support
- Custom AI personality settings
