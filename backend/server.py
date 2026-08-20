"""IDGAF Tracker — minimal backend.

The app itself is 100% static: index.html + vanilla JS, storing everything in
localStorage. There is no server-side state to keep and no user data to store
away from the device — that is the product's core promise.

This backend exists solely because the deployment platform expects a
`backend/` service on port 8001. It exposes a single `/api/health` endpoint
so container health checks pass. NOTHING here handles user health data;
NOTHING here writes to the database. If you find yourself adding endpoints
that persist symptom logs, stop — that violates the local-only guarantee
documented in docs/ARCHITECTURE.md.
"""

from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="IDGAF Tracker Health Endpoint")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": "idgaf-tracker",
        "note": "This app stores everything locally in the user's browser. No data flows through this backend.",
        "time": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/")
def root():
    return {"message": "IDGAF Tracker health endpoint. See /api/health."}
