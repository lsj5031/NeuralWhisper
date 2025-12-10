import React, { useState, useEffect } from 'react';
import { ApiConfig, TranscriptionRequest, TranscriptionResult, StoredTask } from './types';
import { submitTranscription, submitTranscriptionStream, checkConnection, fetchModels } from './services/apiService';
import { CyberCard, SectionHeader } from './components/CyberUI';
import { TranscriptionForm } from './components/TranscriptionForm';
import { ResultModal } from './components/TaskList';
import { TaskHistory } from './components/TaskHistory';
import { SettingsModal } from './components/SettingsModal';
import { Terminal, Settings, Github, Disc } from 'lucide-react';

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: localStorage.getItem('whisper_api_url') || 'http://localhost:8000',
  adminKey: localStorage.getItem('whisper_api_key') || '',
};

export default function App() {
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [viewResult, setViewResult] = useState<TranscriptionResult | null>(null);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [useStreaming] = useState(true); // Enable streaming by default
  const [tasks, setTasks] = useState<StoredTask[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('transcription_tasks');
    if (stored) {
      try {
        setTasks(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load tasks from localStorage:', e);
      }
    }
  }, []);

  // Fetch available models when config changes
  useEffect(() => {
    const loadModels = async () => {
      const models = await fetchModels(config);
      setAvailableModels(models);
    };
    loadModels();
  }, [config]);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('transcription_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const saveConfig = (newConfig: ApiConfig) => {
    localStorage.setItem('whisper_api_url', newConfig.baseUrl);
    if (newConfig.adminKey) {
        localStorage.setItem('whisper_api_key', newConfig.adminKey);
    } else {
        localStorage.removeItem('whisper_api_key');
    }
    setConfig(newConfig);
  };

  const handleSubmit = async (req: TranscriptionRequest) => {
    setLoading(true);
    setNotification(null);
    
    // Initialize empty result for streaming (opens modal immediately)
    if (useStreaming) {
      setViewResult({ text: '[STREAMING...] Initializing transcription...' });
    }
    
    try {
      let res: TranscriptionResult;
      
      if (useStreaming) {
        res = await submitTranscriptionStream(config, req, (chunk) => {
          // Update result as chunks arrive (service handles accumulation)
          setViewResult(chunk);
        });
      } else {
        res = await submitTranscription(config, req);
      }
      
      setNotification({ msg: 'Transcription Complete.', type: 'success' });
      setViewResult(res);
      
      // Save task to localStorage
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newTask: StoredTask = {
        id: taskId,
        request: {
          fileName: req.file.name,
          model: req.model,
          language: req.language,
          task: req.task,
          temperature: req.temperature,
          stream: req.stream,
        },
        result: res,
        timestamp: Date.now(),
      };
      setTasks([newTask, ...tasks]);
      setCurrentTaskId(taskId);
    } catch (e: any) {
      setNotification({ msg: e.message || 'Transmission Failed', type: 'error' });
      setViewResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black text-gray-300 font-sans selection:bg-cyber-cyan selection:text-black pb-20">
      {/* Background Grid */}
      <div className="fixed inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-cyber-dim bg-cyber-black/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-cyber-cyan text-black flex items-center justify-center font-bold text-xl relative overflow-hidden">
                <Disc className="animate-spin w-6 h-6" />
                <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-white tracking-widest leading-none">
                NEURAL<span className="text-cyber-cyan">WHISPER</span>
              </h1>
              <div className="text-[10px] font-mono text-gray-500 tracking-[0.3em] uppercase">Audio Transcription Interface</div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-gray-500 hover:text-cyber-cyan transition-colors"
                title="Configuration"
            >
                <Settings />
            </button>
            <a href="https://github.com/lsj5031/NeuralWhisper" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors">
                <Github />
            </a>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-24 right-6 z-50 p-4 border max-w-sm animate-in slide-in-from-right fade-in duration-300 ${notification.type === 'success' ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-400'}`}>
            <p className="font-mono text-sm font-bold">{notification.type === 'success' ? 'SUCCESS' : 'ERROR'}</p>
            <p className="font-mono text-xs mt-1">{notification.msg}</p>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
         <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <SectionHeader title="Initiate Protocol" subtitle="Configure transcription parameters for neural processing." />
             <CyberCard className="p-8">
                <TranscriptionForm onSubmit={handleSubmit} isLoading={loading} availableModels={availableModels} />
             </CyberCard>
         </section>

         {/* Results Section */}
         {viewResult && (
           <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-12">
             <SectionHeader title="Transcription Result" subtitle="Full transcription output from neural processing." />
             <CyberCard className="p-8">
               <div className="space-y-4">
                 {(viewResult.language || viewResult.speakers) && (
                   <div className="flex gap-4 pb-4 border-b border-cyber-dim flex-wrap">
                     {viewResult.language && (
                       <div className="bg-cyber-panel px-3 py-1 border border-cyber-dim text-xs text-gray-400">
                         LANGUAGE: <span className="text-cyber-yellow uppercase">{viewResult.language}</span>
                       </div>
                     )}
                     {viewResult.speakers && (
                       <div className="bg-cyber-panel px-3 py-1 border border-cyber-dim text-xs text-gray-400">
                         SPEAKERS: <span className="text-cyber-pink">{viewResult.speakers.length}</span>
                       </div>
                     )}
                   </div>
                 )}
                 
                 <div className="bg-cyber-black border border-cyber-dim rounded p-4 font-mono text-sm leading-relaxed max-h-96 overflow-y-auto">
                   {viewResult.chunks ? (
                     <div className="space-y-3">
                       {viewResult.chunks.map((chunk, idx) => (
                         <div key={idx} className="border-l-2 border-cyber-cyan pl-3 py-1">
                           <div className="text-xs text-cyber-cyan opacity-75 mb-1">
                             [{new Date(chunk.timestamp[0] * 1000).toISOString().substr(14, 5)} → {new Date(chunk.timestamp[1] * 1000).toISOString().substr(14, 5)}]
                             {chunk.speaker && <span className="ml-2 text-cyber-pink">• {chunk.speaker}</span>}
                           </div>
                           <p className="text-gray-300">{chunk.text}</p>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <p className="text-gray-300 whitespace-pre-wrap">
                       {viewResult.text?.replace('[STREAMING...] ', '') || 'No transcription text available'}
                     </p>
                   )}
                 </div>

                 <div className="flex gap-3 pt-4">
                   <button
                     onClick={() => {
                       const text = viewResult.chunks
                         ? viewResult.chunks.map(c => c.text).join('\n')
                         : viewResult.text?.replace('[STREAMING...] ', '') || '';
                       navigator.clipboard.writeText(text);
                       setNotification({ msg: 'Text copied to clipboard.', type: 'success' });
                     }}
                     className="px-4 py-2 bg-cyber-cyan text-black font-bold text-sm hover:bg-cyber-cyan/80 transition-colors rounded"
                   >
                     COPY TEXT
                   </button>
                   <button
                     onClick={() => setViewResult(null)}
                     className="px-4 py-2 bg-cyber-dim border border-cyber-dim text-gray-400 font-bold text-sm hover:text-cyber-cyan transition-colors rounded"
                   >
                     CLEAR
                   </button>
                 </div>
               </div>
             </CyberCard>
           </section>
         )}

         {/* Task History Section */}
         {tasks.length > 0 && (
           <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-12">
             <SectionHeader title="Processing History" subtitle="Previous transcription tasks and results." />
             <CyberCard className="p-8">
               <TaskHistory 
                 tasks={tasks}
                 onDelete={(taskId) => {
                   setTasks(tasks.filter(t => t.id !== taskId));
                   setNotification({ msg: 'Task deleted.', type: 'success' });
                 }}
                 onView={(task) => {
                   setViewResult(task.result);
                   setCurrentTaskId(task.id);
                 }}
               />
             </CyberCard>
           </section>
         )}
          </main>

         {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        currentConfig={config}
        onSave={saveConfig}
        forceOpen={false}
      />

      <ResultModal 
        result={viewResult} 
        onClose={() => setViewResult(null)} 
      />

      <footer className="text-center text-gray-700 font-mono text-xs py-12">
        NEURAL WHISPER INTERFACE v1.0.0 // SYSTEM ONLINE
      </footer>
    </div>
  );
}