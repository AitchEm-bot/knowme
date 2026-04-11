import type {
  InstagramPost,
  BrainAnalysisResult,
  ServerStatus,
  BrainMeshData,
} from './types';

// Content script -> Background
export interface PostDetectedMessage {
  type: 'POST_DETECTED';
  payload: InstagramPost;
}

// Background -> Side panel
export interface AnalysisResultMessage {
  type: 'ANALYSIS_RESULT';
  payload: BrainAnalysisResult;
}

export interface AnalysisErrorMessage {
  type: 'ANALYSIS_ERROR';
  payload: { postId: string; error: string };
}

export interface ServerStatusMessage {
  type: 'SERVER_STATUS';
  payload: ServerStatus;
}

export interface AnalysisLoadingMessage {
  type: 'ANALYSIS_LOADING';
  payload: { postId: string; post: InstagramPost };
}

// Side panel -> Background
export interface GetBrainMeshMessage {
  type: 'GET_BRAIN_MESH';
  payload: null;
}

export interface BrainMeshResponseMessage {
  type: 'BRAIN_MESH_RESPONSE';
  payload: BrainMeshData;
}

export type Message =
  | PostDetectedMessage
  | AnalysisResultMessage
  | AnalysisErrorMessage
  | ServerStatusMessage
  | AnalysisLoadingMessage
  | GetBrainMeshMessage
  | BrainMeshResponseMessage;
