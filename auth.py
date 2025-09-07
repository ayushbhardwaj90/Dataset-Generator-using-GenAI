import uuid
from typing import Optional


class SimpleAuth:
    def __init__(self):
        # In-memory user sessions (for now)
        self.sessions = {}
    
    def create_session(self, username: str) -> str:
        """Create a simple user session"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "username": username,
            "created_at": "2024-01-01"
        }
        return session_id
    
    def get_user(self, session_id: str) -> Optional[str]:
        """Get username from session"""
        if session_id in self.sessions:
            return self.sessions[session_id]["username"]
        return None

# Global auth instance
auth_system = SimpleAuth()