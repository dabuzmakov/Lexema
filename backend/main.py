from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ALLOW_ORIGINS
from database import lifespan
from routers.analysis import router as analysis_router
from routers.app_state import router as app_state_router
from routers.documents import router as documents_router
from routers.export import router as export_router
from routers.health import router as health_router
from routers.settings import router as settings_router


def create_app() -> FastAPI:
    app = FastAPI(title="Лексема API", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ALLOW_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(app_state_router)
    app.include_router(documents_router)
    app.include_router(settings_router)
    app.include_router(analysis_router)
    app.include_router(export_router)
    return app


app = create_app()
