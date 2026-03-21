import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.reference_video import ReferenceVideo
from app.services.video_storage import VideoStorageService

router = APIRouter(prefix="/reference-videos", tags=["reference-videos"])

MIME_TYPES = {
    "mp4": "video/mp4",
    "mov": "video/quicktime",
    "webm": "video/webm",
}


class ReferenceVideoResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    original_filename: str
    file_size: int
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    thumbnail_path: Optional[str] = None
    tags: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


def video_to_response(video: ReferenceVideo) -> dict:
    return {
        "id": video.id,
        "user_id": video.user_id,
        "filename": video.filename,
        "original_filename": video.original_filename,
        "file_size": video.file_size,
        "duration": video.duration,
        "width": video.width,
        "height": video.height,
        "thumbnail_path": video.thumbnail_path,
        "tags": video.tags,
        "created_at": str(video.created_at) if video.created_at else None,
    }


@router.post("/upload", response_model=ReferenceVideoResponse)
async def upload_reference_video(
    file: UploadFile = File(...),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Upload a reference video (mp4, mov, webm; max 100MB)."""
    filename, file_path, file_size = await VideoStorageService.save_video(file, user_id)

    video = ReferenceVideo(
        user_id=user_id,
        filename=filename,
        original_filename=file.filename or "video.mp4",
        file_size=file_size,
        tags=tags,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    return video_to_response(video)


@router.get("", response_model=list[ReferenceVideoResponse])
async def list_reference_videos(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """List all reference videos for the current user."""
    videos = (
        db.query(ReferenceVideo)
        .filter(ReferenceVideo.user_id == user_id)
        .order_by(ReferenceVideo.created_at.desc())
        .all()
    )
    return [video_to_response(v) for v in videos]


@router.get("/{video_id}", response_model=ReferenceVideoResponse)
async def get_reference_video(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get a single reference video by ID."""
    video = (
        db.query(ReferenceVideo)
        .filter(ReferenceVideo.id == video_id, ReferenceVideo.user_id == user_id)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video_to_response(video)


@router.delete("/{video_id}")
async def delete_reference_video(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Delete a reference video and its file."""
    video = (
        db.query(ReferenceVideo)
        .filter(ReferenceVideo.id == video_id, ReferenceVideo.user_id == user_id)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    VideoStorageService.delete_video(video.filename)
    db.delete(video)
    db.commit()

    return {"detail": "Video deleted"}


@router.get("/{video_id}/stream")
async def stream_reference_video(
    video_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Stream a reference video with HTTP Range support for seeking."""
    video = (
        db.query(ReferenceVideo)
        .filter(ReferenceVideo.id == video_id, ReferenceVideo.user_id == user_id)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    file_path = VideoStorageService.get_video_path(video.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    file_size = os.path.getsize(file_path)
    ext = video.filename.rsplit(".", 1)[-1].lower() if "." in video.filename else "mp4"
    content_type = MIME_TYPES.get(ext, "video/mp4")

    range_header = request.headers.get("range")

    if range_header:
        # Parse Range header: "bytes=start-end"
        range_spec = range_header.replace("bytes=", "")
        parts = range_spec.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1

        if start >= file_size:
            raise HTTPException(status_code=416, detail="Range not satisfiable")

        end = min(end, file_size - 1)
        content_length = end - start + 1

        def iter_range():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(1024 * 1024, remaining)
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            iter_range(),
            status_code=206,
            media_type=content_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            },
        )
    else:
        # No range — stream the full file
        def iter_file():
            with open(file_path, "rb") as f:
                while True:
                    chunk = f.read(1024 * 1024)
                    if not chunk:
                        break
                    yield chunk

        return StreamingResponse(
            iter_file(),
            media_type=content_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
            },
        )
