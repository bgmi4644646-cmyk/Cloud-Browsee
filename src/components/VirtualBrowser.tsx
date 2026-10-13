import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrowserChrome } from './BrowserChrome';
import { RemoteCursors } from './RemoteCursors';
import { Tab, RemoteCursor, RemoteClick, Visitor } from '../types';

interface VirtualBrowserProps {
  tabs: Tab[];
  activeTabId: string;
  cursors: Map<string, RemoteCursor>;
  clicks: RemoteClick[];
  currentVisitor: Visitor | null;
  syncScroll: boolean;
  onToggleSyncScroll: () => void;
  onNavigate: (url: string, title?: string) => void;
  onTabSwitch: (tabId: string) => void;
  onTabAdd: (url?: string) => void;
  onTabClose: (tabId: string) => void;
  onSendCursorMove: (x: number, y: number) => void;
  onSendClick: (x: number, y: number, selector?: string, text?: string, tagName?: string) => void;
  onSendInput: (selector: string, value: string, id?: string, name?: string) => void;
  onSendScroll: (scrollX: number, scrollY: number) => void;
  onSendNotesUpdate: (content: string) => void;
  history: Array<{ url: string; title: string }>;
  historyIndex: number;
  remoteScrollPosition: { scrollX: number; scrollY: number } | null;
  remoteInputUpdate: { selector?: string; value: string; id?: string; name?: string } | null;
  remoteNotesContent: string | null;
  pulseTimestamp?: number;
}

export const VirtualBrowser: React.FC<VirtualBrowserProps> = ({
  tabs,
  activeTabId,
  cursors,
  clicks,
  currentVisitor,
  syncScroll,
  onToggleSyncScroll,
  onNavigate,
  onTabSwitch,
  onTabAdd,
  onTabClose,
  onSendCursorMove,
  onSendClick,
  onSendInput,
  onSendScroll,
  onSendNotesUpdate,
  history,
  historyIndex,
  remoteScrollPosition,
  remoteInputUpdate,
  remoteNotesContent,
  pulseTimestamp,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState<'desktop' | 'laptop' | 'tablet'>('desktop');
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  // Post keepalive pulse to iframe
  useEffect(() => {
    if (pulseTimestamp && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'REMOTE_KEEPALIVE_PULSE',
          timestamp: pulseTimestamp,
        },
        '*'
      );
    }
  }, [pulseTimestamp]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeUrl = activeTab?.url || 'antideploy://hub';

  // Format proxy target URL
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(activeUrl)}`;

  // Loading indicator on URL change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [activeUrl]);

  // Post remote scroll to iframe
  useEffect(() => {
    if (syncScroll && remoteScrollPosition && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'REMOTE_SCROLL',
          scrollX: remoteScrollPosition.scrollX,
          scrollY: remoteScrollPosition.scrollY,
        },
        '*'
      );
    }
  }, [remoteScrollPosition, syncScroll]);

  // Post remote input to iframe
  useEffect(() => {
    if (remoteInputUpdate && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'REMOTE_INPUT',
          selector: remoteInputUpdate.selector,
          value: remoteInputUpdate.value,
          id: remoteInputUpdate.id,
          name: remoteInputUpdate.name,
        },
        '*'
      );
    }
  }, [remoteInputUpdate]);

  // Post remote notes update to iframe
  useEffect(() => {
    if (remoteNotesContent !== null && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'REMOTE_NOTES_UPDATE',
          content: remoteNotesContent,
        },
        '*'
      );
    }
  }, [remoteNotesContent]);

  // Post remote click to iframe
  useEffect(() => {
    if (clicks.length > 0) {
      const latest = clicks[clicks.length - 1];
      if (latest && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'REMOTE_CLICK',
            x: latest.x,
            y: latest.y,
            color: latest.userColor,
          },
          '*'
        );
      }
    }
  }, [clicks]);

  // Handle postMessage events from iframe bridge
  useEffect(() => {
    const handleBridgeMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;

      switch (e.data.type) {
        case 'AD_READY': {
          setIsLoading(false);
          break;
        }

        case 'AD_NAVIGATE': {
          if (e.data.url) {
            onNavigate(e.data.url);
          }
          break;
        }

        case 'AD_CLICK': {
          onSendClick(
            e.data.x,
            e.data.y,
            e.data.selector,
            e.data.text,
            e.data.tagName
          );
          break;
        }

        case 'AD_INPUT': {
          onSendInput(e.data.selector, e.data.value, e.data.id, e.data.name);
          break;
        }

        case 'AD_SCROLL': {
          if (syncScroll) {
            onSendScroll(e.data.scrollX, e.data.scrollY);
          }
          break;
        }

        case 'AD_NOTES_UPDATE': {
          onSendNotesUpdate(e.data.content);
          break;
        }
      }
    };

    window.addEventListener('message', handleBridgeMessage);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, [onNavigate, onSendClick, onSendInput, onSendScroll, onSendNotesUpdate, syncScroll]);

  // Handle local mouse move inside viewport
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onSendCursorMove(x, y);
    },
    [onSendCursorMove]
  );

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = proxyUrl;
    }
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      if (prev) onNavigate(prev.url, prev.title);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      if (next) onNavigate(next.url, next.title);
    }
  };

  const handleZoom = (delta: number) => {
    setZoom((z) => Math.max(50, Math.min(150, z + delta)));
  };

  // Dimensions based on preset
  const getContainerWidth = () => {
    switch (viewportSize) {
      case 'laptop':
        return 'max-w-[1024px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'w-full';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] overflow-hidden">
      {/* Browser Chrome (Tabs, Navigation Bar, Omnibox) */}
      <BrowserChrome
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSwitch={onTabSwitch}
        onTabAdd={onTabAdd}
        onTabClose={onTabClose}
        onNavigate={onNavigate}
        onReload={handleReload}
        onBack={handleBack}
        onForward={handleForward}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < history.length - 1}
        viewportSize={viewportSize}
        onViewportSizeChange={setViewportSize}
        syncScroll={syncScroll}
        onToggleSyncScroll={onToggleSyncScroll}
        zoom={zoom}
        onZoomChange={handleZoom}
      />

      {/* Loading Progress Bar */}
      {isLoading && (
        <div className="h-0.5 w-full bg-slate-800 overflow-hidden shrink-0">
          <div className="h-full bg-cyan-400 animate-pulse w-3/4 transition-all duration-300" />
        </div>
      )}

      {/* Browser Viewport Stage */}
      <div className="flex-1 bg-[#0b0f19] flex justify-center items-stretch overflow-hidden p-0 relative">
        <div
          ref={viewportRef}
          onMouseMove={handleMouseMove}
          className={`relative h-full transition-all duration-200 bg-white shadow-2xl flex flex-col ${getContainerWidth()}`}
        >
          {/* Multi-User Cursor & Ripple Overlay */}
          <RemoteCursors
            cursors={cursors}
            clicks={clicks}
            currentUserId={currentVisitor?.id || ''}
          />

          {/* Sandboxed Webpage Frame with Bridge */}
          <div className="flex-1 w-full h-full relative overflow-hidden bg-white">
            <iframe
              ref={iframeRef}
              key={activeUrl}
              src={proxyUrl}
              title={`antideploy Browser — ${activeTab?.title || 'Web'}`}
              className="w-full h-full border-0 absolute inset-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              style={{
                transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                transformOrigin: 'top left',
                width: zoom !== 100 ? `${(100 / zoom) * 100}%` : '100%',
                height: zoom !== 100 ? `${(100 / zoom) * 100}%` : '100%',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
