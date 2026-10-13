import React from 'react';
import { BrowserServerState } from '../types';
import { Terminal, Database, ShieldCheck, Check } from 'lucide-react';

interface ServerStateInspectorProps {
  serverState: BrowserServerState;
  uptime: number;
  serverStartTime: number;
  visitorsCount: number;
}

export const ServerStateInspector: React.FC<ServerStateInspectorProps> = ({
  serverState,
  uptime,
  serverStartTime,
  visitorsCount,
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(serverState, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d131f] text-slate-300 font-mono text-xs">
      <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-sans">
            24/7 Server State
          </span>
        </div>
        <button
          onClick={copyJson}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-sans"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : null}
          {copied ? 'Copied State' : 'Copy JSON'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Memory overview */}
        <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="text-[11px] font-sans font-semibold text-white uppercase tracking-wider flex items-center justify-between">
            <span>Runtime Metadata</span>
            <span className="text-emerald-400 font-mono text-[10px]">● AUTHORITATIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500">Host Engine:</span>{' '}
              <span className="text-slate-200">antideploy Node.js</span>
            </div>
            <div>
              <span className="text-slate-500">Active Tabs:</span>{' '}
              <span className="text-cyan-300">{serverState.tabs.length}</span>
            </div>
            <div>
              <span className="text-slate-500">Current Tab ID:</span>{' '}
              <span className="text-slate-300">{serverState.activeTabId}</span>
            </div>
            <div>
              <span className="text-slate-500">Total Actions:</span>{' '}
              <span className="text-amber-300 tabular-nums">{serverState.totalInteractions}</span>
            </div>
            <div>
              <span className="text-slate-500">Scroll X/Y:</span>{' '}
              <span className="text-slate-300 tabular-nums">
                ({serverState.scrollPosition.scrollX}, {serverState.scrollPosition.scrollY})
              </span>
            </div>
            <div>
              <span className="text-slate-500">Started:</span>{' '}
              <span className="text-slate-400">
                {new Date(serverStartTime).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Persisted Form Fields */}
        <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800">
          <div className="text-[11px] font-sans font-semibold text-white uppercase tracking-wider mb-2">
            Persisted Form State ({Object.keys(serverState.formValues || {}).length} fields)
          </div>
          {Object.keys(serverState.formValues || {}).length === 0 ? (
            <div className="text-[11px] text-slate-500 italic font-sans">
              No form inputs modified yet. Type in any input field on the page to watch values persist here.
            </div>
          ) : (
            <div className="space-y-1">
              {Object.entries(serverState.formValues).map(([key, val]) => (
                <div key={key} className="bg-[#0b0f19] p-1.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-cyan-400">{key}</span>
                  <span className="text-slate-300 truncate max-w-[150px]">"{val}"</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Raw State JSON preview */}
        <div>
          <div className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Raw State Tree
          </div>
          <pre className="p-2.5 bg-[#080d16] border border-slate-800/80 rounded-md text-[10px] text-slate-300 overflow-x-auto leading-relaxed max-h-56">
            {JSON.stringify(serverState, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
