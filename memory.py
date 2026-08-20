from fastapi import APIRouter
from pydantic import BaseModel
from app.memory.manager import MemoryManager

router = APIRouter(prefix="/api/memory")
manager = MemoryManager()

class StoreMemoryRequest(BaseModel):
    type: str
    key: str
    value: str

@router.get("/")
async def list_memories():
    return await manager.get_all()

@router.post("/")
async def store_memory(req: StoreMemoryRequest):
    return await manager.store(req.type, req.key, req.value)

@router.delete("/{id}")
async def delete_memory(id: str):
    from app.db.database import get_db
    async with get_db() as db:
        await db.execute("DELETE FROM memory WHERE id = ?", (id,))
        await db.commit()
    return {"status": "success"}
