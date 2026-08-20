from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone
from app.db.database import get_db
from app.memory.manager import MemoryManager
from app.ai.context import ContextManager
from app.ai.provider import AIProviderManager
import json

router = APIRouter(prefix="/api/chat")
memory_manager = MemoryManager()
context_manager = ContextManager()
ai_provider = AIProviderManager()

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str

@router.post("/")
async def chat(req: ChatRequest):
    message = req.message
    conv_id = req.conversation_id
    now = datetime.now(timezone.utc).isoformat()
    
    async with get_db() as db:
        if not conv_id:
            conv_id = str(uuid.uuid4())
            title = message[:50]
            await db.execute(
                "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (conv_id, title, now, now)
            )
        
        # Save user message
        user_msg_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)",
            (user_msg_id, conv_id, "user", message, now)
        )
        await db.commit()
    
    # Handle memory commands
    mem_cmd = memory_manager.detect_memory_command(message)
    if mem_cmd:
        # Simplistic handling - this can be expanded
        if mem_cmd["command"] == "store":
            await memory_manager.store("important_facts", "User requested memory", message)
            response_text = "I'll remember that for you."
        elif mem_cmd["command"] == "forget":
            response_text = "I've forgotten that."
        elif mem_cmd["command"] == "recall_all":
            mems = await memory_manager.get_all()
            response_text = "Here's what I remember:\n" + "\n".join([f"- {m['value']}" for m in mems])
    else:
        # Regular AI chat
        memories = await memory_manager.recall(message)
        context = await context_manager.build_context(conv_id, message, memories)
        response_text = await ai_provider.get_response(context)
        
    # Save AI response
    ai_msg_id = str(uuid.uuid4())
    now_ai = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)",
            (ai_msg_id, conv_id, "assistant", response_text, now_ai)
        )
        await db.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (now_ai, conv_id)
        )
        await db.commit()
        
    return {"response": response_text, "conversation_id": conv_id}
