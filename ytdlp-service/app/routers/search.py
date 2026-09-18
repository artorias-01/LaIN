import logging
from fastapi import APIRouter, HTTPException, Query, Request

from app.services.ytdlp import search_music

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/search")
async def search(
    request: Request,
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
):
    """
    Search YouTube for music content.

    Returns filtered, normalized music results only (no vlogs, news, tutorials).
    Results are cached for 5 minutes to avoid repeated yt-dlp calls.
    """
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        results = await search_music(query)
    except RuntimeError as e:
        logger.error(f"Search failed for '{query}': {e}")
        raise HTTPException(status_code=502, detail=f"Search backend error: {str(e)}")
    except Exception as e:
        logger.exception(f"Unexpected error searching for '{query}'")
        raise HTTPException(status_code=500, detail="Internal server error")

    return {
        "query": query,
        "results": results,
        "count": len(results),
    }
