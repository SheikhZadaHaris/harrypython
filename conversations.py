from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone
from app.db.database import get_db

router = APIRouter(prefix="/api/conversations")

class RenameRequest(BaseModel):
    title: str

@router.get("/")
async def list_conversations():
    async with get_db() as db:
        async with db.execute("SELECT * FROM conversations ORDER BY updated_at DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

@router.post("/")
async def create_conversation():
    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (conv_id, "New Chat", now, now)
        )
        await db.commit()
    return {"id": conv_id, "title": "New Chat", "created_at": now, "updated_at": now}

@router.get("/{id}")
async def get_conversation(id: str):
    async with get_db() as db:
        async with db.execute("SELECT * FROM conversations WHERE id = ?", (id,)) as cursor:
            conv = await cursor.fetchone()
            if not conv:
                raise HTTPException(status_code=404, detail="Conversation not found")
        
        async with db.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC", (id,)) as cursor:
            msgs = await cursor.fetchall()
            
        result = dict(conv)
        result["messages"] = [dict(m) for m in msgs]
        return result

@router.put("/{id}")
async def rename_conversation(id: str, req: RenameRequest):
    async with get_db() as db:
        await db.execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", 
                         (req.title, datetime.now(timezone.utc).isoformat(), id))
        await db.commit()
    return {"status": "success"}

@router.delete("/{id}")
async def delete_conversation(id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM conversations WHERE id = ?", (id,))
        await db.commit()
    return {"status": "success"}
