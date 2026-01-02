import { ApiConfig, TranscriptionRequest, TranscriptionResult, TranscriptionStreamCallback, RealtimeTranscriptionCallback } from '../types';

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

export const fetchModels = async (config: ApiConfig): Promise<string[]> => {
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
    
    if (!res.ok) {
      console.error('Failed to fetch models:', res.status, res.statusText);
      return [];
    }
    
    const data = await res.json();
    // Assuming the API returns { data: [{id: "model-name"}, ...] }
    const models = data.data?.map((m: any) => m.id) || [];
    
    console.log('📦 Available models:', models.length, 'models fetched');
    return models;
  } catch (e: any) {
    console.error('❌ Failed to fetch models:', {
      message: e.message,
      name: e.name,
    });
    return [];
  }
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

  // 5 minute timeout for large file uploads
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: getHeaders(config),
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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

  // Try to handle streaming, but fallback to JSON if server doesn't support SSE
  if (!res.body) {
    throw new Error('No response body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulatedText = '';
  let finalResult: TranscriptionResult = { text: '' };
  let buffer = '';
  let fullResponse = '';
  let hasStreamData = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      fullResponse += chunk;
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in buffer
      buffer = lines[lines.length - 1];

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        
        if (line.startsWith('data: ')) {
          hasStreamData = true;
          const data = line.slice(6);
          
          // Skip empty lines
          if (!data) continue;
          
          // Handle [DONE] marker
          if (data === '[DONE]') {
            console.log('📨 SSE stream complete');
            continue;
          }
          
          // Handle error messages
          if (data.startsWith('[Error:')) {
            const errorMsg = data.slice(8, -1); // Extract message from [Error: <message>]
            console.error('❌ SSE Error:', errorMsg);
            throw new Error(errorMsg);
          }

          // Try to parse as JSON first (for backwards compatibility)
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
              
              console.log('📨 Stream chunk (JSON):', {
                textLength: accumulatedText.length,
                language: parsed.language,
              });
            }
          } catch {
            // Not JSON - treat as plain text chunk (per sse-api.md spec)
            accumulatedText += data;
            finalResult = { text: accumulatedText };
            onChunk?.(finalResult);
            
            console.log('📨 Stream chunk (text):', {
              textLength: accumulatedText.length,
            });
          }
        }
      }
    }

    // If no streaming data found, try to parse the full response as JSON (fallback for non-streaming responses)
    if (!hasStreamData && fullResponse.trim()) {
      try {
        const result = JSON.parse(fullResponse);
        console.log('✅ Transcription successful (non-streaming):', {
          textLength: result.text?.length || 0,
          language: result.language,
        });
        return result;
      } catch (e) {
        console.error('Failed to parse non-streaming response:', e, fullResponse);
      }
    }
  } finally {
    reader.releaseLock();
  }

  // If we got no text from streaming, return what we have
  if (!accumulatedText && !finalResult.text) {
    console.warn('⚠️ No transcription text received');
  }

  // Clean up any trailing [DONE] markers from accumulated text
  const cleanText = (text: string) => text.replace(/\[DONE\]\s*$/i, '').trim();
  if (accumulatedText) {
    accumulatedText = cleanText(accumulatedText);
  }
  if (finalResult.text) {
    finalResult.text = cleanText(finalResult.text);
  }

  console.log('✅ Streaming transcription complete:', {
    textLength: accumulatedText.length || finalResult.text?.length || 0,
  });

  return finalResult.text ? finalResult : { text: accumulatedText };
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error('Upload timeout - request took too long. File may be too large or connection too slow.');
    }
    throw e;
  }
};

// WebSocket real-time transcription class
export class RealtimeTranscriber {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onResult: RealtimeTranscriptionCallback | null = null;
  private silenceTimeout: number | null = null;
  private lastAudioTime: number = 0;
  private readonly SILENCE_THRESHOLD = 0.01; // Audio level below this is considered silence
  private readonly AUTO_STOP_DELAY = 3000; // Auto-stop after 3 seconds of silence

  async start(
    config: ApiConfig,
    onResult: RealtimeTranscriptionCallback,
    language: string = 'auto'
  ): Promise<void> {
    this.onResult = onResult;

    // Build WebSocket URL from config.baseUrl
    // Convert http(s):// to ws(s):// 
    const wsBaseUrl = config.baseUrl.replace(/^http/, 'ws');
    const wsUrl = `${normalizeUrl(wsBaseUrl)}/v1/audio/transcriptions/stream?language=${language}`;

    console.log('🎤 Connecting to WebSocket:', wsUrl);

    // Connect WebSocket
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onResult?.({
          text: data.text || '',
          final: data.final || false,
          error: data.error,
        });
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e, event.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onResult?.({ text: '', final: true, error: 'WebSocket connection error' });
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket closed');
      // Ensure we send a final callback when connection closes
      this.onResult?.({ text: '', final: true });
    };

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject(new Error('WebSocket not initialized'));
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        resolve();
      };
      this.ws.onerror = () => reject(new Error('WebSocket connection failed'));
    });

    // Start audio capture at 16kHz
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Process audio in chunks (~100ms at 16kHz = 1600 samples = 3200 bytes)
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.lastAudioTime = Date.now();
    
    this.processor.onaudioprocess = (e) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const float32 = e.inputBuffer.getChannelData(0);
        
        // Calculate RMS (Root Mean Square) energy for better VAD
        let sumSquares = 0;
        for (let i = 0; i < float32.length; i++) {
          sumSquares += float32[i] * float32[i];
        }
        const rms = Math.sqrt(sumSquares / float32.length);
        
        // RMS threshold needs to be lower than peak threshold
        // Noise floor in logs was ~0.008 peak, likely ~0.003-0.005 RMS
        // Speech was >0.01 peak. Let's set RMS threshold conservatively.
        const RMS_THRESHOLD = 0.008; 
        
        if (rms > RMS_THRESHOLD) {
          // Audio detected, reset silence timer
          this.lastAudioTime = Date.now();
          if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
          }
        } else {
          // Silence detected, start auto-stop timer if not already running
          if (!this.silenceTimeout) {
            this.silenceTimeout = window.setTimeout(() => {
              this.stop();
            }, this.AUTO_STOP_DELAY);
          }
        }
        
        // Convert and send audio
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
        }
        this.ws.send(int16.buffer);
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    console.log('🎙️ Real-time transcription started');
  }

  async stop(): Promise<void> {
    // Clear silence timeout
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    
    // Stop recording immediately so we don't send any more mic audio
    this.processor?.disconnect();
    this.source?.disconnect();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    
    // Send silence padding to flush VAD buffer (1.0s worth of silence)
    // We send this with delays to simulate real-time passage
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('🛑 Sending silence padding...');
      const silenceChunk = new Int16Array(1600); // 100ms
      
      // Send 10 chunks (1 second) with 50ms delay between them (2x speed but enough to register)
      for (let i = 0; i < 10; i++) {
        if (this.ws.readyState !== WebSocket.OPEN) break;
        this.ws.send(silenceChunk.buffer);
        await new Promise(r => setTimeout(r, 50));
      }
      
      // Send stop signal
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'stop' }));
      }
    }

    this.audioContext?.close();
    this.processor = null;
    this.source = null;
    this.mediaStream = null;
    this.audioContext = null;

    // Close WebSocket after a delay to receive final result
    // We wait longer now because we sent padding and server needs to process it
    // We don't manually close the WS unless it's stuck for a very long time (5s)
    const ws = this.ws;
    const onResult = this.onResult;
    
    setTimeout(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        console.warn('⚠️ Server took too long to close connection, forcing close');
        // Server didn't send final result, send one ourselves
        onResult?.({ text: '', final: true });
        ws.close();
      }
    }, 5000);

    console.log('🛑 Real-time transcription stopping, waiting for final result...');
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
