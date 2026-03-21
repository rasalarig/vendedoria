import os
import uuid
from fastapi import UploadFile, HTTPException

_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_data_dir = "/app/data" if os.path.exists("/app/data") else _backend_dir

ALLOWED_EXTENSIONS = {"mp4", "mov", "webm"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


class VideoStorageService:
    """Handles video file storage on disk."""

    @staticmethod
    def get_video_dir() -> str:
        """Returns the base directory for reference videos."""
        return os.path.join(_data_dir, "uploads", "videos")

    @staticmethod
    def get_generated_video_dir() -> str:
        """Returns the base directory for generated videos."""
        return os.path.join(_data_dir, "uploads", "videos", "generated")

    @staticmethod
    def _validate_extension(filename: str) -> str:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}",
            )
        return ext

    @classmethod
    async def save_video(
        cls, file: UploadFile, user_id: int, generated: bool = False
    ) -> tuple[str, str, int]:
        """Save an uploaded video to disk.

        Returns:
            (filename, file_path, file_size)
        """
        original_name = file.filename or "video.mp4"
        ext = cls._validate_extension(original_name)

        target_dir = cls.get_generated_video_dir() if generated else cls.get_video_dir()
        os.makedirs(target_dir, exist_ok=True)

        unique_name = f"{user_id}_{uuid.uuid4().hex}.{ext}"
        file_path = os.path.join(target_dir, unique_name)

        file_size = 0
        with open(file_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB chunks
                if not chunk:
                    break
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    f.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=400,
                        detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024 * 1024)}MB",
                    )
                f.write(chunk)

        return unique_name, file_path, file_size

    @classmethod
    def get_video_path(cls, filename: str, generated: bool = False) -> str:
        """Returns the full path for a video filename."""
        base = cls.get_generated_video_dir() if generated else cls.get_video_dir()
        return os.path.join(base, filename)

    @classmethod
    def delete_video(cls, filename: str, generated: bool = False) -> None:
        """Delete a video file from disk."""
        path = cls.get_video_path(filename, generated=generated)
        if os.path.exists(path):
            os.remove(path)
