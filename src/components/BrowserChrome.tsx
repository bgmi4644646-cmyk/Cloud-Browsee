import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Lock,
  Plus,
  X,
  ExternalLink,
  Laptop,
  Monitor,
  Tablet,
  Check,
  Search,
} from 'lucide-react';
import { Tab } from '../types';

interface BrowserChromeProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSwitch: (tabId: string) => void;
  onTabAdd: (url?: string) => void;
  onTabClose: (tabId: string) => void;
  onNavigate: (url: string) => void;
  onReload: () => void;
  onBack: () => void;
  onForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  viewportSize: 'desktop' | 'laptop' | 'tablet';
  onViewportSizeChange: (size: 'desktop' | 'laptop' | 'tablet') => void;
  syncScroll: boolean;
  onToggleSyncScroll: () => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
}

export const BrowserChrome: React.FC<BrowserChromeProps> = ({
  tabs,
  activeTabId,
  onTabSwitch,
  onTabAdd,
  onTabClose,
  onNavigate,
  onReload,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
  viewportSize,
  onViewportSizeChange,
  syncScroll,
  onToggleSyncScroll,
  zoom,
  onZoomChange,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const [inputUrl, setInputUrl] = useState(activeTab?.url || 'antideploy://hub');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeTab) {
      setInputUrl(activeTab.url);
    }
  }, [activeTab?.url, activeTabId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = inputUrl.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('antideploy://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        url = 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(url);
      }
    }
    onNavigate(url);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(inputUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const BOOKMARKS = [
    { label: 'antideploy Hub', url: 'antideploy://hub', icon: '🌐' },
    { label: '24/7 Cloud Game', url: 'antideploy://game', icon: '🎮' },
    { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/World_Wide_Web', icon: '📖' },
    { label: 'Hacker News', url: 'https://news.ycombinator.com', icon: '⚡' },
    { label: 'Shared Notes', url: 'antideploy://notes', icon: '📝' },
    { label: 'MDN Docs', url: 'https://developer.mozilla.org/en-US/', icon: '📚' },
  ];

  return (
    <div className="bg-[#131b2e] border-b border-slate-800 text-slate-200 select-none">
      {/* 1. TABS BAR & WINDOW DOTS */}
      <div className="flex items-center px-3 pt-2 gap-2 overflow-x-auto scrollbar-none">
        {/* macOS style dots */}
        <div className="flex items-center gap-1.5 mr-2 shrink-0">
          <div className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors" />
        </div>

        {/* Tab Items */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onTabSwitch(tab.id)}
                className={`group relative flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors cursor-pointer max-w-[200px] min-w-[110px] shrink-0 border-t border-x ${
                  isActive
                    ? 'bg-[#1e293b] text-white border-slate-700 shadow-sm'
                    : 'bg-[#0f172a]/60 text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]/50 border-transparent'
                }`}
              >
                <span className="text-xs shrink-0">{tab.favicon || '🌐'}</span>
                <span className="truncate flex-1">{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabClose(tab.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity"
                    title="Close tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Tab Button */}
          <button
            onClick={() => onTabAdd()}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
            title="Open new tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Viewport Presets & Controls */}
        <div className="hidden lg:flex items-center gap-1 shrink-0 ml-auto pl-2 border-l border-slate-800">
          <button
            onClick={() => onViewportSizeChange('desktop')}
            className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1 ${
              viewportSize === 'desktop'
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title="Desktop 100% (1440px)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px]">1440px</span>
          </button>

          <button
            onClick={() => onViewportSizeChange('laptop')}
            className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1 ${
              viewportSize === 'laptop'
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title="Laptop (1024px)"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px]">1024px</span>
          </button>

          <button
            onClick={() => onViewportSizeChange('tablet')}
            className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1 ${
              viewportSize === 'tablet'
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title="Tablet (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px]">768px</span>
          </button>

          <div className="h-3 w-[1px] bg-slate-800 mx-1" />

          {/* Sync Scroll Toggle */}
          <button
            onClick={onToggleSyncScroll}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
              syncScroll
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                : 'bg-slate-800/50 text-slate-400 border border-transparent hover:text-slate-200'
            }`}
            title="Synchronize scroll offset with other visitors"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${syncScroll ? 'bg-cyan-400' : 'bg-slate-500'}`} />
            Sync Scroll
          </button>
        </div>
      </div>

      {/* 2. NAVIGATION BAR & OMNIBOX */}
      <div className="bg-[#1e293b] px-3 py-2 flex items-center gap-2">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onBack}
            disabled={!canGoBack}
            className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onForward}
            disabled={!canGoForward}
            className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onReload}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reload page"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('antideploy://hub')}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
            title="antideploy Hub"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* Omnibox / URL Form */}
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 flex items-center">
          <div className="relative w-full flex items-center bg-[#0f172a] rounded-lg border border-slate-700/80 focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all shadow-inner">
            <div className="pl-3 pr-2 flex items-center text-slate-400 shrink-0">
              {inputUrl.startsWith('https://') ? (
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
              ) : inputUrl.startsWith('antideploy://') ? (
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 px-1 py-0.5 rounded border border-cyan-800">
                  SERVER
                </span>
              ) : (
                <Search className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>

            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Search or enter web address (e.g. wikipedia.org, news.ycombinator.com)..."
              className="w-full bg-transparent py-1.5 px-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
            />

            <div className="flex items-center gap-1 pr-2 shrink-0">
              <button
                type="button"
                onClick={copyUrl}
                className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy URL"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <ExternalLink className="w-3 h-3" />}
              </button>
              <button
                type="submit"
                className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium transition-colors"
              >
                Go
              </button>
            </div>
          </div>
        </form>

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center gap-1 bg-[#0f172a] px-2 py-1 rounded-md border border-slate-800 text-xs shrink-0">
          <button
            onClick={() => onZoomChange(-10)}
            className="px-1 text-slate-400 hover:text-white font-mono"
            title="Zoom out"
          >
            -
          </button>
          <span className="text-[11px] font-mono text-slate-300 w-9 text-center tabular-nums">
            {zoom}%
          </span>
          <button
            onClick={() => onZoomChange(10)}
            className="px-1 text-slate-400 hover:text-white font-mono"
            title="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      {/* 3. BOOKMARK CHIPS STRIP */}
      <div className="bg-[#182234] px-3 py-1 flex items-center gap-2 overflow-x-auto text-[11px] border-t border-slate-800/60">
        <span className="text-slate-500 font-medium shrink-0">Bookmarks:</span>
        {BOOKMARKS.map((bm) => (
          <button
            key={bm.url}
            onClick={() => onNavigate(bm.url)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors shrink-0"
          >
            <span>{bm.icon}</span>
            <span>{bm.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
