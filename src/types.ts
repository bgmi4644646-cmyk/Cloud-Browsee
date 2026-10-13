export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  zoom: number;
}

export interface ActionEntry {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  action: 'navigate' | 'click' | 'input' | 'scroll' | 'tab' | 'chat' | 'draw' | 'notes' | 'guard';
  detail: string;
  timestamp: number;
}

export interface Visitor {
  id: string;
  name: string;
  color: string;
  connectedAt: number;
  lastActive: number;
  cursor?: { x: number; y: number };
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
}

export interface RemoteClick {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  selector?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  timestamp: number;
}

export interface SessionGuardTelemetry {
  active: boolean;
  zeroVisitorCustody: boolean;
  afkPulseCount: number;
  lastPulseTimestamp: number;
  pulseIntervalSec: number;
  visibilitySpoofed: boolean;
  focusLocked: boolean;
  unthrottledTimers: boolean;
}

export interface BrowserServerState {
  tabs: Tab[];
  activeTabId: string;
  history: Array<{ url: string; title: string; timestamp: number }>;
  historyIndex: number;
  scrollPosition: { scrollX: number; scrollY: number };
  formValues: Record<string, string>;
  sharedNotes: string;
  pixelGrid: Record<string, string>;
  totalInteractions: number;
  guardTelemetry?: SessionGuardTelemetry;
}
