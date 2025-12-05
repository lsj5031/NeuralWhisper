import React, { useState } from 'react';
import { StoredTask } from '../types';
import { CyberCard } from './CyberUI';
import { Trash2, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface TaskHistoryProps {
  tasks: StoredTask[];
  onDelete: (taskId: string) => void;
  onView: (task: StoredTask) => void;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({ tasks, onDelete, onView }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getPreview = (text: string) => {
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-cyber-dim text-gray-600 font-mono">
        NO TRANSCRIPTION HISTORY
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const isExpanded = expandedId === task.id;
        return (
          <CyberCard key={task.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : task.id)}
                  className="cursor-pointer flex items-start gap-3"
                >
                  <button className="mt-1 text-cyber-cyan hover:text-white transition-colors flex-shrink-0">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-gray-300 font-bold truncate">
                      {task.request.fileName}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-1 flex items-center gap-2">
                      <Clock size={12} />
                      {formatDate(task.timestamp)}
                    </div>
                    {task.request.language && (
                      <div className="text-xs text-cyber-yellow font-mono mt-1">
                        LANG: {task.request.language}
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-cyber-dim space-y-3">
                    <div>
                      <div className="text-xs text-gray-400 font-mono font-bold uppercase mb-2">
                        Transcription Preview
                      </div>
                      <div className="bg-cyber-black border border-cyber-dim rounded p-3 font-mono text-xs text-gray-300 max-h-40 overflow-y-auto">
                        {task.result.chunks ? (
                          <div className="space-y-2">
                            {task.result.chunks.slice(0, 3).map((chunk, idx) => (
                              <div key={idx} className="text-cyber-cyan opacity-75">
                                [{new Date(chunk.timestamp[0] * 1000).toISOString().substr(14, 5)}] {chunk.text}
                              </div>
                            ))}
                            {task.result.chunks.length > 3 && (
                              <div className="text-gray-500 italic">... and {task.result.chunks.length - 3} more chunks</div>
                            )}
                          </div>
                        ) : (
                          <p>{getPreview(task.result.text)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => onView(task)}
                        className="flex-1 px-3 py-2 bg-cyber-cyan text-black font-bold text-xs hover:bg-cyber-cyan/80 transition-colors rounded"
                      >
                        VIEW FULL
                      </button>
                      <button
                        onClick={() => {
                          onDelete(task.id);
                          setExpandedId(null);
                        }}
                        className="px-3 py-2 bg-cyber-dim border border-cyber-dim text-gray-400 hover:text-cyber-pink hover:border-cyber-pink font-bold text-xs transition-colors rounded flex items-center gap-1"
                      >
                        <Trash2 size={12} /> DELETE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CyberCard>
        );
      })}
    </div>
  );
};
