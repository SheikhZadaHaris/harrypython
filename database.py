import os
import aiosqlite
from contextlib import asynccontextmanager
from app.core.config import settings

@asynccontextmanager
async def get_db():
    db = await aiosqlite.connect(settings.DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()

async def init_db():
    os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
    async with get_db() as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT,
                role TEXT,
                content TEXT,
                timestamp TEXT,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS memory (
                id TEXT PRIMARY KEY,
                type TEXT,
                key TEXT,
                value TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT,
                content TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT,
                completed BOOLEAN DEFAULT 0,
                due_date TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        await db.commit()
