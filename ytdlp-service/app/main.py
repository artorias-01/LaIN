import logging
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import search, stream
from app.services.ytdlp import _get_ytdlp_base_cmd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("yt-dlp service starting — checking yt-dlp availability...")
    import asyncio
    try:
        proc = await asyncio.create_subprocess_exec(
            *_get_ytdlp_base_cmd(), "--version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        version = stdout.decode().strip()
        if version:
            logger.info(f"yt-dlp version: {version}")
        else:
            logger.warning("yt-dlp not detected — search and stream will fail!")
    except Exception as e:
        logger.warning(f"Error checking yt-dlp version: {e}")
    yield
    logger.info("yt-dlp service shutting down")


app = FastAPI(
    title="yt-dlp Music Service",
    description="Search and stream YouTube music audio via yt-dlp",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(search.router)
app.include_router(stream.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ytdlp"}


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.ytdlp_service_host,
        port=settings.ytdlp_service_port,
        reload=True,
        log_level="info",
    )
