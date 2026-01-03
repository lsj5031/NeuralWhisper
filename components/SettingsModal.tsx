import React, { useState, useEffect } from 'react';
import { CyberButton, CyberInput, CyberLabel, CyberCard } from './CyberUI';
import { ApiConfig } from '../types';
import { checkConnection } from '../services/apiService';
import { Settings, Power, Wifi, AlertTriangle } from 'lucide-react';

interface SettingsModalProps {
  currentConfig: ApiConfig;
  onSave: (config: ApiConfig) => void;
  isOpen: boolean;
  onClose: () => void;
  forceOpen?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ currentConfig, onSave, isOpen, onClose, forceOpen }) => {
  const [baseUrl, setBaseUrl] = useState(currentConfig.baseUrl);
  const [adminKey, setAdminKey] = useState(currentConfig.adminKey || '');
  const [useStreaming, setUseStreaming] = useState(currentConfig.useStreaming ?? true);
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

  useEffect(() => {
    setBaseUrl(currentConfig.baseUrl);
    setAdminKey(currentConfig.adminKey || '');
    setUseStreaming(currentConfig.useStreaming ?? true);
  }, [currentConfig, isOpen]);

  const handleTestAndSave = async () => {
    setStatus('checking');
    const configToTest = { 
      baseUrl, 
      adminKey: adminKey || undefined,
      useStreaming
    };
    
    // Quick validation
    if (!baseUrl) {
        setStatus('error');
        return;
    }

    const isConnected = await checkConnection(configToTest);
    
    if (isConnected) {
      setStatus('success');
      setTimeout(() => {
        onSave(configToTest);
        if (!forceOpen) onClose();
      }, 800);
    } else {
      setStatus('error');
    }
  };

  if (!isOpen && !forceOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md">
        <CyberCard title="SYSTEM CONFIGURATION" className="bg-cyber-dark shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <div className="space-y-6">
                <div className="flex items-center justify-center mb-6 text-cyber-cyan">
                    <Power className={`w-12 h-12 ${status === 'checking' ? 'animate-pulse' : ''}`} />
                </div>

                <div className="space-y-4">
                    <div>
                         <CyberLabel htmlFor="api-url">API Base URL</CyberLabel>
                         <CyberInput
                             id="api-url"
                             type="url"
                             placeholder="http://localhost:8000"
                             value={baseUrl}
                             onChange={(e) => setBaseUrl(e.target.value)}
                             required
                         />
                         <p className="text-xs text-gray-500 mt-2 font-mono">Base URL without /v1 path</p>
                     </div>
                    
                    <div>
                        <CyberLabel htmlFor="api-key">Admin Access Key (Optional)</CyberLabel>
                        <CyberInput
                            id="api-key"
                            type="password"
                            placeholder="••••••••••••••"
                            value={adminKey}
                            onChange={(e) => setAdminKey(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-cyber-panel/50 border border-cyber-dim">
                        <input
                            id="use-streaming"
                            type="checkbox"
                            className="w-4 h-4 accent-cyber-cyan bg-cyber-black border-cyber-dim rounded focus:ring-cyber-cyan"
                            checked={useStreaming}
                            onChange={(e) => setUseStreaming(e.target.checked)}
                        />
                        <div>
                            <CyberLabel htmlFor="use-streaming" className="mb-0 cursor-pointer">Enable SSE Streaming</CyberLabel>
                            <p className="text-[10px] text-gray-500 font-mono">Process results in real-time as they arrive</p>
                        </div>
                    </div>
                </div>

                {status === 'error' && (
                    <div className="flex items-center gap-2 text-cyber-pink border border-cyber-pink/30 bg-cyber-pink/10 p-3 font-mono text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>CONNECTION FAILED. CHECK URL.</span>
                    </div>
                )}
                
                {status === 'success' && (
                    <div className="flex items-center gap-2 text-green-400 border border-green-500/30 bg-green-500/10 p-3 font-mono text-sm">
                        <Wifi className="w-4 h-4" />
                        <span>LINK ESTABLISHED. SYSTEM READY.</span>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                    {!forceOpen && (
                        <CyberButton variant="secondary" onClick={onClose}>
                            Cancel
                        </CyberButton>
                    )}
                    <CyberButton onClick={handleTestAndSave} disabled={status === 'checking'}>
                        {status === 'checking' ? 'Connecting...' : 'Initialize Link'}
                    </CyberButton>
                </div>
            </div>
        </CyberCard>
      </div>
    </div>
  );
};
