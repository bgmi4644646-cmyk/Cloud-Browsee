import React from 'react';
import { ActionEntry } from '../types';
import { Activity, Clock } from 'lucide-react';

interface LiveActionFeedProps {
  actions: ActionEntry[];
}

export const LiveActionFeed: React.FC<LiveActionFeedProps> = ({ actions }) => {
  const getActionColor = (action: ActionEntry['action']) => {
    switch (action) {
      case 'navigate':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-800';
      case 'click':
        return 'text-rose-400 bg-rose-950/60 border-rose-800';
      case 'input':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      case 'tab':
        return 'text-amber-400 bg-amber-950/60 border-amber-800';
      case 'notes':
        return 'text-purple-400 bg-purple-950/60 border-purple-800';
      case 'chat':
        return 'text-indigo-400 bg-indigo-950/60 border-indigo-800';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0d131f] text-slate-300">
      <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
            Live Interference Stream
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono tabular-nums">
          {actions.length} events
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
        {actions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Waiting for browser interactions... Click or navigate to see real-time events.
          </div>
        ) : (
          actions.map((act) => (
            <div
              key={act.id}
              className="py-1.5 px-2 rounded hover:bg-slate-800/40 transition-colors flex items-start gap-2 text-xs"
            >
              {/* Timestamp */}
              <span className="text-[10px] text-slate-500 font-mono shrink-0 pt-0.5 tabular-nums">
                {formatTime(act.timestamp)}
              </span>

              {/* User indicator */}
              <span
                className="font-medium shrink-0 flex items-center gap-1"
                style={{ color: act.userColor }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: act.userColor }}
                />
                {act.userName}
              </span>

              {/* Action badge */}
              <span
                className={`text-[10px] font-mono uppercase px-1 py-0.2 rounded border shrink-0 ${getActionColor(
                  act.action
                )}`}
              >
                {act.action}
              </span>

              {/* Detail */}
              <span className="text-slate-300 break-words flex-1 min-w-0 font-mono text-[11px]">
                {act.detail}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
