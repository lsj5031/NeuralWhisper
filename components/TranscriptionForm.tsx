import React, { useState, useRef } from 'react';
import { CyberButton, CyberLabel, CyberSelect, CyberCard } from './CyberUI';
import { TranscriptionRequest } from '../types';
import { UploadCloud, Zap, Mic, Square } from 'lucide-react';

const DEFAULT_MODEL = 'Systran/faster-distil-whisper-large-v3';

interface TranscriptionFormProps {
  onSubmit: (data: TranscriptionRequest) => void;
  isLoading: boolean;
  autoStartAfterRecord?: boolean;
}

export const TranscriptionForm: React.FC<TranscriptionFormProps> = ({ onSubmit, isLoading, autoStartAfterRecord = true }) => {
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
        {/* File Upload or Microphone */}
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

        {/* Task Selection */}
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
          <CyberLabel htmlFor="model">Model (232 available)</CyberLabel>
          <CyberSelect 
            id="model"
            value={model} 
            onChange={(e) => setModel(e.target.value)}
          >
            <optgroup label="Popular (Systran)">
              <option value="Systran/faster-distil-whisper-large-v3">Distil Whisper Large V3 (Fastest)</option>
              <option value="Systran/faster-whisper-large-v3">Whisper Large V3 (Accurate)</option>
              <option value="Systran/faster-whisper-large-v2">Whisper Large V2</option>
              <option value="Systran/faster-whisper-medium">Whisper Medium</option>
              <option value="Systran/faster-whisper-small">Whisper Small</option>
              <option value="Systran/faster-whisper-base">Whisper Base</option>
              <option value="Systran/faster-whisper-tiny">Whisper Tiny</option>
            </optgroup>
            <optgroup label="English-Only (Systran)">
              <option value="Systran/faster-whisper-medium.en">Whisper Medium.en</option>
              <option value="Systran/faster-whisper-small.en">Whisper Small.en</option>
              <option value="Systran/faster-whisper-base.en">Whisper Base.en</option>
              <option value="Systran/faster-whisper-tiny.en">Whisper Tiny.en</option>
            </optgroup>
            <optgroup label="Alternative Implementations">
              <option value="deepdml/faster-whisper-large-v3-turbo-ct2">Large V3 Turbo (Deepdml)</option>
              <option value="deepdml/faster-distil-whisper-large-v3.5">Distil V3.5 (Deepdml)</option>
            </optgroup>
          </CyberSelect>
          <p className="text-xs text-gray-500 mt-2">232 models available on server</p>
        </div>

        {/* Temperature */}
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
      </div>

      <div className="pt-4">
        <CyberButton 
          type="submit" 
          className="w-full py-4 text-xl disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={isLoading || !file}
        >
          {isLoading ? <span className="animate-pulse">PROCESSING DATA STREAM...</span> : <><Zap className="inline mr-2" /> EXECUTE PROTOCOL</>}
        </CyberButton>
      </div>
    </form>
  );
};
