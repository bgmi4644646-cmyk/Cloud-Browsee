import React, { useState } from 'react';
import { SessionGuardTelemetry } from '../types';
import { ShieldCheck, Zap, Radio, Gamepad2, Eye, Flame, Check } from 'lucide-react';

interface CloudGameGuardPanelProps {
  telemetry?: SessionGuardTelemetry;
  zeroVisitors: boolean;
  onNavigateGame: () => void;
}

export const CloudGameGuardPanel: React.FC<CloudGameGuardPanelProps> = ({
  telemetry,
  zeroVisitors,
  onNavigateGame,
}) => {
  const [pulsing, setPulsing] = useState(false);
  const [pulseSuccess, setPulseSuccess] = useState(false);

  const handleTriggerPulse = async () => {
    setPulsing(true);
    try {
      await fetch('/api/guard/trigger-pulse', { method: 'POST' });
      setPulseSuccess(true);
      setTimeout(() => setPulseSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setPulsing(false);
    }
  };

  const pulseCount = telemetry?.afkPulseCount || 0;
  const isZeroCustody = zeroVisitors || telemetry?.zeroVisitorCustody;

  return (
    <div className="flex flex-col h-full bg-[#0d131f] text-slate-300">
      <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
            Cloud Game & Anti-AFK Guard
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE 24/7
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {/* Status Card */}
        <div className="bg-[#131d2e] p-3 rounded-lg border border-emerald-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Perpetual Session Custody
            </span>
            <span className="text-[10px] font-mono text-emerald-300">
              {isZeroCustody ? 'ZERO-VISITOR MODE' : 'CO-BROWSING'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            When all human visitors close their tabs, antideploy continues running the session on the server. Cloud games (GeForce Now, Xbox Cloud, WebGL MMORPGs) are prevented from timing out or disconnecting.
          </p>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800">
            <div>
              <span className="text-slate-500">AFK Protection:</span>{' '}
              <span className="text-emerald-400 font-medium">Locked Active</span>
            </div>
            <div>
              <span className="text-slate-500">Pulse Cadence:</span>{' '}
              <span className="text-cyan-400 font-mono">Every 25s</span>
            </div>
            <div>
              <span className="text-slate-500">Total Pulses:</span>{' '}
              <span className="text-amber-400 font-mono tabular-nums">{pulseCount}</span>
            </div>
            <div>
              <span className="text-slate-500">Disk Persistence:</span>{' '}
              <span className="text-emerald-400 font-medium">Enabled</span>
            </div>
          </div>
        </div>

        {/* Protection Pillars */}
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Active Anti-Disconnect Defenses
          </div>

          {/* Defense 1 */}
          <div className="p-2.5 bg-[#0a0e17] rounded-lg border border-slate-800 flex items-start gap-2.5">
            <Eye className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-slate-200 font-semibold text-[11px]">
                Tab Visibility & Focus Spoofing
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                Locks <code className="text-cyan-300">document.visibilityState = 'visible'</code> and suppress blur events so streaming games never pause video, audio, or game loops.
              </div>
            </div>
          </div>

          {/* Defense 2 */}
          <div className="p-2.5 bg-[#0a0e17] rounded-lg border border-slate-800 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-slate-200 font-semibold text-[11px]">
                Synthetic Micro-Input Pulses
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                Dispatches subtle micro-movement and keyup null events every 25s, defeating idle detectors that kick players after inactivity.
              </div>
            </div>
          </div>

          {/* Defense 3 */}
          <div className="p-2.5 bg-[#0a0e17] rounded-lg border border-slate-800 flex items-start gap-2.5">
            <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-slate-200 font-semibold text-[11px]">
                Unthrottled Animation & Timer Loops
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                Bypasses background tab browser clamping so game physics, WebSockets, and bots continue at full rate.
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <button
            onClick={onNavigateGame}
            className="w-full py-2 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Gamepad2 className="w-4 h-4" />
            Launch 24/7 Neon Orbital Arena
          </button>

          <button
            onClick={handleTriggerPulse}
            disabled={pulsing}
            className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
          >
            {pulseSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Anti-AFK Pulse Emitted!</span>
              </>
            ) : (
              <>
                <Radio className={`w-3.5 h-3.5 text-cyan-400 ${pulsing ? 'animate-spin' : ''}`} />
                <span>Test Anti-AFK Pulse Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
