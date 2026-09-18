import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Path, Request
from fastapi.responses import StreamingResponse

from app.services.ytdlp import get_stream_url

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_VIDEO_ID = re.compile(r"^[a-zA-Z0-9_-]{11}$")


@router.get("/api/stream/{video_id}")
async def stream_audio(
    request: Request,
    video_id: str = Path(..., description="YouTube video ID (11 chars)"),
):
    """
    Proxy audio stream for a given YouTube video ID.

    - Validates the video ID format.
    - Resolves stream URL via yt-dlp.
    - Proxies the audio through httpx to the client.
    - Automatically re-resolves if the URL expires (403/404).
    - Forwards Range headers for seek support.
    """
    if not VALID_VIDEO_ID.match(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID format")

    try:
        stream_url = await get_stream_url(video_id)
    except RuntimeError as e:
        logger.error(f"Stream resolution failed for {video_id}: {e}")
        raise HTTPException(status_code=502, detail=str(e))

    # Forward Range header for seeking
    upstream_headers: dict[str, str] = {"User-Agent": "Mozilla/5.0"}
    if "range" in request.headers:
        upstream_headers["Range"] = request.headers["range"]

    async def audio_generator():
        nonlocal stream_url

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=10, read=120, write=10, pool=10),
            follow_redirects=True,
        ) as client:
            for attempt in range(2):
                try:
                    async with client.stream("GET", stream_url, headers=upstream_headers) as resp:
                        # Re-resolve on expired URL
                        if resp.status_code in (403, 404, 410) and attempt == 0:
                            logger.warning(
                                f"Stream URL expired for {video_id} (HTTP {resp.status_code}), re-resolving..."
                            )
                            stream_url = await get_stream_url(video_id)
                            continue
                        async for chunk in resp.aiter_bytes(chunk_size=16384):
                            yield chunk
                        return
                except (httpx.RemoteProtocolError, httpx.ReadTimeout, httpx.ConnectError) as e:
                    if attempt == 0:
                        logger.warning(f"Stream error for {video_id}, retrying: {e}")
                        try:
                            stream_url = await get_stream_url(video_id)
                        except RuntimeError:
                            return
                        continue
                    logger.error(f"Stream failed after retry for {video_id}: {e}")
                    return

    # Detect content type from URL hints
    content_type = "audio/webm"
    if ".m4a" in stream_url or "mime=audio%2Fmp4" in stream_url:
        content_type = "audio/mp4"
    elif ".opus" in stream_url:
        content_type = "audio/ogg"

    status_code = 206 if "range" in request.headers else 200

    return StreamingResponse(
        audio_generator(),
        status_code=status_code,
        media_type=content_type,
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
