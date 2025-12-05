import React from 'react';
import { TranscriptionResult } from '../types';
import { CyberCard, CyberButton } from './CyberUI';
import { Speaker } from 'lucide-react';

export const ResultModal = ({ result, onClose }: { result: TranscriptionResult | null; onClose: () => void }) => {
    if (!result) return null;

    const isStreaming = result.text?.includes('[STREAMING...]') || false;
    const displayText = result.text?.replace('[STREAMING...] ', '') || '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="w-full max-w-4xl h-[85vh] flex flex-col">
                <CyberCard title={isStreaming ? "DECODING OUTPUT [LIVE]" : "DECODED OUTPUT"} className="flex-1 flex flex-col overflow-hidden bg-cyber-dark border-cyber-cyan shadow-[0_0_100px_rgba(0,240,255,0.15)]">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-cyber-dim scrollbar-track-transparent">
                        
                        {isStreaming && (
                            <div className="bg-cyber-cyan/10 border border-cyber-cyan px-3 py-2 rounded text-cyber-cyan text-xs font-bold mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-cyber-cyan rounded-full animate-pulse" />
                                STREAMING IN PROGRESS
                            </div>
                        )}

                        {/* Summary Stats */}
                        {(result.language || result.speakers) && !isStreaming && (
                            <div className="flex gap-4 mb-6 pb-4 border-b border-cyber-dim">
                                {result.language && (
                                    <div className="bg-cyber-panel px-3 py-1 border border-cyber-dim text-xs text-gray-400">
                                        LANG: <span className="text-cyber-yellow uppercase">{result.language}</span>
                                    </div>
                                )}
                                {result.speakers && (
                                    <div className="bg-cyber-panel px-3 py-1 border border-cyber-dim text-xs text-gray-400">
                                        SPEAKERS: <span className="text-cyber-pink">{result.speakers.length}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {result.chunks ? (
                            result.chunks.map((chunk, idx) => (
                                <div key={idx} className="group hover:bg-white/5 p-2 rounded transition-colors border-l-2 border-transparent hover:border-cyber-cyan">
                                    <div className="flex items-center gap-3 mb-1 opacity-50 text-xs">
                                        <span className="text-cyber-cyan">
                                            [{new Date(chunk.timestamp[0] * 1000).toISOString().substr(14, 5)} 
                                            {' -> '} 
                                            {new Date(chunk.timestamp[1] * 1000).toISOString().substr(14, 5)}]
                                        </span>
                                        {chunk.speaker && (
                                            <span className="text-cyber-pink font-bold flex items-center gap-1">
                                                <Speaker size={10} /> {chunk.speaker}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-300">{chunk.text}</p>
                                </div>
                            ))
                        ) : (
                            <p className={`whitespace-pre-wrap ${isStreaming ? 'text-cyber-cyan' : 'text-gray-300'}`}>
                                {displayText || (isStreaming ? 'Initializing transcription...' : '')}
                            </p>
                        )}
                    </div>
                    <div className="p-4 border-t border-cyber-dim flex justify-end gap-3 bg-cyber-black">
                         <CyberButton variant="secondary" onClick={() => navigator.clipboard.writeText(displayText || JSON.stringify(result))} className="text-sm">
                            COPY RAW
                        </CyberButton>
                        <CyberButton onClick={onClose} className="text-sm">
                            CLOSE TERMINAL
                        </CyberButton>
                    </div>
                </CyberCard>
            </div>
        </div>
    );
}
