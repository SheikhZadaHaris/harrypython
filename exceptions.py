from fastapi import Request, status
from fastapi.responses import JSONResponse

class AIProviderError(Exception):
    def __init__(self, message: str):
        self.message = message

class MemoryManagerError(Exception):
    def __init__(self, message: str):
        self.message = message

class FileProcessingError(Exception):
    def __init__(self, message: str):
        self.message = message

async def ai_provider_exception_handler(request: Request, exc: AIProviderError):
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"detail": exc.message}
    )

async def memory_exception_handler(request: Request, exc: MemoryManagerError):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": exc.message}
    )

async def file_processing_exception_handler(request: Request, exc: FileProcessingError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message}
    )
