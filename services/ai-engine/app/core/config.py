import os
from dotenv import load_dotenv

# Search for root .env or local .env
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
env_path = os.path.join(root_dir, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

class Settings:
    PROJECT_NAME: str = "RescueNex AI Engine"
    VERSION: str = "1.0.0"
    PORT: int = int(os.getenv("AI_ENGINE_PORT", 8000))
    HOST: str = "0.0.0.0"
    
    # MongoDB Atlas
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    DATABASE_NAME: str = "rescuenex"
    
    # Path to saved weights
    WEIGHTS_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models', 'weights'))

settings = Settings()
