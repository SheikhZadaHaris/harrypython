from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os

from app.db.database import init_db
from app.core.exceptions import (
    AIProviderError, MemoryManagerError, FileProcessingError,
    ai_provider_exception_handler, memory_exception_handler, file_processing_exception_handler
)
from app.api import conversations, memory, notes, tasks, files, tools, chat

app = FastAPI(
    title="HARRY",
    description="Voice-first web assistant"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(AIProviderError, ai_provider_exception_handler)
app.add_exception_handler(MemoryManagerError, memory_exception_handler)
app.add_exception_handler(FileProcessingError, file_processing_exception_handler)

# Include Routers
app.include_router(conversations.router)
app.include_router(memory.router)
app.include_router(notes.router)
app.include_router(tasks.router)
app.include_router(files.router)
app.include_router(tools.router)
app.include_router(chat.router)

# Mount static files and templates (assuming they exist or will be created)
# Ensure directories exist
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/", response_class=HTMLResponse)
async def root():
    # Attempt to read index.html from templates if it exists
    index_path = os.path.join("templates", "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Welcome to HARRY</h1><p>Frontend not found.</p>"

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "HARRY backend"}
