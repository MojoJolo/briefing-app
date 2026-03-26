from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import connect, disconnect
from app.models import ProcessRequest, ProcessResponse
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
async def process_input(body: ProcessRequest):
    tasks = await provider.process(body.input)
    return ProcessResponse(tasks=tasks)
