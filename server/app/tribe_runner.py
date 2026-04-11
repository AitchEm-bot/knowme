import asyncio
import base64
import os
import tempfile
from pathlib import Path

import numpy as np

from .schemas import AnalysisRequest


class TribeRunner:
    """Wraps Meta's TRIBE v2 model for brain activation prediction."""

    def __init__(self, cache_dir: str = "./cache"):
        self.model = None
        self.cache_dir = cache_dir
        self._loaded = False

    async def load_model(self) -> None:
        """Load TRIBE v2 model. Called once at server startup."""
        from tribev2 import TribeModel

        config_update = {}
        num_workers = os.environ.get("KNOWME_NUM_WORKERS")
        if num_workers is not None:
            config_update["data.num_workers"] = int(num_workers)

        self.model = TribeModel.from_pretrained(
            "facebook/tribev2",
            cache_folder=self.cache_dir,
            config_update=config_update or None,
        )
        self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def _save_temp_media(self, data_b64: str, suffix: str) -> Path:
        """Decode base64 media to a temp file."""
        raw = base64.b64decode(data_b64)
        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp.write(raw)
        tmp.close()
        return Path(tmp.name)

    async def _fetch_url(self, url: str, suffix: str) -> Path:
        """Download media from a URL to a temp file."""
        import httpx

        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp.write(resp.content)
        tmp.close()
        return Path(tmp.name)

    def _image_to_video(self, image_path: Path, duration: float = 4.0) -> Path:
        """Convert a static image to a short video at 10fps.

        TRIBE v2's CreateVideosFromImages uses fps=10 by default.
        We create a 4-second still video so the model gets ~8 TR segments
        (at 2Hz sampling = 0.5s per TR).
        """
        # Handle both MoviePy 1.x and 2.x APIs
        try:
            from moviepy.editor import ImageClip
        except ImportError:
            from moviepy import ImageClip

        video_path = image_path.with_suffix(".mp4")
        clip = ImageClip(str(image_path))

        # MoviePy 2.x renamed set_duration() to with_duration()
        if hasattr(clip, 'with_duration'):
            clip = clip.with_duration(duration)
        else:
            clip = clip.set_duration(duration)

        clip.write_videofile(
            str(video_path), codec="libx264", audio=False, fps=10, logger=None
        )
        return video_path

    def _save_caption_text(self, caption: str) -> Path:
        """Save caption text to a temp file for TRIBE v2 text processing."""
        tmp = tempfile.NamedTemporaryFile(
            suffix=".txt", mode="w", delete=False, encoding="utf-8"
        )
        tmp.write(caption)
        tmp.close()
        return Path(tmp.name)

    async def analyze(self, request: AnalysisRequest) -> np.ndarray:
        """Run TRIBE v2 inference on Instagram content.

        Returns averaged vertex activations as a 1D array of ~20,484 values.

        Strategy:
        - Image URL/base64: fetch/decode, convert to 4s still video, run prediction
        - Video URL/base64: fetch/decode, run video prediction
        - Caption text: Run separately via text_path, combine activations
        - Both visual + caption: weighted average (0.7 visual, 0.3 text)
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        visual_preds = None
        text_preds = None
        temp_files: list[Path] = []
        loop = asyncio.get_event_loop()

        try:
            # Process visual content — prefer URL over base64
            if request.image_url:
                img_path = await self._fetch_url(request.image_url, ".jpg")
                temp_files.append(img_path)
                video_path = self._image_to_video(img_path)
                temp_files.append(video_path)
                visual_preds = await loop.run_in_executor(None, self._run_prediction, video_path)

            elif request.image_base64:
                img_path = self._save_temp_media(request.image_base64, ".jpg")
                temp_files.append(img_path)
                video_path = self._image_to_video(img_path)
                temp_files.append(video_path)
                visual_preds = await loop.run_in_executor(None, self._run_prediction, video_path)

            elif request.video_url:
                video_path = await self._fetch_url(request.video_url, ".mp4")
                temp_files.append(video_path)
                visual_preds = await loop.run_in_executor(None, self._run_prediction, video_path)

            elif request.video_base64:
                video_path = self._save_temp_media(request.video_base64, ".mp4")
                temp_files.append(video_path)
                visual_preds = await loop.run_in_executor(None, self._run_prediction, video_path)

            # Process caption text
            if request.caption:
                text_path = self._save_caption_text(request.caption)
                temp_files.append(text_path)
                text_preds = await loop.run_in_executor(None, self._run_text_prediction, text_path)

            # Combine modalities
            if visual_preds is not None and text_preds is not None:
                combined = 0.7 * visual_preds + 0.3 * text_preds
            elif visual_preds is not None:
                combined = visual_preds
            elif text_preds is not None:
                combined = text_preds
            else:
                raise ValueError("No media or caption provided for analysis")

            return combined

        finally:
            for f in temp_files:
                try:
                    f.unlink()
                except OSError:
                    pass

    def _run_prediction(self, media_path: Path) -> np.ndarray:
        """Run TRIBE v2 prediction on a video file.

        Returns averaged vertex activations across all timesteps.
        """
        events_df = self.model.get_events_dataframe(video_path=str(media_path))
        preds, segments = self.model.predict(events_df)

        # preds shape: (n_timesteps, n_vertices)
        return preds.mean(axis=0)

    def _run_text_prediction(self, text_path: Path) -> np.ndarray:
        """Run TRIBE v2 prediction on text content.

        TRIBE v2 processes text by synthesizing speech (gTTS) then using
        Whisper for word timings before running through the audio encoder.
        """
        events_df = self.model.get_events_dataframe(text_path=str(text_path))
        preds, segments = self.model.predict(events_df)

        return preds.mean(axis=0)
