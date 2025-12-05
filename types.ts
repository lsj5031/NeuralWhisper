export interface ApiConfig {
  baseUrl: string;
  adminKey?: string;
}

export interface TranscriptionRequest {
  file: File;
  model?: string;
  language?: string;
  task?: 'transcribe' | 'translate';
  temperature?: number;
  stream?: boolean;
}

export interface TranscriptionChunk {
  text: string;
  timestamp: [number, number];
  speaker?: string;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  chunks?: TranscriptionChunk[];
  speakers?: string[];
}

export interface VerboseTranscriptionResult extends TranscriptionResult {
  duration?: number;
  language?: string;
}

export interface ApiError {
  error?: {
    message: string;
  };
  detail?: string;
}

export interface StoredTask {
  id: string;
  request: Omit<TranscriptionRequest, 'file'> & { fileName: string };
  result: TranscriptionResult;
  timestamp: number;
}

export type TranscriptionStreamCallback = (chunk: TranscriptionResult) => void;

export interface TaskStatus {
  task_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: TranscriptionResult;
}
