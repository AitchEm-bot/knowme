from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    post_id: str
    image_base64: str | None = None
    video_base64: str | None = None
    caption: str | None = None
    media_type: str  # "image", "video", "carousel"


class RegionActivation(BaseModel):
    region_name: str
    full_name: str
    hemisphere: str  # "left", "right", "bilateral"
    activation: float  # 0-1 normalized
    category: str
    description: str


class BrainAnalysisResponse(BaseModel):
    post_id: str
    timestamp: str
    regions: list[RegionActivation]
    vertex_activations: list[float]  # 20,484 values
    summary: str
    engagement_scores: dict[str, float]
    processing_time_ms: int


class ServerStatus(BaseModel):
    status: str  # "ready", "loading", "error"
    model_loaded: bool
    gpu_available: bool
    gpu_name: str | None = None


class BrainMeshResponse(BaseModel):
    vertices: list[list[float]]  # [[x,y,z], ...]
    faces: list[list[int]]  # [[v0,v1,v2], ...]
    vertex_region_map: list[str]  # region name per vertex
