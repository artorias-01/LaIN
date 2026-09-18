import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.ytdlp import _is_music_content, _normalize_result, TTLCache

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ytdlp"}


def test_search_empty_query():
    response = client.get("/api/search?q=")
    assert response.status_code == 422 or response.status_code == 400


def test_stream_invalid_id():
    response = client.get("/api/stream/bad!id")
    assert response.status_code == 400
    assert "Invalid video ID format" in response.json()["detail"]


def test_ttl_cache():
    cache = TTLCache()
    cache.set("key1", "val1", ttl_seconds=10)
    assert cache.get("key1") == "val1"
    assert cache.get("nonexistent") is None


def test_music_filter_heuristics():
    # Should reject live stream
    assert not _is_music_content({"is_live": True, "duration": 200})

    # Should reject short duration (<60s)
    assert not _is_music_content({"duration": 30, "categories": ["Music"]})

    # Should accept music category
    assert _is_music_content({"duration": 180, "categories": ["Music"]})

    # Should accept YouTube music artist/track metadata
    assert _is_music_content({"duration": 200, "artist": "Daft Punk", "track": "Get Lucky"})

    # Should reject clear non-music keywords
    assert not _is_music_content({"duration": 300, "title": "React Tutorial For Beginners 2024"})


def test_normalize_result():
    info = {
        "id": "dQw4w9WgXcQ",
        "title": "Never Gonna Give You Up",
        "artist": "Rick Astley - Topic",
        "duration": 213,
        "channel": "Rick Astley - Topic",
        "thumbnails": [{"url": "http://example.com/thumb.jpg"}],
    }
    norm = _normalize_result(info)
    assert norm["id"] == "dQw4w9WgXcQ"
    assert norm["title"] == "Never Gonna Give You Up"
    assert norm["artist"] == "Rick Astley"  # "- Topic" stripped
    assert norm["duration"] == 213
