import logging
from pymongo import MongoClient
from app.core.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: MongoClient = None
    db = None

db_instance = Database()

def connect_db():
    if not settings.MONGODB_URI:
        logger.info("ℹ️ MONGODB_URI not set. Skipping MongoDB Atlas connection for AI Engine.")
        return
    try:
        db_instance.client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000
        )
        # Test connection
        db_instance.client.admin.command('ping')
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        logger.info(f" Connected to MongoDB Atlas ({settings.DATABASE_NAME}) for AI inference logging.")
    except Exception as e:
        logger.error(f" Failed to connect to MongoDB Atlas: {e}")
        db_instance.client = None
        db_instance.db = None

def get_db():
    return db_instance.db

def log_prediction_to_db(prediction_data: dict) -> bool:
    if db_instance.db is not None:
        try:
            db_instance.db.ai_inferences.insert_one(prediction_data)
            return True
        except Exception as e:
            logger.warn(f"Failed to log AI inference to MongoDB: {e}")
    return False
