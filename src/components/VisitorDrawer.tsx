import React, { useState } from 'react';
import { Visitor } from '../types';
import { Users, UserCheck, Edit2, Check, Radio } from 'lucide-react';

interface VisitorDrawerProps {
  visitors: Visitor[];
  currentUser: Visitor | null;
  onRename: (newName: string) => void;
  serverUptime: number;
  totalInteractions: number;
}

export const VisitorDrawer: React.FC<VisitorDrawerProps> = ({
  visitors,
  currentUser,
  onRename,
  serverUptime,
  totalInteractions,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.name || '');

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onRename(nameInput.trim());
      setIsEditing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0d131f] text-slate-300">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
            Active Visitors
          </span>
        </div>
        <span className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {visitors.length} Online
        </span>
      </div>

      {/* Your Identity Card */}
      {currentUser && (
        <div className="p-3 bg-[#131d2e] border-b border-slate-800 shrink-0">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Your Session Identity</span>
            <span className="text-[10px] text-cyan-400">Collaborator</span>
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={20}
                className="bg-[#0f172a] border border-slate-700 text-xs px-2 py-1 rounded text-white focus:outline-none focus:border-cyan-500 flex-1"
                autoFocus
              />
              <button
                type="submit"
                className="p-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20"
                  style={{ backgroundColor: currentUser.color }}
                />
                <span className="text-sm font-semibold text-white">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  (You)
                </span>
              </div>
              <button
                onClick={() => {
                  setNameInput(currentUser.name);
                  setIsEditing(true);
                }}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Change display name"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Visitors List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-2">
          Co-Browsing Viewers ({visitors.length})
        </div>

        {visitors.map((v) => {
          const isYou = v.id === currentUser?.id;
          return (
            <div
              key={v.id}
              className={`p-2 rounded-lg border transition-all flex items-center justify-between ${
                isYou
                  ? 'bg-slate-800/60 border-cyan-500/30'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: v.color }}
                />
                <div>
                  <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                    {v.name}
                    {isYou && (
                      <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    ID: {v.id.substring(0, 8)}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-mono">
                  Active
                </span>
                {v.cursor && (
                  <div className="text-[9px] text-slate-500 font-mono tabular-nums">
                    ({Math.round(v.cursor.x)}, {Math.round(v.cursor.y)})
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 24/7 Session Stats */}
      <div className="p-3 bg-[#0a0e17] border-t border-slate-800/80 text-[11px] space-y-1.5 shrink-0">
        <div className="flex justify-between text-slate-400">
          <span>Server Uptime:</span>
          <span className="font-mono text-slate-200 tabular-nums">
            {formatDuration(serverUptime)}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Total Recorded Interferences:</span>
          <span className="font-mono text-cyan-400 tabular-nums">
            {totalInteractions.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>State Engine:</span>
          <span className="font-mono text-emerald-400">24/7 Persistent</span>
        </div>
      </div>
    </div>
  );
};
