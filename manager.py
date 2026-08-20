import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional
from app.db.database import get_db
import re

class MemoryManager:
    async def store(self, type: str, key: str, value: str) -> Dict:
        memory_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        async with get_db() as db:
            await db.execute(
                "INSERT OR REPLACE INTO memory (id, type, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (memory_id, type, key, value, now, now)
            )
            await db.commit()
            
        return {"id": memory_id, "type": type, "key": key, "value": value}

    async def recall(self, query: str) -> List[Dict]:
        async with get_db() as db:
            async with db.execute(
                "SELECT * FROM memory WHERE key LIKE ? OR value LIKE ?",
                (f"%{query}%", f"%{query}%")
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def forget(self, key: str) -> bool:
        async with get_db() as db:
            cursor = await db.execute("DELETE FROM memory WHERE key = ?", (key,))
            await db.commit()
            return cursor.rowcount > 0

    async def get_all(self) -> List[Dict]:
        async with get_db() as db:
            async with db.execute("SELECT * FROM memory") as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def get_profile(self) -> List[Dict]:
        async with get_db() as db:
            async with db.execute("SELECT * FROM memory WHERE type = 'user_profile'") as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    def detect_memory_command(self, message: str) -> Optional[Dict]:
        message = message.lower()
        if "remember this" in message or "remember that" in message:
            return {"command": "store"}
        elif "forget" in message:
            return {"command": "forget"}
        elif "what do you remember" in message:
            return {"command": "recall_all"}
        return None
