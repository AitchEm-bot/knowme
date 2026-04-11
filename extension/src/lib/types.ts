// Shared TypeScript interfaces for KnowMe

export interface InstagramPost {
  postId: string;
  username: string;
  caption: string | null;
  mediaType: 'image' | 'video' | 'carousel';
  mediaSrc: string; // base64 encoded (fallback)
  mediaUrl: string; // direct URL to media (preferred)
  permalink: string;
  timestamp: string;
}

export interface RegionActivation {
  region_name: string;
  full_name: string;
  hemisphere: 'left' | 'right' | 'bilateral';
  activation: number; // 0-1 normalized
  category: string;
  description: string;
}

export interface BrainAnalysisResponse {
  post_id: string;
  timestamp: string;
  regions: RegionActivation[];
  vertex_activations: number[]; // 20,484 values
  summary: string;
  engagement_scores: Record<string, number>;
  processing_time_ms: number;
}

export interface BrainAnalysisResult extends BrainAnalysisResponse {
  post: InstagramPost;
}

export interface ServerStatus {
  status: 'ready' | 'loading' | 'error';
  model_loaded: boolean;
  gpu_available: boolean;
  gpu_name: string | null;
}

export interface BrainMeshData {
  vertices: [number, number, number][];
  faces: [number, number, number][];
  vertex_region_map: string[];
}

export interface AggregateStats {
  totalAnalyses: number;
  avgEngagement: Record<string, number>;
  topRegions: { name: string; avgActivation: number }[];
  timeRange: { from: string; to: string };
}
