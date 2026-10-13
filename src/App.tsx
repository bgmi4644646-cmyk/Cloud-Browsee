import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Tab,
  ActionEntry,
  Visitor,
  RemoteCursor,
  RemoteClick,
  ChatMessage,
  BrowserServerState,
  SessionGuardTelemetry,
} from './types';
import { VirtualBrowser } from './components/VirtualBrowser';
import { LiveActionFeed } from './components/LiveActionFeed';
import { VisitorDrawer } from './components/VisitorDrawer';
import { IntercomChat } from './components/IntercomChat';
import { ServerStateInspector } from './components/ServerStateInspector';
import { CloudGameGuardPanel } from './components/CloudGameGuardPanel';
import {
  Activity,
  Users,
  MessageSquare,
  Database,
  Globe,
  Radio,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Gamepad2,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  // WebSocket and connection state
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentVisitor, setCurrentVisitor] = useState<Visitor | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  // Browser state
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'tab-1',
      title: 'antideploy Hub',
      url: 'antideploy://hub',
      favicon: '🌐',
      zoom: 100,
    },
    {
      id: 'tab-2',
      title: '24/7 Cloud Game Arena',
      url: 'antideploy://game',
      favicon: '🎮',
      zoom: 100,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [history, setHistory] = useState<Array<{ url: string; title: string }>>([
    { url: 'antideploy://hub', title: 'antideploy Hub' },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Synchronized state
  const [remoteScrollPosition, setRemoteScrollPosition] = useState<{
    scrollX: number;
    scrollY: number;
  } | null>(null);
  const [remoteInputUpdate, setRemoteInputUpdate] = useState<{
    selector?: string;
    value: string;
    id?: string;
    name?: string;
  } | null>(null);
  const [remoteNotesContent, setRemoteNotesContent] = useState<string | null>(null);
  const [syncScroll, setSyncScroll] = useState(true);

  // Multi-user cursor & click tracking
  const [cursors, setCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [clicks, setClicks] = useState<RemoteClick[]>([]);

  // 24/7 Session Guard & Anti-AFK Telemetry
  const [guardTelemetry, setGuardTelemetry] = useState<SessionGuardTelemetry>({
    active: true,
    zeroVisitorCustody: false,
    afkPulseCount: 0,
    lastPulseTimestamp: Date.now(),
    pulseIntervalSec: 25,
    visibilitySpoofed: true,
    focusLocked: true,
    unthrottledTimers: true,
  });

  // Server stats & logs
  const [actionLog, setActionLog] = useState<ActionEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [serverUptime, setServerUptime] = useState(0);
  const [serverStartTime, setServerStartTime] = useState(Date.now());
  const [totalInteractions, setTotalInteractions] = useState(0);
  const [fullServerState, setFullServerState] = useState<BrowserServerState>({
    tabs: [],
    activeTabId: 'tab-1',
    history: [],
    historyIndex: 0,
    scrollPosition: { scrollX: 0, scrollY: 0 },
    formValues: {},
    sharedNotes: '',
    pixelGrid: {},
    totalInteractions: 0,
  });

  // UI Dock active tab
  const [dockTab, setDockTab] = useState<'stream' | 'visitors' | 'guard' | 'chat' | 'state'>('guard');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Throttle cursor sends
  const lastCursorSendRef = useRef(0);

  // Connect to WebSocket
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: any;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'init': {
              const {
                assignedUser,
                browserState,
                visitors: initVisitors,
                actionLog: initActions,
                uptime,
                serverStartTime: sStart,
                guardTelemetry: gTelem,
              } = msg.data;

              setCurrentVisitor(assignedUser);
              setTabs(browserState.tabs || []);
              setActiveTabId(browserState.activeTabId || 'tab-1');
              setHistory(browserState.history || []);
              setHistoryIndex(browserState.historyIndex || 0);
              setVisitors(initVisitors || []);
              setActionLog(initActions || []);
              setServerUptime(uptime || 0);
              setServerStartTime(sStart || Date.now());
              setTotalInteractions(browserState.totalInteractions || 0);
              setFullServerState(browserState);
              if (gTelem) setGuardTelemetry(gTelem);
              break;
            }

            case 'guard:pulse': {
              if (msg.telemetry) {
                setGuardTelemetry(msg.telemetry);
              }
              break;
            }

            case 'user:joined': {
              setVisitors((prev) => {
                if (prev.some((v) => v.id === msg.visitor.id)) return prev;
                return [...prev, msg.visitor];
              });
              break;
            }

            case 'user:left': {
              setVisitors((prev) => prev.filter((v) => v.id !== msg.userId));
              setCursors((prev) => {
                const updated = new Map(prev);
                updated.delete(msg.userId);
                return updated;
              });
              break;
            }

            case 'user:updated': {
              setVisitors((prev) =>
                prev.map((v) => (v.id === msg.visitor.id ? msg.visitor : v))
              );
              break;
            }

            case 'cursor:update': {
              setCursors((prev) => {
                const next = new Map(prev);
                next.set(msg.userId, {
                  userId: msg.userId,
                  userName: msg.userName,
                  userColor: msg.userColor,
                  x: msg.x,
                  y: msg.y,
                });
                return next;
              });
              break;
            }

            case 'browser:navigated': {
              setTabs((prev) =>
                prev.map((t) =>
                  t.id === msg.tabId
                    ? { ...t, url: msg.url, title: msg.title || t.title }
                    : t
                )
              );
              if (msg.action) {
                setActionLog((prev) => [msg.action, ...prev.slice(0, 99)]);
                setTotalInteractions((c) => c + 1);
              }
              break;
            }

            case 'browser:clicked': {
              const newClick: RemoteClick = {
                id: `click_${Date.now()}_${Math.random()}`,
                userId: msg.userId,
                userName: msg.userName,
                userColor: msg.userColor,
                x: msg.x,
                y: msg.y,
                selector: msg.selector,
              };
              setClicks((prev) => [...prev.slice(-15), newClick]);
              setTimeout(() => {
                setClicks((prev) => prev.filter((c) => c.id !== newClick.id));
              }, 1200);

              if (msg.action) {
                setActionLog((prev) => [msg.action, ...prev.slice(0, 99)]);
                setTotalInteractions((c) => c + 1);
              }
              break;
            }

            case 'browser:input_updated': {
              setRemoteInputUpdate({
                selector: msg.selector,
                value: msg.value,
                id: msg.id,
                name: msg.name,
              });
              break;
            }

            case 'browser:scrolled': {
              setRemoteScrollPosition({
                scrollX: msg.scrollX,
                scrollY: msg.scrollY,
              });
              break;
            }

            case 'browser:tab_created': {
              setTabs((prev) => [...prev, msg.tab]);
              setActiveTabId(msg.tab.id);
              if (msg.action) {
                setActionLog((prev) => [msg.action, ...prev.slice(0, 99)]);
                setTotalInteractions((c) => c + 1);
              }
              break;
            }

            case 'browser:tab_closed': {
              setTabs((prev) => prev.filter((t) => t.id !== msg.tabId));
              setActiveTabId(msg.newActiveTabId);
              if (msg.action) {
                setActionLog((prev) => [msg.action, ...prev.slice(0, 99)]);
                setTotalInteractions((c) => c + 1);
              }
              break;
            }

            case 'browser:tab_switched': {
              setActiveTabId(msg.tabId);
              if (msg.action) {
                setActionLog((prev) => [msg.action, ...prev.slice(0, 99)]);
                setTotalInteractions((c) => c + 1);
              }
              break;
            }

            case 'browser:notes_synced': {
              setRemoteNotesContent(msg.content);
              break;
            }

            case 'chat:message': {
              setChatMessages((prev) => [...prev, msg.message]);
              if (msg.action) {
                setActionLog((prev) => [msg.action, ...prev.slice(0, 99)]);
                setTotalInteractions((c) => c + 1);
              }
              break;
            }
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    const interval = setInterval(() => {
      setServerUptime((u) => u + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  const sendMessage = useCallback((payload: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const handleSendCursorMove = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - lastCursorSendRef.current > 35) {
        lastCursorSendRef.current = now;
        sendMessage({ type: 'cursor:move', x, y });
      }
    },
    [sendMessage]
  );

  const handleNavigate = useCallback(
    (url: string, title?: string) => {
      sendMessage({
        type: 'browser:navigate',
        url,
        tabId: activeTabId,
        title,
      });
    },
    [sendMessage, activeTabId]
  );

  const handleSendClick = useCallback(
    (x: number, y: number, selector?: string, text?: string, tagName?: string) => {
      sendMessage({
        type: 'browser:click',
        x,
        y,
        selector,
        text,
        tagName,
      });
    },
    [sendMessage]
  );

  const handleSendInput = useCallback(
    (selector: string, value: string, id?: string, name?: string) => {
      sendMessage({
        type: 'browser:input',
        selector,
        value,
        id,
        name,
        tabId: activeTabId,
      });
    },
    [sendMessage, activeTabId]
  );

  const handleSendScroll = useCallback(
    (scrollX: number, scrollY: number) => {
      sendMessage({
        type: 'browser:scroll',
        scrollX,
        scrollY,
      });
    },
    [sendMessage]
  );

  const handleSendNotesUpdate = useCallback(
    (content: string) => {
      sendMessage({
        type: 'browser:notes:update',
        content,
      });
    },
    [sendMessage]
  );

  const handleTabSwitch = useCallback(
    (tabId: string) => {
      sendMessage({
        type: 'browser:tab:switch',
        tabId,
      });
    },
    [sendMessage]
  );

  const handleTabAdd = useCallback(
    (url = 'antideploy://hub') => {
      sendMessage({
        type: 'browser:tab:add',
        url,
      });
    },
    [sendMessage]
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      sendMessage({
        type: 'browser:tab:close',
        tabId,
      });
    },
    [sendMessage]
  );

  const handleSendChat = useCallback(
    (text: string) => {
      sendMessage({
        type: 'chat:send',
        text,
      });
    },
    [sendMessage]
  );

  const handleRename = useCallback(
    (name: string) => {
      sendMessage({
        type: 'user:rename',
        name,
      });
      if (currentVisitor) {
        setCurrentVisitor({ ...currentVisitor, name });
      }
    },
    [sendMessage, currentVisitor]
  );

  const formatUptime = (sec: number) => {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100">
      {/* 1. TOP BAR CONTRACT */}
      <header className="flex items-center justify-between gap-8 px-5 py-2.5 bg-[#0d131f] border-b border-slate-800 shrink-0">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            className="text-lg font-bold tracking-tight text-white flex items-center gap-2 whitespace-nowrap"
          >
            <span className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center text-xs font-mono font-bold text-slate-950 shadow-sm">
              ad
            </span>
            <span>antideploy.com</span>
          </a>
          <span className="hidden sm:inline-block text-[11px] text-slate-500 font-mono border-l border-slate-800 pl-3">
            24/7 Cloud Game & Server Browser
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => {
              setDockTab('guard');
              setDockCollapsed(false);
            }}
            className={`transition-colors whitespace-nowrap hover:text-white flex items-center gap-1.5 ${
              dockTab === 'guard' && !dockCollapsed ? 'text-emerald-400 font-semibold' : ''
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cloud Game Guard</span>
          </button>

          <button
            onClick={() => {
              setDockTab('stream');
              setDockCollapsed(false);
            }}
            className={`transition-colors whitespace-nowrap hover:text-white ${
              dockTab === 'stream' && !dockCollapsed ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Interference Stream
          </button>
          
          <button
            onClick={() => {
              setDockTab('visitors');
              setDockCollapsed(false);
            }}
            className={`transition-colors whitespace-nowrap hover:text-white ${
              dockTab === 'visitors' && !dockCollapsed ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Active Visitors ({visitors.length})
          </button>
          
          <button
            onClick={() => {
              setDockTab('chat');
              setDockCollapsed(false);
            }}
            className={`transition-colors whitespace-nowrap hover:text-white ${
              dockTab === 'chat' && !dockCollapsed ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Visitor Intercom
          </button>
          
          <button
            onClick={() => {
              setDockTab('state');
              setDockCollapsed(false);
            }}
            className={`transition-colors whitespace-nowrap hover:text-white ${
              dockTab === 'state' && !dockCollapsed ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Server State Inspector
          </button>
        </nav>

        {/* Zone 3: Primary Action / User Presence */}
        <div className="flex items-center gap-3 shrink-0">
          {currentVisitor ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-[#131d2e] border border-slate-800 rounded-lg text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentVisitor.color }}
              />
              <span className="font-medium text-slate-200 truncate max-w-[120px]">
                {currentVisitor.name}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {isConnected ? 'ONLINE' : 'CONNECTING...'}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono">Connecting...</div>
          )}

          <button
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition-colors"
            title={dockCollapsed ? 'Expand Side Panel' : 'Collapse Side Panel'}
          >
            {dockCollapsed ? (
              <ChevronLeft className="w-4 h-4 text-cyan-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </header>

      {/* 2. SUB-BANNER / REAL-TIME SYNCHRONICITY TICKER */}
      <div className="bg-[#0b0f17] border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 shrink-0 overflow-x-auto gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            24/7 Cloud Gaming Persistence: LOCKED ACTIVE
          </span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-slate-300 tabular-nums">
            Uptime: {formatUptime(serverUptime)}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-300">
            {visitors.length} Connected Visitor{visitors.length === 1 ? '' : 's'}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-400 font-mono tabular-nums">
            {totalInteractions.toLocaleString()} Live Interferences Handled
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-slate-400">
          <button
            onClick={() => handleNavigate('antideploy://game')}
            className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-medium hover:bg-emerald-900 transition-colors flex items-center gap-1"
          >
            <Gamepad2 className="w-3 h-3" />
            24/7 Arena Online
          </button>
          <span className="hidden sm:inline text-slate-500">·</span>
          <span className="hidden sm:inline text-[10px] text-slate-400">
            Zero-Visitor Custody Ready
          </span>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: BROWSER VIEWPORT + COLLAPSIBLE DOCK */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Virtual Browser */}
        <main className="flex-1 h-full min-w-0 flex flex-col overflow-hidden">
          <VirtualBrowser
            tabs={tabs}
            activeTabId={activeTabId}
            cursors={cursors}
            clicks={clicks}
            currentVisitor={currentVisitor}
            syncScroll={syncScroll}
            onToggleSyncScroll={() => setSyncScroll(!syncScroll)}
            onNavigate={handleNavigate}
            onTabSwitch={handleTabSwitch}
            onTabAdd={handleTabAdd}
            onTabClose={handleTabClose}
            onSendCursorMove={handleSendCursorMove}
            onSendClick={handleSendClick}
            onSendInput={handleSendInput}
            onSendScroll={handleSendScroll}
            onSendNotesUpdate={handleSendNotesUpdate}
            history={history}
            historyIndex={historyIndex}
            remoteScrollPosition={remoteScrollPosition}
            remoteInputUpdate={remoteInputUpdate}
            remoteNotesContent={remoteNotesContent}
            pulseTimestamp={guardTelemetry?.lastPulseTimestamp}
          />
        </main>

        {/* Right: Collapsible Antideploy Dock */}
        {!dockCollapsed && (
          <aside className="w-80 lg:w-96 border-l border-slate-800 bg-[#0d131f] flex flex-col h-full shrink-0 shadow-2xl z-30">
            {/* Dock Tabs Header */}
            <div className="flex items-center border-b border-slate-800 bg-[#0a0e17] px-2 pt-2 gap-1 shrink-0 overflow-x-auto">
              <button
                onClick={() => setDockTab('guard')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors shrink-0 border-t border-x ${
                  dockTab === 'guard'
                    ? 'bg-[#0d131f] text-emerald-400 border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border-transparent'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Cloud Game Guard</span>
              </button>

              <button
                onClick={() => setDockTab('stream')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors shrink-0 border-t border-x ${
                  dockTab === 'stream'
                    ? 'bg-[#0d131f] text-cyan-400 border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border-transparent'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Interference</span>
              </button>

              <button
                onClick={() => setDockTab('visitors')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors shrink-0 border-t border-x ${
                  dockTab === 'visitors'
                    ? 'bg-[#0d131f] text-blue-400 border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border-transparent'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Visitors ({visitors.length})</span>
              </button>

              <button
                onClick={() => setDockTab('chat')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors shrink-0 border-t border-x ${
                  dockTab === 'chat'
                    ? 'bg-[#0d131f] text-purple-400 border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border-transparent'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Intercom</span>
              </button>

              <button
                onClick={() => setDockTab('state')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors shrink-0 border-t border-x ${
                  dockTab === 'state'
                    ? 'bg-[#0d131f] text-amber-400 border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border-transparent'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>State</span>
              </button>
            </div>

            {/* Dock Content Body */}
            <div className="flex-1 overflow-hidden">
              {dockTab === 'guard' && (
                <CloudGameGuardPanel
                  telemetry={guardTelemetry}
                  zeroVisitors={visitors.length <= 1}
                  onNavigateGame={() => handleNavigate('antideploy://game')}
                />
              )}
              {dockTab === 'stream' && <LiveActionFeed actions={actionLog} />}
              {dockTab === 'visitors' && (
                <VisitorDrawer
                  visitors={visitors}
                  currentUser={currentVisitor}
                  onRename={handleRename}
                  serverUptime={serverUptime}
                  totalInteractions={totalInteractions}
                />
              )}
              {dockTab === 'chat' && (
                <IntercomChat
                  messages={chatMessages}
                  currentUser={currentVisitor}
                  onSendMessage={handleSendChat}
                />
              )}
              {dockTab === 'state' && (
                <ServerStateInspector
                  serverState={fullServerState}
                  uptime={serverUptime}
                  serverStartTime={serverStartTime}
                  visitorsCount={visitors.length}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
