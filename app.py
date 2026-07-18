"""
Basics4AI — Tic-Tac-Toe Expert Rules Challenge
================================================
Two children play pass-and-play tic-tac-toe on one shared device. Every move
is checked against the ordered rule hierarchy from Crowley & Siegler (1993),
"Flexible Strategy Use in Young Children's Tic-Tac-Toe" (Table 1 — Model of
Expert Performance): Win, Block, Fork, Block Fork, Play Center, Play Opposite
Corner, Play Empty Corner, Play Empty Side.

Entirely client-side: the game engine, scoring, and best-of-3 match logic
all live in static/game.js + static/expert_rules.js. This backend only
serves static files — there is no session state, no persistence, and no
per-pair server-side tracking, since each pair plays on their own device
independently (non-research demo; nothing is stored or exported).
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Basics4AI Tic-Tac-Toe Expert Rules Challenge")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


@app.get("/")
def serve_index():
    return FileResponse(BASE_DIR / "static" / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8900)))
