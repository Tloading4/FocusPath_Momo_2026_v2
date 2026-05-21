import os
import json
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
from dotenv import load_dotenv
from supabase_service import supabase_service

load_dotenv()

app = FastAPI(title="Focus Path AI Backend - MoMo v2")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ─── Request / Response Models ───────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    user_id: str
    conversation_id: Optional[str] = None
    user_context: Optional[Dict[str, Any]] = None
    conversation_history: Optional[List[Dict[str, str]]] = None

class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    remaining_messages: int

class PreSessionTipRequest(BaseModel):
    user_id: str
    session_type: str
    category: Optional[str] = None
    user_context: Optional[Dict[str, Any]] = None

class PreSessionTipResponse(BaseModel):
    tip: str

class PostSessionReflectionRequest(BaseModel):
    user_id: str
    session_data: Dict[str, Any]
    survey_data: Optional[Dict[str, Any]] = None
    user_context: Optional[Dict[str, Any]] = None

class PostSessionReflectionResponse(BaseModel):
    reflection: str
    next_step: str

class GenerateInsightsRequest(BaseModel):
    user_id: str
    user_context: Optional[Dict[str, Any]] = None

class GenerateInsightsResponse(BaseModel):
    insights: List[Dict[str, Any]]


# ─── Context Prompt Builder ───────────────────────────────────────────────────

def build_context_prompt(context: Dict[str, Any]) -> str:
    profile = context.get("profile", {})
    stats = context.get("statistics", {})
    recent = context.get("recentSessions", context.get("recent_sessions", []))
    survey_history = context.get("surveyHistory", [])
    current_time_str = context.get("currentTime", "")

    # Time-of-day context
    time_context = ""
    if current_time_str:
        try:
            dt = datetime.fromisoformat(current_time_str.replace("Z", "+00:00"))
            hour = dt.hour
            day = dt.strftime("%A")
            if hour < 6:
                tod = "very early morning"
            elif hour < 12:
                tod = "morning"
            elif hour < 17:
                tod = "afternoon"
            elif hour < 21:
                tod = "evening"
            else:
                tod = "night"
            time_context = f"Current time: {tod} on {day}"
        except Exception:
            pass

    # Learning-style instruction
    learning_style = profile.get("learningStyle", "")
    style_instruction = ""
    if learning_style == "visual":
        style_instruction = "This user is a VISUAL learner — use bullet points, structured lists, and concrete analogies."
    elif learning_style == "auditory":
        style_instruction = "This user is an AUDITORY learner — use a conversational tone and encourage verbal repetition."
    elif learning_style == "kinesthetic":
        style_instruction = "This user is a KINESTHETIC learner — focus on actionable steps and hands-on strategies."
    elif learning_style == "reading":
        style_instruction = "This user is a READING/WRITING learner — provide structured written recommendations and step-by-step lists."

    display_name = profile.get("displayName", profile.get("display_name", "Focus Warrior"))
    first_name = display_name.split()[0] if display_name else "Focus Warrior"

    goals = profile.get("studyGoals", profile.get("goals", []))
    if isinstance(goals, list):
        goals_str = ", ".join(goals) or "not set"
    else:
        goals_str = str(goals) or "not set"

    motivation = profile.get("motivationType", [])
    if isinstance(motivation, list):
        motivation_str = ", ".join(motivation) or "not set"
    else:
        motivation_str = str(motivation) or "not set"

    # Survey trend analysis
    survey_trend = ""
    if len(survey_history) >= 2:
        ratings = [sv.get("focus_rating") for sv in survey_history[:5] if sv.get("focus_rating") is not None]
        if len(ratings) >= 2:
            trend = "improving" if ratings[0] >= ratings[-1] else "declining"
            survey_trend = f"Focus rating trend (recent→older): {' → '.join(str(r) for r in ratings)} ({trend})"

    # Streak milestone awareness
    streak = profile.get("currentStreak", profile.get("current_streak", 0))
    streak_note = ""
    milestones = [3, 7, 14, 30, 60, 100]
    for m in milestones:
        if streak < m and (m - streak) <= 2:
            streak_note = f"Note: {first_name} is only {m - streak} day(s) away from a {m}-day streak milestone!"
            break

    study_habits = profile.get("studyHabits", {})

    prompt = f"""You are Momo, a warm and encouraging AI focus coach inside FocusPath. Your personality is supportive, data-driven, and brief — never preachy or generic.

KEY RULES:
- Always address the user by their first name: {first_name}
- Reference their ACTUAL data (specific numbers, scores, dates) — never give generic advice
- Keep responses under 150 words unless the user asks for more detail
- {style_instruction if style_instruction else "Adapt your tone to be motivating and personal"}
- Be specific: say "your last 3 sessions averaged 78% focus score" not "you've been doing well"
- If they have no session data yet, give encouraging beginner tips based on their learning style and goals
- Always close your response with one concrete next action
- NEVER use markdown formatting — no **, no ##, no ### headings, no bullet dashes, no bold, no italics. Write in plain conversational prose only.
- When suggesting a FocusPath feature, embed a clickable CTA using EXACTLY this format: [CTA:feature_id|Button label]
  Valid feature_ids: timer, challenges, analytics, progress, leaderboard, marketplace, history
  Example: "Ready to go? [CTA:timer|Start a session]" or "See how you rank [CTA:leaderboard|View leaderboard]"
- If the user asks what to do next, always include a [CTA:timer|Start a session] button
- Never output the raw brackets unless creating a real CTA — they will be rendered as buttons

FOCUSPATH FEATURES (you can direct users to any of these):
- Timer (timer): Start a timed focus session — Pomodoro, deep work, or custom length
- Quests (challenges): Daily and weekly challenges to earn XP and level up
- Analytics (analytics): Full session data, focus score history, survey trends
- Progress (progress): XP bar, streak tracker, performance insights over time
- Leaderboard (leaderboard): See how your focus score ranks against other users
- Marketplace (marketplace): Spend XP on rewards and unlockables
- History (history): Full log of every past session

USER PROFILE:
- Name: {display_name}
- Level: {profile.get("currentLevel", profile.get("level", 1))} | Total XP: {profile.get("totalXP", profile.get("total_xp", 0))}
- Current Streak: {streak} days | Longest: {profile.get("longestStreak", profile.get("longest_streak", 0))} days
{f"- {streak_note}" if streak_note else ""}- Learning Style: {learning_style or "not set"}
- Goals: {goals_str}
- Motivation Type: {motivation_str}
- Preferred Study Time: {profile.get("preferredStudyTime", study_habits.get("preferredStudyTime", "not set"))}
- Study Environment: {profile.get("studyEnvironment", study_habits.get("studyEnvironment", "not set"))}
{time_context}

FOCUS & WORK STYLE:
- Distraction Level: {profile.get("distractionLevel", study_habits.get("distractionLevel", "not set"))}
- Primary Distractions: {", ".join(profile.get("primaryDistractions", study_habits.get("primaryDistractions", []))) or "not set"}
- Break Frequency: every {profile.get("breakFrequency", study_habits.get("breakFrequency", "?"))} min
- Break Activity: {profile.get("breakActivity", study_habits.get("breakActivity", "not set"))}

PERFORMANCE STATISTICS:
- Total Sessions: {stats.get("totalSessions", stats.get("total_sessions", 0))} | Completed: {stats.get("completedSessions", stats.get("completed_sessions", 0))} ({stats.get("completionRate", stats.get("completion_rate", 0))}% completion rate)
- Average Focus Score: {stats.get("averageFocusScore", stats.get("avg_focus_score", 0))}/100
- Average Session Length: {stats.get("averageSessionLength", stats.get("avg_session_length_minutes", 0))} min
- Total Focus Time: {round(stats.get("totalFocusTime", stats.get("total_focus_time_minutes", 0)) / 60, 1)} hours
- Avg Distractions/Session: {stats.get("averageDistractionsPerSession", stats.get("avg_distractions_per_session", 0))}
- Sessions This Week: {stats.get("recentSessionsCount", stats.get("recent_7_days_sessions", 0))}
- Most Productive Time: {stats.get("mostProductiveTimeOfDay", "unknown")}

XP & GAMIFICATION:
- Current Level: {profile.get("currentLevel", profile.get("level", 1))} | XP: {profile.get("totalXP", profile.get("total_xp", 0))}
- Streak: {streak} days (longest: {profile.get("longestStreak", profile.get("longest_streak", 0))})
{f"- {streak_note}" if streak_note else ""}
ONGOING FEEDBACK:
{f"- Survey focus rating trend: {survey_trend}" if survey_trend else "- No survey trend data yet"}"""

    if recent:
        prompt += "\nRECENT SESSIONS (last 10):\n"
        for i, s in enumerate(recent[:10], 1):
            date_str = s.get("date", "")
            if date_str:
                try:
                    dt = datetime.fromisoformat(str(date_str).replace("Z", "+00:00").replace(" ", "T"))
                    date_str = dt.strftime("%b %d")
                except Exception:
                    pass
            score = s.get("focusScore", s.get("focus_score", s.get("analytics", {}).get("focusScore", 0)))
            prompt += (
                f"  {i}. {s.get('type', s.get('sessionType','?')).upper()} | "
                f"{s.get('duration', s.get('durationSeconds', 0) // 60 if s.get('durationSeconds') else 0)}min | "
                f"Score: {score}/100 | "
                f"Distractions: {s.get('distractions', s.get('analytics', {}).get('distractionCount', 0))} | "
                f"Category: {s.get('category', 'general')} | {date_str}\n"
            )

    if survey_history:
        prompt += "\nRECENT SURVEY RESPONSES (last 5):\n"
        for sv in survey_history[:5]:
            line = (
                f"  - Focus: {sv.get('focus_rating', '?')}/5 | "
                f"Energy: {sv.get('energy_level', '?')} | "
                f"Difficulty: {sv.get('difficulty_assessment', '?')} | "
                f"Would repeat: {sv.get('would_repeat', '?')}"
            )
            if sv.get("notes"):
                line += f' | Note: "{sv.get("notes")}"'
            prompt += line + "\n"

    return prompt


# ─── OpenAI Helper ────────────────────────────────────────────────────────────

async def call_openai(
    system_prompt: str,
    user_message: str,
    conversation_history: Optional[List[Dict]] = None,
    max_tokens: int = 400,
) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not configured")

    messages = [{"role": "system", "content": system_prompt}]
    if conversation_history:
        messages.extend(conversation_history[-10:])
    messages.append({"role": "user", "content": user_message})

    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.7,
    )
    return response.choices[0].message.content or ""


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "MoMo AI Backend running", "version": "2.0.0", "ai": "OpenAI gpt-4o-mini"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Prefer frontend-supplied Firebase context; fall back to Supabase
        context = request.user_context or await supabase_service.get_user_context(request.user_id)
        system_prompt = build_context_prompt(context)

        full_response = await call_openai(
            system_prompt=system_prompt,
            user_message=request.message,
            conversation_history=request.conversation_history,
            max_tokens=400,
        )

        if not full_response:
            full_response = "I'm here to help you with your focus journey! Could you tell me more about what's on your mind?"

        return ChatResponse(
            message=full_response,
            conversation_id=request.conversation_id or "",
            remaining_messages=20,
        )
    except Exception as e:
        print(f"Error in /api/chat: {e}")
        return ChatResponse(
            message="I had a moment — please try again! I'm here to help.",
            conversation_id=request.conversation_id or "",
            remaining_messages=20,
        )


@app.post("/api/pre-session-tip", response_model=PreSessionTipResponse)
async def pre_session_tip(request: PreSessionTipRequest):
    try:
        context = request.user_context or await supabase_service.get_user_context(request.user_id)
        system_prompt = build_context_prompt(context)

        profile = context.get("profile", {})
        first_name = profile.get("displayName", profile.get("display_name", "Focus Warrior")).split()[0]

        user_message = (
            f"I'm about to start a {request.session_type} focus session"
            + (f" on {request.category}" if request.category else "")
            + f". Give {first_name} a single personalized coaching tip (2-3 sentences max). "
            "Reference their specific data (streak, recent score, distraction patterns, or time of day). "
            "Tailor the format to their learning style. Be concrete and motivating."
        )

        tip = await call_openai(system_prompt, user_message, max_tokens=120)
        return PreSessionTipResponse(tip=tip or f"You've got this, {first_name}! One task at a time.")
    except Exception as e:
        print(f"Error in /api/pre-session-tip: {e}")
        profile = (request.user_context or {}).get("profile", {})
        name = profile.get("displayName", "Focus Warrior").split()[0]
        return PreSessionTipResponse(tip=f"You've got this, {name}! Stay focused and trust the process.")


@app.post("/api/post-session-reflection", response_model=PostSessionReflectionResponse)
async def post_session_reflection(request: PostSessionReflectionRequest):
    try:
        context = request.user_context or await supabase_service.get_user_context(request.user_id)
        system_prompt = build_context_prompt(context)

        s = request.session_data
        sv = request.survey_data or {}

        analytics = s.get("analytics", {})
        focus_score = s.get("focusScore", analytics.get("focusScore", 0))
        distractions = s.get("distractionCount", analytics.get("distractionCount", 0))

        session_summary = (
            f"Session just completed: {s.get('sessionType', s.get('sessionTypeName', '?'))} "
            f"({s.get('duration', 0)} min) | "
            f"Focus Score: {focus_score}/100 | "
            f"Distractions: {distractions} | "
            f"Completed: {s.get('completed', False)} | "
            f"Category: {s.get('category', 'general')}"
        )

        if sv:
            session_summary += (
                f"\nPost-session feedback — Focus rating: {sv.get('focus_rating', '?')}/5, "
                f"Energy: {sv.get('energy_level', '?')}, "
                f"Difficulty: {sv.get('difficulty_assessment', '?')}, "
                f"Would repeat: {sv.get('would_repeat', '?')}"
            )
            if sv.get("notes"):
                session_summary += f', Note: "{sv.get("notes")}"'

        user_message = (
            f"{session_summary}\n\n"
            "Write a personalized reflection (3-4 sentences) acknowledging what happened, "
            "referencing the actual numbers from this session. "
            "Then on a new line starting with 'NEXT STEP:', give ONE specific actionable next step "
            "tailored to their learning style and this session's data."
        )

        response_text = await call_openai(system_prompt, user_message, max_tokens=220)

        reflection = response_text
        next_step = "Keep building your momentum — schedule your next session!"

        if "NEXT STEP:" in response_text:
            parts = response_text.split("NEXT STEP:", 1)
            reflection = parts[0].strip()
            next_step = parts[1].strip()

        return PostSessionReflectionResponse(reflection=reflection, next_step=next_step)
    except Exception as e:
        print(f"Error in /api/post-session-reflection: {e}")
        return PostSessionReflectionResponse(
            reflection="Great effort on that session! Every session builds your focus muscle.",
            next_step="Take a short break, then try another session to keep your streak going.",
        )


@app.post("/api/generate-insights", response_model=GenerateInsightsResponse)
async def generate_insights(request: GenerateInsightsRequest):
    try:
        context = request.user_context or await supabase_service.get_user_context(request.user_id)
        system_prompt = build_context_prompt(context)

        user_message = """Analyze this user's focus data and generate exactly 3-5 personalized insights.
Return ONLY a valid JSON array — no other text, no markdown fences.
Format:
[
  {
    "type": "pattern|recommendation|achievement|alert",
    "title": "Short title (5-8 words)",
    "description": "2-3 sentences referencing specific data points from the user's actual stats",
    "priority": "low|medium|high",
    "action": "One specific action they can take (optional, can be empty string)"
  }
]
Reference actual numbers. Example insights:
- Pattern: "You focus 23% better in morning sessions than afternoon"
- Recommendation: "Your kinesthetic style suggests adding practice problems to study sessions"
- Achievement: "You've hit a 7-day streak — your longest this month"
- Alert: "Distractions increased in your last 3 sessions — try the 2-minute rule before starting"
If the user has no session data, give beginner onboarding insights based on their profile."""

        response_text = await call_openai(system_prompt, user_message, max_tokens=700)

        insights = []
        try:
            start = response_text.find("[")
            end = response_text.rfind("]") + 1
            if start != -1 and end > start:
                insights = json.loads(response_text[start:end])
        except json.JSONDecodeError:
            print(f"Failed to parse insights JSON: {response_text}")

        if not insights:
            insights = [
                {
                    "type": "recommendation",
                    "title": "Complete sessions to unlock insights",
                    "description": "Momo needs a few sessions to start identifying your patterns and giving you personalized advice.",
                    "priority": "medium",
                    "action": "Complete 3 focus sessions to see your first personalized insights.",
                }
            ]

        return GenerateInsightsResponse(insights=insights)
    except Exception as e:
        print(f"Error in /api/generate-insights: {e}")
        return GenerateInsightsResponse(
            insights=[
                {
                    "type": "recommendation",
                    "title": "Start building your focus data",
                    "description": "Complete more sessions to unlock personalized insights from Momo.",
                    "priority": "medium",
                    "action": "Complete 5 sessions to see your first detailed insights.",
                }
            ]
        )


# Kept for backwards compatibility — conversations now stored in Firebase
@app.get("/api/conversations/{user_id}")
async def get_conversations(_user_id: str):
    return {"conversations": []}


@app.get("/api/usage/{user_id}")
async def get_usage(_user_id: str):
    # Usage tracked in Firebase by frontend
    return {"allowed": True, "remaining": 20, "limit": 20, "is_premium": False}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
