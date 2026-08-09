from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parents[1]
DIST_DIR = BASE_DIR / "frontend" / "dist"

app = FastAPI(
    title="Eteria RPG API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "capacitor://localhost",
        "https://localhost",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "eteria-rpg"}


@app.get("/api/game-config")
def game_config() -> dict[str, object]:
    return {
        "name": "Eteria: Fragmentos del Eclipse",
        "version": "1.0.0",
        "platforms": ["web", "android"],
        "features": [
            "threejs-3d",
            "touch-controls",
            "combat",
            "quests",
            "local-save",
            "pwa",
        ],
    }


@app.get("/api/runtime")
def runtime() -> dict[str, str]:
    return {
        "environment": os.getenv("RENDER", "local"),
        "frontend": "built" if DIST_DIR.exists() else "missing",
    }


if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
else:
    @app.get("/")
    def missing_frontend() -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={
                "message": "Frontend no compilado. Ejecuta: cd frontend && npm install && npm run build",
            },
        )
