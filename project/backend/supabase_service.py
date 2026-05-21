import os
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class SupabaseService:
    def __init__(self):
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self.client: Optional[Client] = None
        if url and key:
            try:
                self.client = create_client(url, key)
                print("Supabase connected")
            except Exception as e:
                print(f"Supabase unavailable (running without it): {e}")

    async def get_user_context(self, user_id: str) -> Dict[str, Any]:
        if not self.client:
            return self._get_default_context(user_id)
        try:
            profile_data = self.client.table("user_profiles").select("*").eq("id", user_id).maybe_single().execute()
            profile = profile_data.data if profile_data.data else {}

            sessions_data = self.client.table("focus_sessions").select("*").eq("user_id", user_id).order("start_time", desc=True).limit(30).execute()
            sessions = sessions_data.data if sessions_data.data else []

            distractions_query = self.client.table("distractions").select("*").eq("user_id", user_id).order("timestamp", desc=True).limit(100).execute()
            distractions = distractions_query.data if distractions_query.data else []

            total_sessions = len(sessions)
            completed_sessions = len([s for s in sessions if s.get("completed", False)])
            completion_rate = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0

            total_distraction_count = sum(s.get("distraction_count", 0) for s in sessions)
            avg_distractions = total_distraction_count / total_sessions if total_sessions > 0 else 0

            focus_scores = [s.get("focus_score", 0) for s in sessions if s.get("focus_score") is not None]
            avg_focus_score = sum(focus_scores) / len(focus_scores) if focus_scores else 100

            total_minutes = sum(s.get("duration_actual", 0) for s in sessions)
            avg_session_length = total_minutes / total_sessions if total_sessions > 0 else 0

            recent_7_days = [s for s in sessions if self._is_recent_session(s, 7)]

            context = {
                "user_id": user_id,
                "profile": {
                    "display_name": profile.get("display_name", "Focus Warrior"),
                    "level": profile.get("current_level", 1),
                    "total_xp": profile.get("total_xp", 0),
                    "current_streak": profile.get("current_streak", 0),
                    "longest_streak": profile.get("longest_streak", 0),
                },
                "statistics": {
                    "total_sessions": total_sessions,
                    "completed_sessions": completed_sessions,
                    "completion_rate": round(completion_rate, 1),
                    "avg_session_length_minutes": round(avg_session_length, 1),
                    "avg_focus_score": round(avg_focus_score, 1),
                    "avg_distractions_per_session": round(avg_distractions, 1),
                    "total_focus_time_minutes": total_minutes,
                    "recent_7_days_sessions": len(recent_7_days),
                },
                "recent_sessions": [self._format_session(s) for s in sessions[:5]],
                "distraction_patterns": self._analyze_distractions(distractions),
            }

            return context
        except Exception as e:
            print(f"Error fetching user context: {e}")
            return self._get_default_context(user_id)

    def _is_recent_session(self, session: Dict, days: int) -> bool:
        try:
            start_time_str = session.get("start_time")
            if not start_time_str:
                return False
            start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
            cutoff = datetime.now() - timedelta(days=days)
            return start_time >= cutoff
        except:
            return False

    def _format_session(self, session: Dict) -> Dict:
        return {
            "type": session.get("session_type", "unknown"),
            "duration": session.get("duration_actual", 0),
            "completed": session.get("completed", False),
            "focus_score": session.get("focus_score", 0),
            "distractions": session.get("distraction_count", 0),
            "category": session.get("category", "general"),
            "date": session.get("start_time", ""),
        }

    def _analyze_distractions(self, distractions: List[Dict]) -> Dict:
        if not distractions:
            return {"total": 0, "common_types": []}

        distraction_types = {}
        for d in distractions:
            dtype = d.get("distraction_type", "unknown")
            distraction_types[dtype] = distraction_types.get(dtype, 0) + 1

        sorted_types = sorted(distraction_types.items(), key=lambda x: x[1], reverse=True)

        return {
            "total": len(distractions),
            "common_types": [{"type": k, "count": v} for k, v in sorted_types[:3]],
        }

    def _get_default_context(self, user_id: str) -> Dict:
        return {
            "user_id": user_id,
            "profile": {
                "display_name": "Focus Warrior",
                "level": 1,
                "total_xp": 0,
                "current_streak": 0,
                "longest_streak": 0,
            },
            "statistics": {
                "total_sessions": 0,
                "completed_sessions": 0,
                "completion_rate": 0,
                "avg_session_length_minutes": 0,
                "avg_focus_score": 100,
                "avg_distractions_per_session": 0,
                "total_focus_time_minutes": 0,
                "recent_7_days_sessions": 0,
            },
            "recent_sessions": [],
            "distraction_patterns": {"total": 0, "common_types": []},
        }

    async def save_conversation(self, user_id: str, title: str, metadata: Optional[Dict] = None) -> str:
        try:
            result = self.client.table("momo_conversations").insert({
                "user_id": user_id,
                "title": title,
                "personality_mode": "coach",
                "is_active": True,
                "last_message_at": datetime.utcnow().isoformat(),
                "metadata": metadata or {},
            }).execute()

            return result.data[0]["id"] if result.data else None
        except Exception as e:
            print(f"Error saving conversation: {e}")
            return None

    async def save_message(self, conversation_id: str, user_id: str, role: str, content: str, context_data: Optional[Dict] = None) -> bool:
        try:
            self.client.table("momo_messages").insert({
                "conversation_id": conversation_id,
                "user_id": user_id,
                "role": role,
                "content": content,
                "context_data": context_data or {},
                "tokens_used": 0,
            }).execute()

            self.client.table("momo_conversations").update({
                "last_message_at": datetime.utcnow().isoformat(),
            }).eq("id", conversation_id).execute()

            return True
        except Exception as e:
            print(f"Error saving message: {e}")
            return False

    async def get_conversation_messages(self, conversation_id: str, user_id: str, limit: int = 50) -> List[Dict]:
        try:
            result = self.client.table("momo_messages").select("*").eq("conversation_id", conversation_id).eq("user_id", user_id).order("created_at", desc=False).limit(limit).execute()

            return result.data if result.data else []
        except Exception as e:
            print(f"Error fetching conversation messages: {e}")
            return []

    async def get_user_conversations(self, user_id: str, limit: int = 20) -> List[Dict]:
        try:
            result = self.client.table("momo_conversations").select("*").eq("user_id", user_id).order("last_message_at", desc=True).limit(limit).execute()

            return result.data if result.data else []
        except Exception as e:
            print(f"Error fetching conversations: {e}")
            return []

    async def check_usage_limit(self, user_id: str) -> Dict[str, Any]:
        try:
            profile = self.client.table("user_profiles").select("preferences").eq("id", user_id).maybe_single().execute()

            is_premium = False
            if profile.data and profile.data.get("preferences"):
                is_premium = profile.data["preferences"].get("subscription_active", False)

            today = datetime.utcnow().date().isoformat()

            usage_table = "momo_ai_usage"
            try:
                usage = self.client.table(usage_table).select("*").eq("user_id", user_id).eq("date", today).maybe_single().execute()
            except:
                self.client.table(usage_table).insert({
                    "user_id": user_id,
                    "date": today,
                    "message_count": 0,
                }).execute()
                usage = self.client.table(usage_table).select("*").eq("user_id", user_id).eq("date", today).maybe_single().execute()

            message_count = usage.data.get("message_count", 0) if usage.data else 0
            limit = 999999 if is_premium else 20
            remaining = max(0, limit - message_count)

            return {
                "allowed": remaining > 0,
                "remaining": remaining,
                "limit": limit,
                "is_premium": is_premium,
            }
        except Exception as e:
            print(f"Error checking usage limit: {e}")
            return {"allowed": True, "remaining": 20, "limit": 20, "is_premium": False}

    async def increment_usage(self, user_id: str) -> bool:
        try:
            today = datetime.utcnow().date().isoformat()

            usage_table = "momo_ai_usage"
            self.client.table(usage_table).upsert({
                "user_id": user_id,
                "date": today,
                "message_count": 1,
            }).execute()

            return True
        except Exception as e:
            print(f"Error incrementing usage: {e}")
            return False

supabase_service = SupabaseService()
