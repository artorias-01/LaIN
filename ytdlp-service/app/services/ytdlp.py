"""
yt-dlp subprocess wrapper with:
- Async subprocess execution
- In-memory TTL cache for search results
- Music content filter (duration, live stream, category checks)
- Stream URL resolution
"""
import asyncio
import json
import time
import re
import shutil
import sys
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from app.config import settings


def _get_ytdlp_base_cmd() -> List[str]:
    exe = shutil.which("yt-dlp")
    if exe:
        return [exe]
    return [sys.executable, "-m", "yt_dlp"]



# ─── TTL Cache ──────────────────────────────────────────────────────────────

@dataclass
class CacheEntry:
    data: Any
    expires_at: float


class TTLCache:
    def __init__(self):
        self._store: Dict[str, CacheEntry] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        if time.monotonic() > entry.expires_at:
            del self._store[key]
            return None
        return entry.data

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        self._store[key] = CacheEntry(
            data=value,
            expires_at=time.monotonic() + ttl_seconds
        )


_cache = TTLCache()


# ─── Music Filter Heuristics ─────────────────────────────────────────────────

MUSIC_CATEGORIES = {"Music"}
MUSIC_KEYWORDS = {
    "music", "song", "official", "audio", "lyrics", "ft.", "feat",
    "remix", "cover", "album", "single", "ep", "lp", "track",
    "lofi", "lo-fi", "hip hop", "hiphop", "jazz", "classical",
    "electronic", "edm", "pop", "rock", "metal", "indie", "rap",
    "rnb", "r&b", "soul", "blues", "country", "folk", "punk",
    "playlist", "mix", "beats", "instrumental",
}
NON_MUSIC_KEYWORDS = {
    "tutorial", "how to", "explained", "review", "unboxing",
    "vlog", "daily", "podcast", "news", "gaming", "gameplay",
    "reaction", "prank", "challenge", "documentary",
    "interview", "lecture", "speech",
}
NON_MUSIC_CHANNEL_RE = re.compile(
    r"(news|vlog|gaming|tech|tutorial|podcast|daily|talks?)",
    re.IGNORECASE
)


def _is_music_content(info: dict) -> bool:
    """Heuristic filter: return True if the yt-dlp result is music content."""
    # Reject live streams
    if info.get("is_live") or info.get("live_status") in ("is_live", "post_live"):
        return False

    # Reject too-short content (shorts / clips)
    duration = info.get("duration") or 0
    if duration < settings.min_track_duration:
        return False

    # Accept if YouTube category is explicitly Music
    categories = info.get("categories") or []
    if any(c in MUSIC_CATEGORIES for c in categories):
        return True

    # Accept if yt-dlp found music metadata (artist / track fields)
    if info.get("artist") or info.get("track"):
        return True

    # Check title and tags
    title = (info.get("title") or "").lower()
    tags = [t.lower() for t in (info.get("tags") or [])]
    description = (info.get("description") or "").lower()[:500]

    if any(kw in title for kw in NON_MUSIC_KEYWORDS):
        return False

    combined = title + " " + " ".join(tags[:20]) + " " + description[:200]
    music_hits = sum(1 for kw in MUSIC_KEYWORDS if kw in combined)
    if music_hits >= 2:
        return True

    channel = (info.get("channel") or info.get("uploader") or "").lower()
    if NON_MUSIC_CHANNEL_RE.search(channel):
        return False

    # YouTube Music auto-channels end in "- Topic"
    if channel.endswith("- topic"):
        return True

    return 60 <= duration <= 900


def _normalize_result(info: dict) -> dict:
    """Convert raw yt-dlp info dict to our API schema."""
    artist = (
        info.get("artist")
        or info.get("creator")
        or info.get("uploader")
        or ""
    )
    # Strip "- Topic" suffix from YouTube Music auto-channels
    artist = re.sub(r"\s*-\s*Topic$", "", artist, flags=re.IGNORECASE).strip()

    title = info.get("track") or info.get("title") or ""

    # Best thumbnail: prefer middle quality
    thumbnail = ""
    thumbnails = info.get("thumbnails") or []
    if thumbnails:
        mid = len(thumbnails) // 2
        thumbnail = thumbnails[mid].get("url", "")
    if not thumbnail:
        video_id = info.get("id", "")
        thumbnail = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"

    return {
        "id": info.get("id", ""),
        "title": title,
        "artist": artist,
        "thumbnail": thumbnail,
        "duration": info.get("duration") or 0,
        "channel": info.get("channel") or info.get("uploader") or "",
        "view_count": info.get("view_count"),
    }


# ─── Public API ──────────────────────────────────────────────────────────────

async def search_music(query: str) -> List[dict]:
    """
    Search YouTube for music tracks matching the query.
    Returns filtered, normalized track dicts.
    Results are cached for settings.cache_ttl_seconds.
    """
    cache_key = f"search:{query.lower().strip()}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    search_term = f"ytsearch20:{query}"
    cmd = [
        *_get_ytdlp_base_cmd(),
        "--dump-json",
        "--flat-playlist",
        "--no-warnings",
        "--ignore-errors",
        search_term,
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)
    except asyncio.TimeoutError:
        raise RuntimeError("yt-dlp search timed out after 30s")

    results: List[dict] = []
    for line in stdout.decode("utf-8", errors="replace").strip().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            info = json.loads(line)
        except json.JSONDecodeError:
            continue

        if _is_music_content(info):
            results.append(_normalize_result(info))
            if len(results) >= settings.max_search_results:
                break

    _cache.set(cache_key, results, settings.cache_ttl_seconds)
    return results


async def get_stream_url(video_id: str) -> str:
    """
    Resolve the best audio-only stream URL for a YouTube video.
    Returns a direct URL. NOT cached — YouTube stream URLs expire quickly.
    Raises RuntimeError on failure.
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    cmd = [
        *_get_ytdlp_base_cmd(),
        "-f", "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio",
        "--get-url",
        "--no-warnings",
        "--ignore-errors",
        url,
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)
    except asyncio.TimeoutError:
        raise RuntimeError(f"yt-dlp stream resolution timed out for {video_id}")

    stream_url = stdout.decode("utf-8", errors="replace").strip()
    if not stream_url or not stream_url.startswith("http"):
        err = stderr.decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"yt-dlp failed to resolve stream URL: {err}")

    return stream_url
