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
    - Forwards Range headers and mirrors upstream Content-Range for seek support.
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

    # We need to read the upstream response headers BEFORE constructing
    # StreamingResponse so we can mirror Content-Range / Content-Length /
    # status_code from the actual CDN response. This means we open the
    # httpx client and response outside the generator, and let the generator
    # only handle iterating chunks + closing.

    client = httpx.AsyncClient(
        timeout=httpx.Timeout(connect=10, read=120, write=10, pool=10),
        follow_redirects=True,
    )

    resp = None
    for attempt in range(2):
        try:
            resp = await client.send(
                client.build_request("GET", stream_url, headers=upstream_headers),
                stream=True,
            )
            # Re-resolve on expired URL
            if resp.status_code in (403, 404, 410) and attempt == 0:
                logger.warning(
                    f"Stream URL expired for {video_id} (HTTP {resp.status_code}), re-resolving..."
                )
                await resp.aclose()
                resp = None
                stream_url = await get_stream_url(video_id)
                continue
            break
        except (httpx.RemoteProtocolError, httpx.ReadTimeout, httpx.ConnectError) as e:
            if attempt == 0:
                logger.warning(f"Stream error for {video_id}, retrying: {e}")
                try:
                    stream_url = await get_stream_url(video_id)
                except RuntimeError:
                    await client.aclose()
                    raise HTTPException(status_code=502, detail="Failed to re-resolve stream URL")
                continue
            logger.error(f"Stream failed after retry for {video_id}: {e}")
            await client.aclose()
            raise HTTPException(status_code=502, detail="Upstream stream failed")

    if resp is None:
        await client.aclose()
        raise HTTPException(status_code=502, detail="Failed to connect to upstream")

    # Detect content type from URL hints
    content_type = "audio/webm"
    if ".m4a" in stream_url or "mime=audio%2Fmp4" in stream_url:
        content_type = "audio/mp4"
    elif ".opus" in stream_url:
        content_type = "audio/ogg"

    # Mirror upstream status and range headers
    logger.info(
        "Stream %s: upstream status=%d, content-range=%r, content-length=%r",
        video_id, resp.status_code,
        resp.headers.get("content-range"),
        resp.headers.get("content-length"),
    )
    status_code = resp.status_code if resp.status_code in (200, 206) else 200

    response_headers: dict[str, str] = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
    }

    # Forward Content-Range and Content-Length from upstream when present
    upstream_content_range = resp.headers.get("content-range")
    upstream_content_length = resp.headers.get("content-length")

    if status_code == 206 and upstream_content_range:
        response_headers["Content-Range"] = upstream_content_range
    elif status_code == 206 and not upstream_content_range:
        # Upstream ignored the Range and sent a full 200-style body as 206 —
        # downgrade to 200 so the browser doesn't reject a 206 without Content-Range
        status_code = 200

    if upstream_content_length:
        response_headers["Content-Length"] = upstream_content_length

    async def audio_generator():
        try:
            async for chunk in resp.aiter_bytes(chunk_size=16384):
                yield chunk
        finally:
            await resp.aclose()
            await client.aclose()

    return StreamingResponse(
        audio_generator(),
        status_code=status_code,
        media_type=content_type,
        headers=response_headers,
    )
