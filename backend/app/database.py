import asyncpg

from app.config import settings

_pool: asyncpg.Pool | None = None


async def connect():
    global _pool
    _pool = await asyncpg.create_pool(settings.DATABASE_URL)


async def disconnect():
    if _pool:
        await _pool.close()


async def get_db() -> asyncpg.Connection:
    async with _pool.acquire() as conn:
        yield conn
