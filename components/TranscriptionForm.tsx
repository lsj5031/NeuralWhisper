import React, { useState, useRef } from 'react';
import { CyberButton, CyberLabel, CyberSelect, CyberCard } from './CyberUI';
import { TranscriptionRequest, TranscriptionMode } from '../types';
import { UploadCloud, Zap, Mic, Square, Radio } from 'lucide-react';

const DEFAULT_MODEL = 'glm-nano-2512';

interface TranscriptionFormProps {
  onSubmit: (data: TranscriptionRequest) => void;
  onStartRealtime?: (language: string) => void;
  onStopRealtime?: () => void;
  onClearRealtime?: () => void;
  isLoading: boolean;
  isRealtimeActive?: boolean;
  realtimeText?: string;
  autoStartAfterRecord?: boolean;
  availableModels?: string[];
}

export const TranscriptionForm: React.FC<TranscriptionFormProps> = ({ 
  onSubmit, 
  onStartRealtime,
  onStopRealtime,
  onClearRealtime,
  isLoading, 
  isRealtimeActive = false,
  realtimeText = '',
  autoStartAfterRecord = true, 
  availableModels = [] 
}) => {
  const [mode, setMode] = useState<TranscriptionMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [task, setTask] = useState<'transcribe' | 'translate'>('transcribe');
  const [language, setLanguage] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [temperature, setTemperature] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
    }
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      setRecordingTime(0);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setFile(audioFile);
        setFileName(audioFile.name);
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        
        // Auto-submit if enabled
        if (autoStartAfterRecord) {
          setTimeout(() => performSubmit(audioFile), 300);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Timer
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      // Clean up media stream to avoid memory leaks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const performSubmit = (fileToSubmit?: File | null) => {
    const audioFile = fileToSubmit || file;
    if (!audioFile) return;

    onSubmit({
      file: audioFile,
      task,
      language: language || undefined,
      model: model || DEFAULT_MODEL,
      temperature,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mode Selector */}
        <div className="col-span-1 md:col-span-2">
          <CyberLabel>Transcription Mode</CyberLabel>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={`flex-1 p-3 border font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${mode === 'file' ? 'border-cyber-cyan bg-cyber-cyan/10 text-cyber-cyan' : 'border-cyber-dim text-gray-600 hover:border-gray-500'}`}
            >
              <UploadCloud size={18} /> File Upload
            </button>
            <button
              type="button"
              onClick={() => setMode('record')}
              className={`flex-1 p-3 border font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${mode === 'record' ? 'border-cyber-cyan bg-cyber-cyan/10 text-cyber-cyan' : 'border-cyber-dim text-gray-600 hover:border-gray-500'}`}
            >
              <Mic size={18} /> Record
            </button>
            <button
              type="button"
              onClick={() => setMode('realtime')}
              disabled={!onStartRealtime}
              className={`flex-1 p-3 border font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${mode === 'realtime' ? 'border-cyber-pink bg-cyber-pink/10 text-cyber-pink' : 'border-cyber-dim text-gray-600 hover:border-gray-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Radio size={18} /> Live
            </button>
          </div>
        </div>

        {/* File Upload Section - shown for file mode */}
        {mode === 'file' && (
           <div className="col-span-1 md:col-span-2">
             <CyberLabel htmlFor="audio-file">Audio Source</CyberLabel>
             
             {/* Upload Tab */}
             <div
             className="relative border-2 border-dashed border-cyber-dim rounded p-8 text-center cursor-pointer transition-colors hover:border-cyber-cyan hover:bg-cyber-cyan/5"
             onClick={() => !isRecording && fileInputRef.current?.click()}
           >
             <input
               ref={fileInputRef}
               id="audio-file"
               type="file"
               accept="audio/*"
               onChange={handleFileChange}
               className="hidden"
               disabled={isRecording}
             />
             <div className="flex justify-center mb-3">
               <UploadCloud size={32} className="text-cyber-cyan" />
             </div>
             <p className="font-mono font-bold text-cyber-cyan">
               {fileName || 'Click to upload or drag and drop'}
             </p>
             <p className="text-xs text-gray-500 mt-2">MP3, WAV, M4A, FLAC supported</p>
           </div>

           {/* Microphone Recording */}
           <div className="mt-4 p-4 border border-cyber-dim rounded">
             <div className="flex items-center justify-between gap-4">
               <div className="flex-1">
                 <p className="font-mono text-sm text-gray-400 mb-2">
                   {isRecording ? `RECORDING: ${formatTime(recordingTime)}` : 'Or use microphone'}
                 </p>
               </div>
               {isRecording ? (
                 <button
                   type="button"
                   onClick={stopRecording}
                   className="flex items-center gap-2 px-4 py-2 bg-cyber-pink text-white font-bold text-sm hover:bg-cyber-pink/80 transition-colors rounded"
                 >
                   <Square size={16} /> STOP
                 </button>
               ) : (
                 <button
                   type="button"
                   onClick={startRecording}
                   disabled={isRecording}
                   className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan text-black font-bold text-sm hover:bg-cyber-cyan/80 transition-colors rounded disabled:opacity-50"
                 >
                   <Mic size={16} /> RECORD
                 </button>
               )}
             </div>
           </div>
           </div>
        )}

        {/* Record Mode Section */}
        {mode === 'record' && (
           <div className="col-span-1 md:col-span-2">
             <CyberLabel>Record Audio</CyberLabel>
             <div className="p-6 border border-cyber-dim rounded bg-cyber-panel">
               <div className="flex items-center justify-center gap-6">
                 <div className="text-center">
                   <p className="font-mono text-2xl text-cyber-cyan mb-2">
                     {isRecording ? formatTime(recordingTime) : '0:00'}
                   </p>
                   <p className="font-mono text-sm text-gray-400">
                     {isRecording ? 'Recording...' : fileName ? `Recorded: ${fileName}` : 'Click to start recording'}
                   </p>
                 </div>
                 {isRecording ? (
                   <button
                     type="button"
                     onClick={stopRecording}
                     className="flex items-center gap-2 px-6 py-3 bg-cyber-pink text-white font-bold text-lg hover:bg-cyber-pink/80 transition-colors rounded"
                   >
                     <Square size={20} /> STOP
                   </button>
                 ) : (
                   <button
                     type="button"
                     onClick={startRecording}
                     className="flex items-center gap-2 px-6 py-3 bg-cyber-cyan text-black font-bold text-lg hover:bg-cyber-cyan/80 transition-colors rounded"
                   >
                     <Mic size={20} /> RECORD
                   </button>
                 )}
               </div>
             </div>
           </div>
        )}

        {/* Realtime Mode Section */}
        {mode === 'realtime' && (
           <div className="col-span-1 md:col-span-2">
             <CyberLabel>Live Transcription</CyberLabel>
             <div className="p-6 border border-cyber-pink rounded bg-cyber-panel">
               <div className="mb-4">
                 <div className="flex items-center justify-between mb-4">
                   <p className="font-mono text-sm text-gray-400">
                     {isRealtimeActive ? 'Transcribing in real-time...' : 'Click Start to begin live transcription'}
                   </p>
                   <div className="flex gap-2">
                     {realtimeText && !isRealtimeActive && (
                       <button
                         type="button"
                         onClick={onClearRealtime}
                         className="px-3 py-2 bg-cyber-dim border border-cyber-dim text-gray-400 font-bold text-sm hover:text-red-400 transition-colors rounded"
                       >
                         CLEAR
                       </button>
                     )}
                     {realtimeText && (
                       <button
                         type="button"
                         onClick={() => navigator.clipboard.writeText(realtimeText)}
                         className="px-3 py-2 bg-cyber-dim border border-cyber-dim text-gray-400 font-bold text-sm hover:text-cyber-cyan transition-colors rounded"
                       >
                         COPY
                       </button>
                     )}
                     {isRealtimeActive ? (
                       <button
                         type="button"
                         onClick={onStopRealtime}
                         className="flex items-center gap-2 px-4 py-2 bg-cyber-pink text-white font-bold text-sm hover:bg-cyber-pink/80 transition-colors rounded"
                       >
                         <Square size={16} /> STOP
                       </button>
                     ) : (
                       <button
                         type="button"
                         onClick={() => onStartRealtime?.(language || 'auto')}
                         className="flex items-center gap-2 px-4 py-2 bg-cyber-pink text-white font-bold text-sm hover:bg-cyber-pink/80 transition-colors rounded animate-pulse"
                       >
                         <Radio size={16} /> START LIVE
                       </button>
                     )}
                   </div>
                 </div>
                 <div 
                   className="bg-cyber-black border border-cyber-dim rounded p-4 font-mono text-sm min-h-[100px] max-h-[200px] overflow-y-auto select-text cursor-text"
                 >
                   {realtimeText || <span className="text-gray-600 italic">Waiting for speech...</span>}
                 </div>
               </div>
             </div>
           </div>
        )}

        {/* Task Selection - Hidden as not supported by current server */
        /*
        <div>
          <CyberLabel>Operation Mode</CyberLabel>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setTask('transcribe')}
              className={`flex-1 p-3 border font-display uppercase tracking-wider transition-all ${task === 'transcribe' ? 'border-cyber-cyan bg-cyber-cyan/10 text-cyber-cyan' : 'border-cyber-dim text-gray-600 hover:border-gray-500'}`}
            >
              Transcribe
            </button>
            <button
              type="button"
              onClick={() => setTask('translate')}
              className={`flex-1 p-3 border font-display uppercase tracking-wider transition-all ${task === 'translate' ? 'border-cyber-cyan bg-cyber-cyan/10 text-cyber-cyan' : 'border-cyber-dim text-gray-600 hover:border-gray-500'}`}
            >
              Translate
            </button>
          </div>
        </div>
        */}

        {/* Language Selection */}
        <div>
          <CyberLabel htmlFor="language">Source Language (Optional)</CyberLabel>
          <CyberSelect 
            id="language"
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="">Auto-detect</option>
            <optgroup label="Common">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese (Simplified)</option>
              <option value="ko">Korean</option>
            </optgroup>
            <optgroup label="Other">
              <option value="ar">Arabic</option>
              <option value="bg">Bulgarian</option>
              <option value="cs">Czech</option>
              <option value="da">Danish</option>
              <option value="el">Greek</option>
              <option value="fi">Finnish</option>
              <option value="hu">Hungarian</option>
              <option value="nl">Dutch</option>
              <option value="pl">Polish</option>
              <option value="ro">Romanian</option>
              <option value="sv">Swedish</option>
              <option value="tr">Turkish</option>
              <option value="uk">Ukrainian</option>
              <option value="vi">Vietnamese</option>
              <option value="th">Thai</option>
              <option value="hi">Hindi</option>
              <option value="id">Indonesian</option>
              <option value="ms">Malay</option>
              <option value="no">Norwegian</option>
            </optgroup>
          </CyberSelect>
        </div>

        {/* Model Selection */}
        <div className="col-span-1 md:col-span-2">
          <CyberLabel htmlFor="model">Model ({availableModels.length || '?'} available)</CyberLabel>
          <CyberSelect 
            id="model"
            value={model} 
            onChange={(e) => setModel(e.target.value)}
          >
            {availableModels.length > 0 ? (
              availableModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))
            ) : (
              <>
                <option value="glm-nano-2512">GLM-ASR-Nano-2512 (Default)</option>
              </>
            )}
          </CyberSelect>
          <p className="text-xs text-gray-500 mt-2">{availableModels.length > 0 ? `${availableModels.length} models available on server` : 'Connecting to server...'}</p>
        </div>

        {/* Temperature - Hidden as not supported by current server */
        /*
        <div className="col-span-1 md:col-span-2">
          <CyberLabel htmlFor="temperature">Temperature: {temperature.toFixed(2)}</CyberLabel>
          <input
            id="temperature"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 bg-cyber-dim rounded-lg appearance-none cursor-pointer accent-cyber-cyan"
          />
          <p className="text-xs text-gray-500 mt-2">Higher values = more creative, lower = more deterministic</p>
        </div>
        */}
      </div>

      <div className="pt-4">
        {mode !== 'realtime' && (
        <CyberButton 
          type="submit" 
          className="w-full py-4 text-xl disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={isLoading || !file}
        >
          {isLoading ? <span className="animate-pulse">PROCESSING DATA STREAM...</span> : <><Zap className="inline mr-2" /> EXECUTE PROTOCOL</>}
        </CyberButton>
        )}
      </div>
    </form>
  );
};
