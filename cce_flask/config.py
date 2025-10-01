import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # cyperf-ce API Configuration
    # Use environment variable first, then fall back to container networking if in container
    CYPERF_API_BASE_URL = os.environ.get('CYPERF_API_BASE_URL') or (
        'http://fastapi:8000/api' if os.environ.get('FLASK_ENV') == 'production' 
        else 'http://localhost:8000/api'
    )
    CYPERF_API_TIMEOUT = int(os.environ.get('CYPERF_API_TIMEOUT', '30'))
    
    # Test Configuration Defaults
    DEFAULT_TEST_DURATION = int(os.environ.get('DEFAULT_TEST_DURATION', '60'))
    DEFAULT_SNAPSHOT_INTERVAL = int(os.environ.get('DEFAULT_SNAPSHOT_INTERVAL', '5'))
    DEFAULT_SERVER_IP = os.environ.get('DEFAULT_SERVER_IP', '127.0.0.1')
    DEFAULT_CLIENT_IP = os.environ.get('DEFAULT_CLIENT_IP', '127.0.0.1')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
