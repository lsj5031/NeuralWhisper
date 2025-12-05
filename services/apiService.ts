import { ApiConfig, TranscriptionRequest, TranscriptionResult, TranscriptionStreamCallback } from '../types';

const DEFAULT_MODEL = 'Systran/faster-distil-whisper-large-v3';

const getHeaders = (config: ApiConfig): HeadersInit => {
  const headers: HeadersInit = {};
  if (config.adminKey) {
    headers['x-admin-api-key'] = config.adminKey;
  }
  return headers;
};

// Ensure URL doesn't have trailing slash
const normalizeUrl = (url: string) => url.replace(/\/$/, '');

const buildFormData = (data: TranscriptionRequest, stream: boolean): FormData => {
  const formData = new FormData();
  
  if (!data.file) {
    throw new Error('No audio file provided');
  }
  formData.append('file', data.file);
  
  const model = data.model || DEFAULT_MODEL;
  formData.append('model', model);
  
  if (stream) {
    formData.append('stream', 'true');
  }
  
  if (data.language) {
    formData.append('language', data.language);
  }
  
  if (data.task === 'translate') {
    formData.append('task', 'translate');
  }
  
  if (data.temperature !== undefined && data.temperature !== 0) {
    formData.append('temperature', data.temperature.toString());
  }
  
  return formData;
};

export const checkConnection = async (config: ApiConfig): Promise<boolean> => {
  try {
    // In development: use relative URL (proxied through Vite)
    // In production: use absolute URL if configured
    const isProduction = import.meta.env.PROD;
    const url = isProduction && config.baseUrl !== 'http://localhost:8000' 
      ? `${normalizeUrl(config.baseUrl)}/v1/models`
      : '/v1/models';
    
    // Add 10 second timeout to fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(config),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    console.log('📡 Connection test response:', {
      status: res.status,
      ok: res.ok,
      statusText: res.statusText,
      contentLength: res.headers.get('content-length'),
      contentType: res.headers.get('content-type'),
    });
    
    // Server responded (even with error is still a connection)
    return res.ok || res.status === 401; // 401 means auth required but connected
  } catch (e: any) {
    console.error('❌ Connection test failed:', {
      message: e.message,
      name: e.name,
    });
    if (e.name === 'AbortError') {
      console.error('   → Request timed out (10s) - server may not be closing response properly');
    }
    return false;
  }
};

export const submitTranscription = async (
  config: ApiConfig,
  data: TranscriptionRequest
): Promise<TranscriptionResult> => {
  return submitTranscriptionWithStream(config, data, false);
};

export const submitTranscriptionStream = async (
  config: ApiConfig,
  data: TranscriptionRequest,
  onChunk: TranscriptionStreamCallback
): Promise<TranscriptionResult> => {
  return submitTranscriptionWithStream(config, data, true, onChunk);
};

const submitTranscriptionWithStream = async (
  config: ApiConfig,
  data: TranscriptionRequest,
  stream: boolean,
  onChunk?: TranscriptionStreamCallback
): Promise<TranscriptionResult> => {
  const formData = buildFormData(data, stream);
  const model = data.model || DEFAULT_MODEL;
  
  // In development: use relative URL (proxied through Vite)
  // In production: use absolute URL if configured
  const isProduction = import.meta.env.PROD;
  const endpointPath = data.task === 'translate' 
    ? '/v1/audio/translations'
    : '/v1/audio/transcriptions';
  
  const fullUrl = isProduction && config.baseUrl !== 'http://localhost:8000'
    ? `${normalizeUrl(config.baseUrl)}${endpointPath}`
    : endpointPath;

  console.log(`📤 Submitting ${stream ? 'streaming' : ''} transcription:`, {
    url: fullUrl,
    file: `${data.file!.name} (${(data.file!.size / 1024).toFixed(1)}KB)`,
    model,
    language: data.language || 'auto-detect',
    task: data.task || 'transcribe',
    temperature: data.temperature,
  });

  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: getHeaders(config),
    body: formData,
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      errorMsg = errorData.error?.message || errorData.detail || errorData.message || errorMsg;
      console.error('❌ API Error Response:', {
        status: res.status,
        message: errorMsg,
        fullResponse: errorData,
      });
    } catch (e) {
      console.error('❌ API Error (non-JSON response):', {
        status: res.status,
        statusText: res.statusText,
      });
    }
    throw new Error(errorMsg);
  }

  if (!stream) {
    const result = await res.json();
    console.log('✅ Transcription successful:', {
      textLength: result.text?.length || 0,
      language: result.language,
    });
    return result;
  }

  // Handle SSE stream
  if (!res.body) {
    throw new Error('No response body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulatedText = '';
  let finalResult: TranscriptionResult = { text: '' };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          // Skip empty lines and [DONE] messages
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            // Accumulate text from streaming chunks
            if (parsed.text) {
              accumulatedText += parsed.text;
              
              // Validate and merge chunks if present
              const validatedChunks = parsed.chunks?.filter((chunk: any) => 
                chunk?.text && Array.isArray(chunk?.timestamp) && chunk.timestamp.length === 2
              ) || undefined;
              
              finalResult = { 
                ...parsed, 
                text: accumulatedText,
                chunks: validatedChunks ? [...(finalResult.chunks || []), ...validatedChunks] : finalResult.chunks,
              };
              
              // Call callback with partial result
              onChunk?.(finalResult);
              
              console.log('📨 Stream chunk:', {
                textLength: accumulatedText.length,
                language: parsed.language,
              });
            }
          } catch (e) {
            console.error('Failed to parse SSE chunk:', e, data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  console.log('✅ Streaming transcription complete:', {
    textLength: accumulatedText.length,
  });

  return finalResult;
};
