from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    SERVER_IP: str
    CLIENT_IP: str
    SSH_USERNAME: str
    SSH_KEY_PATH: str
    SSH_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
