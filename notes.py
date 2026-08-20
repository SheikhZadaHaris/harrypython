from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone
from app.db.database import get_db

router = APIRouter(prefix="/api/notes")

class NoteCreate(BaseModel):
    title: str
    content: str

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

@router.get("/")
async def list_notes():
    async with get_db() as db:
        async with db.execute("SELECT * FROM notes ORDER BY updated_at DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

@router.post("/")
async def create_note(note: NoteCreate):
    note_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (note_id, note.title, note.content, now, now)
        )
        await db.commit()
    return {"id": note_id, "title": note.title, "content": note.content}

@router.get("/search")
async def search_notes(q: str):
    async with get_db() as db:
        async with db.execute(
            "SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC",
            (f"%{q}%", f"%{q}%")
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

@router.put("/{id}")
async def update_note(id: str, note: NoteUpdate):
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        if note.title is not None:
            await db.execute("UPDATE notes SET title = ?, updated_at = ? WHERE id = ?", (note.title, now, id))
        if note.content is not None:
            await db.execute("UPDATE notes SET content = ?, updated_at = ? WHERE id = ?", (note.content, now, id))
        await db.commit()
    return {"status": "success"}

@router.delete("/{id}")
async def delete_note(id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM notes WHERE id = ?", (id,))
        await db.commit()
    return {"status": "success"}

