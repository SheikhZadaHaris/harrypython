from typing import List, Dict
from app.ai.prompts import SYSTEM_PROMPT
from app.db.database import get_db

class ContextManager:
    async def build_context(self, conversation_id: str, new_message: str, memories: List[Dict]) -> List[Dict]:
        memory_text = "\n".join([f"- {m['key']}: {m['value']}" for m in memories]) if memories else "No relevant memories."
        system_content = SYSTEM_PROMPT.format(memory_context=f"Known Facts/Memories:\n{memory_text}")
        
        context_messages = [{"role": "system", "content": system_content}]
        
        if conversation_id:
            async with get_db() as db:
                async with db.execute(
                    "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT 10",
                    (conversation_id,)
                ) as cursor:
                    rows = await cursor.fetchall()
                    # Reverse to chronological order
                    for row in reversed(rows):
                        context_messages.append({"role": row["role"], "content": row["content"]})
        
        context_messages.append({"role": "user", "content": new_message})
        return context_messages
