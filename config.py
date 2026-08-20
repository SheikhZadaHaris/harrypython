import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    OPENCODE_API_KEY: str = ""
    PRIMARY_MODEL: str = "mimo-v2.5-free"
    DB_PATH: str = "data/harry.db"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
