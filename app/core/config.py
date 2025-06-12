from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SERVER_IP: str = "3.238.53.158"
    CLIENT_IP: str = "44.249.23.125"
    SSH_USERNAME: str = "ubuntu"
    SSH_KEY_PATH: str = "/Users/ashwjosh/vibecode.pem"

    class Config:
        env_file = ".env"

settings = Settings()