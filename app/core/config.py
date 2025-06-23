from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SERVER_IP: str
    CLIENT_IP: str
    SSH_USERNAME: str
    SSH_KEY_PATH: str

    class Config:
        env_file = ".env"

settings = Settings()
