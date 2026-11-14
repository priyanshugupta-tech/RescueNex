import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_db
from app.api.endpoints import router as api_router
from app.services.ml_service import ml_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB Atlas and verify ML weights
    print("\n=======================================================")
    print("🏔️ Starting RescueNex AI Inference Microservice")
    print(f"📡 Serving on port {settings.PORT}")
    print("=======================================================")
    connect_db()
    if not ml_service.is_loaded:
        ml_service.load_models()
    yield
    print("\n[AI Engine] Microservice shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="High-precision ML Early Warning Engine for Landslide Susceptibility, LSI Regression & Tertiary Creep Failure Prediction in Mountain Corridors.",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {
        "status": "HEALTHY",
        "modelsLoaded": ml_service.is_loaded,
        "service": "RescueNex AI Early Warning Engine"
    }

@app.get("/")
async def root():
    return {
        "service": "RescueNex AI Early Warning Microservice",
        "version": settings.VERSION,
        "docsUrl": "/docs",
        "healthUrl": "/api/v1/health",
        "status": "OPERATIONAL"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=False)
