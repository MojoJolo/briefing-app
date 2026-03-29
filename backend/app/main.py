from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import asyncpg
from fastapi import Depends

from app.database import connect, disconnect, get_db
from app.models import ProcessRequest, ProcessResponse, TaskResponse
from app.llm.factory import provider


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    yield
    await disconnect()


app = FastAPI(title="Briefing App API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Briefing App API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/process", response_model=ProcessResponse)
async def process_input(body: ProcessRequest, db: asyncpg.Connection = Depends(get_db)):
    tasks = await provider.process(body.input)

    rows = await db.fetch(
        """
        INSERT INTO tasks (task, category)
        SELECT t.task, t.category
        FROM unnest($1::text[], $2::text[]) AS t(task, category)
        RETURNING id, task, category, status
        """,
        [t.text for t in tasks],
        [t.category.lower() for t in tasks],
    )

    return ProcessResponse(tasks=[TaskResponse(**row) for row in rows])
