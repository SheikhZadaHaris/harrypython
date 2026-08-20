from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone
from app.db.database import get_db

router = APIRouter(prefix="/api/tasks")

class TaskCreate(BaseModel):
    title: str
    due_date: Optional[str] = None

@router.get("/")
async def list_tasks():
    async with get_db() as db:
        async with db.execute("SELECT * FROM tasks ORDER BY created_at DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

@router.post("/")
async def create_task(task: TaskCreate):
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO tasks (id, title, completed, due_date, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)",
            (task_id, task.title, task.due_date, now, now)
        )
        await db.commit()
    return {"id": task_id, "title": task.title, "completed": False, "due_date": task.due_date}

@router.delete("/{id}")
async def delete_task(id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM tasks WHERE id = ?", (id,))
        await db.commit()
    return {"status": "success"}

@router.patch("/{id}/toggle")
async def toggle_task(id: str):
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        async with db.execute("SELECT completed FROM tasks WHERE id = ?", (id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                new_status = not row["completed"]
                await db.execute("UPDATE tasks SET completed = ?, updated_at = ? WHERE id = ?", (new_status, now, id))
                await db.commit()
                return {"status": "success", "completed": new_status}
    return {"status": "not found"}
