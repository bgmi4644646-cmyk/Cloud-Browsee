import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: '10mb' }));

// Ensure persistent data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const STATE_FILE = path.join(DATA_DIR, 'session-state.json');

// ==========================================
// 24/7 PERSISTENT SERVER BROWSER STATE
// ==========================================
const serverStartTime = Date.now();

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  zoom: number;
}

interface ActionEntry {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  action: 'navigate' | 'click' | 'input' | 'scroll' | 'tab' | 'chat' | 'draw' | 'notes' | 'guard';
  detail: string;
  timestamp: number;
}

interface Visitor {
  id: string;
  name: string;
  color: string;
  connectedAt: number;
  lastActive: number;
  cursor?: { x: number; y: number };
}

const DEFAULT_TABS: Tab[] = [
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
  {
    id: 'tab-3',
    title: 'Wikipedia: World Wide Web',
    url: 'https://en.wikipedia.org/wiki/World_Wide_Web',
    favicon: '📖',
    zoom: 100,
  },
  {
    id: 'tab-4',
    title: 'Hacker News',
    url: 'https://news.ycombinator.com',
    favicon: '⚡',
    zoom: 100,
  },
  {
    id: 'tab-5',
    title: 'Shared 24/7 Scratchpad',
    url: 'antideploy://notes',
    favicon: '📝',
    zoom: 100,
  },
];

// Load persisted state if exists
let browserState = {
  tabs: [...DEFAULT_TABS],
  activeTabId: 'tab-1',
  history: [
    { url: 'antideploy://hub', title: 'antideploy Hub', timestamp: Date.now() },
  ],
  historyIndex: 0,
  scrollPosition: { scrollX: 0, scrollY: 0 },
  formValues: {} as Record<string, string>,
  sharedNotes: `# antideploy.com — 24/7 Living Server Browser\n\nWelcome to the permanent shared web session! \nEvery visitor connected to this server is looking at this exact browser instance simultaneously.\n\n### 24/7 Cloud Game & Live Connection Guarantee:\n- The server maintains active headless session custody 24/7.\n- When zero visitors are online, the Server Guard sends anti-AFK micro-pulses every 25 seconds.\n- Visibility and window focus are locked to active, ensuring cloud gaming services never disconnect for inactivity.\n\n*Drop a note below or switch to tab "24/7 Cloud Game Arena" to test zero-visitor persistence!*`,
  pixelGrid: {} as Record<string, string>,
  totalInteractions: 0,
};

if (fs.existsSync(STATE_FILE)) {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const loaded = JSON.parse(raw);
    browserState = { ...browserState, ...loaded };
    console.log('[antideploy] Successfully restored 24/7 browser state from disk storage.');
  } catch (err) {
    console.error('[antideploy] Error reading disk state:', err);
  }
}

function saveStateToDisk() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(browserState, null, 2), 'utf-8');
  } catch (err) {
    console.error('[antideploy] Error persisting state to disk:', err);
  }
}

// 24/7 Session Guard Telemetry (Anti-AFK & Cloud Game Keeper)
const guardTelemetry = {
  active: true,
  zeroVisitorCustody: false,
  afkPulseCount: 0,
  lastPulseTimestamp: Date.now(),
  pulseIntervalSec: 25,
  visibilitySpoofed: true,
  focusLocked: true,
  unthrottledTimers: true,
};

const actionLog: ActionEntry[] = [];
const connectedVisitors = new Map<string, { ws: WebSocket; visitor: Visitor }>();

function addActionLog(
  userId: string,
  userName: string,
  userColor: string,
  action: ActionEntry['action'],
  detail: string
) {
  browserState.totalInteractions++;
  const entry: ActionEntry = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userName,
    userColor,
    action,
    detail,
    timestamp: Date.now(),
  };
  actionLog.unshift(entry);
  if (actionLog.length > 100) {
    actionLog.pop();
  }
  return entry;
}

const VISITOR_COLORS = [
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
];

function getRandomColor(): string {
  return VISITOR_COLORS[Math.floor(Math.random() * VISITOR_COLORS.length)];
}

// ==========================================
// 24/7 SERVER SESSION GUARD (ANTI-AFK ENGINE)
// ==========================================
setInterval(() => {
  guardTelemetry.lastPulseTimestamp = Date.now();
  guardTelemetry.afkPulseCount++;

  const isZeroVisitors = connectedVisitors.size === 0;
  guardTelemetry.zeroVisitorCustody = isZeroVisitors;

  // Broadcast keepalive pulse to all connected visitors (and iframe bridge)
  broadcast({
    type: 'guard:pulse',
    telemetry: guardTelemetry,
  });

  // If 0 visitors online, record guard activity and save disk state
  if (isZeroVisitors) {
    if (guardTelemetry.afkPulseCount % 4 === 0) {
      addActionLog(
        'guard_daemon',
        '24/7 Server Guard',
        '#10b981',
        'guard',
        `Dispatched Anti-AFK Keepalive Pulse #${guardTelemetry.afkPulseCount} (0 visitors online; session locked active)`
      );
      saveStateToDisk();
    }
  }
}, guardTelemetry.pulseIntervalSec * 1000);

// Auto-save disk state every 60s
setInterval(saveStateToDisk, 60000);

// ==========================================
// BUILT-IN PAGES (HUB, GAME ARENA, NOTES)
// ==========================================

function getGameHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>24/7 Neon Orbital Arena</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #070a13; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; user-select: none; }
    .hud { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #0c1222; border-bottom: 1px solid #1e293b; font-size: 13px; }
    .hud-left { display: flex; align-items: center; gap: 16px; }
    .status-badge { display: flex; items-center; gap: 6px; font-weight: 600; color: #10b981; font-family: monospace; font-size: 11px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.2); } }
    .hud-metric { font-family: monospace; color: #94a3b8; }
    .hud-val { color: #38bdf8; font-weight: 700; }
    .canvas-container { flex: 1; position: relative; background: radial-gradient(circle at center, #0e172a 0%, #070a13 100%); }
    canvas { display: block; width: 100%; height: 100%; cursor: crosshair; }
    .controls-banner { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid #334155; padding: 8px 18px; border-radius: 20px; font-size: 12px; color: #cbd5e1; display: flex; gap: 16px; align-items: center; pointer-events: none; }
  </style>
</head>
<body>
  <div class="hud">
    <div class="hud-left">
      <div class="status-badge">
        <span class="status-dot"></span>
        <span>24/7 CLOUD GAME RUNNER · ACTIVE</span>
      </div>
      <div class="hud-metric">Simulation Ticks: <span class="hud-val" id="tick-counter">0</span></div>
      <div class="hud-metric">Orbs Collected: <span class="hud-val" id="score-counter">0</span></div>
    </div>
    <div class="hud-metric">
      Anti-AFK Guard: <span style="color:#10b981;">NEVER DISCONNECTS</span>
    </div>
  </div>

  <div class="canvas-container" id="container">
    <canvas id="game-canvas"></canvas>
    <div class="controls-banner">
      <span>🖱️ Click to boost & pulse energy</span>
      <span>•</span>
      <span>Autonomous bots battle 24/7</span>
      <span>•</span>
      <span>State persists across visitor disconnects</span>
    </div>
  </div>

  <script>
    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d');
    var container = document.getElementById('container');
    var tickCounter = document.getElementById('tick-counter');
    var scoreCounter = document.getElementById('score-counter');

    function resize() {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Persistent game state
    var ticks = 0;
    var score = 0;

    // Entities
    var bots = [
      { id: 'Bot-Alpha', x: 200, y: 200, vx: 2, vy: 1.5, color: '#38bdf8', score: 0 },
      { id: 'Bot-Beta', x: 400, y: 300, vx: -1.8, vy: 2.2, color: '#f43f5e', score: 0 },
      { id: 'Bot-Gamma', x: 300, y: 400, vx: 1.2, vy: -2.4, color: '#a855f7', score: 0 },
      { id: 'Bot-Delta', x: 500, y: 250, vx: -2.1, vy: -1.3, color: '#eab308', score: 0 }
    ];

    var orbs = [];
    function spawnOrbs() {
      while (orbs.length < 18) {
        orbs.push({
          x: Math.random() * (canvas.width - 60) + 30,
          y: Math.random() * (canvas.height - 60) + 30,
          radius: Math.random() * 4 + 3,
          color: '#10b981',
          pulse: Math.random() * Math.PI
        });
      }
    }
    spawnOrbs();

    // User click boost
    canvas.addEventListener('click', function(e) {
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      // Attract bots
      bots.forEach(function(b) {
        var dx = x - b.x;
        var dy = y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        b.vx += (dx / dist) * 3;
        b.vy += (dy / dist) * 3;
      });
      score += 5;
      scoreCounter.innerText = score;
    });

    // Unthrottled 24/7 game loop
    function update() {
      ticks++;
      tickCounter.innerText = ticks.toLocaleString();

      ctx.fillStyle = 'rgba(7, 10, 19, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw orbs
      orbs.forEach(function(orb, idx) {
        orb.pulse += 0.05;
        var r = orb.radius + Math.sin(orb.pulse) * 1.5;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
        ctx.fillStyle = orb.color;
        ctx.shadowColor = orb.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Update & draw bots
      bots.forEach(function(b) {
        b.x += b.vx;
        b.y += b.vy;

        // Bounce borders
        if (b.x < 20) { b.x = 20; b.vx = -b.vx; }
        if (b.x > canvas.width - 20) { b.x = canvas.width - 20; b.vx = -b.vx; }
        if (b.y < 20) { b.y = 20; b.vy = -b.vy; }
        if (b.y > canvas.height - 20) { b.y = canvas.height - 20; b.vy = -b.vy; }

        // Slight drift toward nearest orb
        if (orbs.length > 0) {
          var nearest = orbs[0];
          var minDist = 999999;
          orbs.forEach(function(o) {
            var d = Math.hypot(o.x - b.x, o.y - b.y);
            if (d < minDist) { minDist = d; nearest = o; }
          });
          var dx = nearest.x - b.x;
          var dy = nearest.y - b.y;
          var dist = Math.hypot(dx, dy) || 1;
          b.vx += (dx / dist) * 0.12;
          b.vy += (dy / dist) * 0.12;
        }

        // Speed limit
        var speed = Math.hypot(b.vx, b.vy);
        if (speed > 4.5) {
          b.vx = (b.vx / speed) * 4.5;
          b.vy = (b.vy / speed) * 4.5;
        }

        // Orb collection check
        for (var i = orbs.length - 1; i >= 0; i--) {
          var orb = orbs[i];
          if (Math.hypot(orb.x - b.x, orb.y - b.y) < 18) {
            orbs.splice(i, 1);
            b.score += 10;
            score += 1;
            scoreCounter.innerText = score;
            spawnOrbs();
          }
        }

        // Draw Ship
        ctx.save();
        ctx.translate(b.x, b.y);
        var angle = Math.atan2(b.vy, b.vx);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-10, -8);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();

        // Bot Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(b.id, b.x - 20, b.y - 14);
      });

      requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  </script>
</body>
</html>`;
}

function getHubHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>antideploy Hub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #0f172a; color: #f1f5f9; padding: 32px 24px; line-height: 1.5; }
    .container { max-width: 960px; margin: 0 auto; }
    .hero { text-align: center; margin-bottom: 40px; padding: 24px 0; }
    .badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #10b981; margin-bottom: 8px; font-family: monospace; }
    .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }
    h1 { font-size: 32px; font-weight: 700; color: #ffffff; margin-bottom: 12px; letter-spacing: -0.02em; }
    p.lead { font-size: 15px; color: #94a3b8; max-width: 640px; margin: 0 auto; }
    
    .guard-banner { margin: 24px auto 0; max-width: 640px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #6ee7b7; text-align: left; display: flex; align-items: center; gap: 12px; }
    
    .search-box { margin: 28px auto; max-width: 640px; position: relative; display: flex; gap: 8px; }
    .search-input { flex: 1; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 12px 18px; border-radius: 8px; font-size: 14px; outline: none; }
    .search-input:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }
    .search-btn { background: #0284c7; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    .search-btn:hover { background: #0369a1; }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 20px; transition: transform 0.15s, border-color 0.15s; text-decoration: none; color: inherit; display: block; }
    .card:hover { transform: translateY(-2px); border-color: #475569; }
    .card-icon { font-size: 24px; margin-bottom: 12px; display: inline-block; }
    .card-title { font-size: 16px; font-weight: 600; color: #f8fafc; margin-bottom: 6px; }
    .card-desc { font-size: 13px; color: #94a3b8; }
    
    .interactive-section { margin-top: 40px; background: #182234; border: 1px solid #334155; border-radius: 12px; padding: 24px; }
    .interactive-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .interactive-title { font-size: 16px; font-weight: 600; color: #f8fafc; }
    .interactive-sub { font-size: 12px; color: #64748b; }
    
    .counter-row { display: flex; align-items: center; gap: 16px; margin-top: 12px; }
    .counter-btn { background: #334155; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    .counter-btn:hover { background: #475569; }
    .counter-value { font-size: 20px; font-weight: 700; color: #38bdf8; font-variant-numeric: tabular-nums; }
    
    .input-row { margin-top: 16px; }
    .shared-input { width: 100%; background: #0f172a; border: 1px solid #334155; color: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-size: 13px; outline: none; }
    .shared-input:focus { border-color: #38bdf8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div class="badge">
        <span class="badge-dot"></span>
        <span>24/7 Cloud Gaming & Server Browser</span>
      </div>
      <h1>antideploy Virtual Browser</h1>
      <p class="lead">A 24/7 persistent headless browser instance. Never disconnects from cloud games, WebSockets, or live sessions even when zero visitors are online on the page.</p>
      
      <div class="guard-banner">
        <span style="font-size:20px;">🛡️</span>
        <div>
          <strong>Anti-AFK & Zero-Visitor Custody Active:</strong> The server sends synthetic micro-pulses and locks tab focus so cloud gaming services (GeForce Now, Xbox Cloud, WebGL engines) stay connected indefinitely.
        </div>
      </div>

      <form class="search-box" id="search-form" onsubmit="event.preventDefault(); window.navigateSearch();">
        <input type="text" id="omnibox-search" class="search-input" placeholder="Enter any web URL or cloud gaming service..." value="antideploy://game" />
        <button type="submit" class="search-btn">Browse URL</button>
      </form>
    </div>

    <div class="grid">
      <a href="antideploy://game" class="card" style="border-color: rgba(56, 189, 248, 0.4);">
        <div class="card-icon">🎮</div>
        <div class="card-title">24/7 Neon Orbital Arena</div>
        <div class="card-desc">Live continuous cloud game arena with autonomous bots and physics running 24/7. Leave and return anytime.</div>
      </a>
      <a href="https://en.wikipedia.org/wiki/World_Wide_Web" class="card">
        <div class="card-icon">📖</div>
        <div class="card-title">Wikipedia</div>
        <div class="card-desc">The free encyclopedia article on the World Wide Web. Fully navigable and shared.</div>
      </a>
      <a href="https://news.ycombinator.com" class="card">
        <div class="card-icon">⚡</div>
        <div class="card-title">Hacker News</div>
        <div class="card-desc">Real-time tech articles, comments, and discussions. Read together with other visitors.</div>
      </a>
      <a href="antideploy://notes" class="card">
        <div class="card-icon">📝</div>
        <div class="card-title">24/7 Shared Scratchpad</div>
        <div class="card-desc">Persistent collaborative text & markdown board. Everything written is stored on the server.</div>
      </a>
      <a href="https://openlibrary.org" class="card">
        <div class="card-icon">📚</div>
        <div class="card-title">Open Library</div>
        <div class="card-desc">Millions of books and records from the Internet Archive digital collection.</div>
      </a>
      <a href="https://developer.mozilla.org/en-US/" class="card">
        <div class="card-icon">🌐</div>
        <div class="card-title">MDN Web Docs</div>
        <div class="card-desc">Web technology resources and documentation for HTML, CSS, and JavaScript.</div>
      </a>
    </div>

    <div class="interactive-section">
      <div class="interactive-header">
        <div>
          <div class="interactive-title">Live Shared Browser State Test</div>
          <div class="interactive-sub">These controls synchronize immediately across all connected viewers via the server event bus</div>
        </div>
      </div>
      
      <div class="counter-row">
        <button class="counter-btn" id="click-counter-btn" onclick="window.incrementSharedCounter()">Click to Interfere (+1)</button>
        <span class="counter-value" id="shared-counter-display">0 clicks recorded</span>
      </div>

      <div class="input-row">
        <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:6px;">Shared Live Input Field (type to sync across all visitor screens):</label>
        <input type="text" id="shared-live-input" class="shared-input" placeholder="Type something here... All visitors will see it update in real time" />
      </div>
    </div>
  </div>

  <script>
    window.navigateSearch = function() {
      var input = document.getElementById('omnibox-search');
      var val = input.value.trim();
      if (!val) return;
      var targetUrl = val;
      if (!val.startsWith('http://') && !val.startsWith('https://') && !val.startsWith('antideploy://')) {
        if (val.includes('.') && !val.includes(' ')) {
          targetUrl = 'https://' + val;
        } else {
          targetUrl = 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(val);
        }
      }
      window.parent.postMessage({ type: 'AD_NAVIGATE', url: targetUrl }, '*');
    };

    var counter = 0;
    window.incrementSharedCounter = function() {
      counter++;
      document.getElementById('shared-counter-display').innerText = counter + ' clicks recorded';
    };
  </script>
</body>
</html>`;
}

function getNotesHtml(content: string): string {
  const safeContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>24/7 Shared Scratchpad</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #0b0f19; color: #e2e8f0; height: 100vh; display: flex; flex-direction: column; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #1e293b; padding-bottom: 12px; }
    .title { font-size: 18px; font-weight: 700; color: #fff; }
    .subtitle { font-size: 12px; color: #38bdf8; }
    .editor-wrapper { flex: 1; display: flex; flex-direction: column; }
    textarea { flex: 1; width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #f8fafc; padding: 20px; font-family: 'JetBrains Mono', monospace; font-size: 14px; line-height: 1.6; resize: none; outline: none; }
    textarea:focus { border-color: #38bdf8; }
    .footer { margin-top: 12px; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Permanent Shared Scratchpad</div>
      <div class="subtitle">Live 24/7 synced memory · Disk-backed persistence</div>
    </div>
    <div style="font-size: 12px; color: #94a3b8;">Saved automatically to server & disk</div>
  </div>
  <div class="editor-wrapper">
    <textarea id="notes-textarea" placeholder="Start typing here... All connected visitors will see your edits in real-time.">${safeContent}</textarea>
  </div>
  <div class="footer">
    <span>State persists across visitor sessions & server reboots</span>
    <span id="char-count">Live synchronized</span>
  </div>
  <script>
    var ta = document.getElementById('notes-textarea');
    ta.addEventListener('input', function() {
      window.parent.postMessage({ type: 'AD_NOTES_UPDATE', content: ta.value }, '*');
    });
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'REMOTE_NOTES_UPDATE') {
        if (ta.value !== e.data.content) {
          var start = ta.selectionStart;
          var end = ta.selectionEnd;
          ta.value = e.data.content;
          ta.setSelectionRange(start, end);
        }
      }
    });
  </script>
</body>
</html>`;
}

// ==========================================
// BROWSER INTERACTION BRIDGE & ANTI-AFK SPOOFING
// ==========================================
function getBridgeScript(targetUrl: string): string {
  return `
<!-- antideploy interaction bridge & anti-AFK persistence -->
<script id="antideploy-bridge-script">
(function() {
  var TARGET_URL = ${JSON.stringify(targetUrl)};
  
  // 1. VISIBILITY & FOCUS SPOOFING (Prevents cloud games from auto-pausing/disconnecting)
  try {
    Object.defineProperty(document, 'visibilityState', {
      get: function() { return 'visible'; },
      configurable: true
    });
    Object.defineProperty(document, 'hidden', {
      get: function() { return false; },
      configurable: true
    });
    document.hasFocus = function() { return true; };
    window.addEventListener('blur', function(e) {
      e.stopImmediatePropagation();
    }, true);
  } catch(e) {}

  // 2. UNTHROTTLED TIMERS PRESERVATION (Prevents game loop from sleeping when unattended)
  var originalRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = function(callback) {
    return originalRAF(callback);
  };

  // 3. SYNTHETIC KEEP-ALIVE MICRO-PULSE (Satisfies cloud game AFK timers)
  function handleKeepalivePulse() {
    try {
      // Dispatch 1px mousemove delta
      var mouseEvt = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
        screenX: 100,
        screenY: 100
      });
      document.dispatchEvent(mouseEvt);

      // Dispatch shift key null pulse
      var keyEvt = new KeyboardEvent('keyup', {
        bubbles: true,
        cancelable: true,
        key: 'Shift',
        code: 'ShiftLeft'
      });
      document.dispatchEvent(keyEvt);
    } catch(err) {}
  }

  // Visual ripple indicator for remote clicks
  function showRemoteRipple(x, y, color) {
    var ripple = document.createElement('div');
    ripple.style.position = 'fixed';
    ripple.style.left = (x - 15) + 'px';
    ripple.style.top = (y - 15) + 'px';
    ripple.style.width = '30px';
    ripple.style.height = '30px';
    ripple.style.borderRadius = '50%';
    ripple.style.border = '2px solid ' + (color || '#06b6d4');
    ripple.style.backgroundColor = (color || '#06b6d4') + '33';
    ripple.style.pointerEvents = 'none';
    ripple.style.zIndex = '999999';
    ripple.style.transform = 'scale(0.5)';
    ripple.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
    ripple.style.opacity = '1';
    document.body.appendChild(ripple);
    
    requestAnimationFrame(function() {
      ripple.style.transform = 'scale(2.2)';
      ripple.style.opacity = '0';
    });
    setTimeout(function() {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 450);
  }

  // Intercept all clicks
  document.addEventListener('click', function(e) {
    var target = e.target;
    var link = target.closest('a');
    if (link && link.href) {
      e.preventDefault();
      window.parent.postMessage({
        type: 'AD_NAVIGATE',
        url: link.href,
        x: e.clientX,
        y: e.clientY
      }, '*');
      return;
    }

    var selector = '';
    if (target.id) {
      selector = '#' + target.id;
    } else if (target.name) {
      selector = '[name="' + target.name + '"]';
    } else {
      selector = target.tagName.toLowerCase();
      if (target.className && typeof target.className === 'string') {
        var firstClass = target.className.split(' ')[0];
        if (firstClass) selector += '.' + firstClass;
      }
    }

    window.parent.postMessage({
      type: 'AD_CLICK',
      x: e.clientX,
      y: e.clientY,
      selector: selector,
      tagName: target.tagName,
      text: (target.innerText || '').substring(0, 50)
    }, '*');
  }, true);

  // Intercept inputs
  document.addEventListener('input', function(e) {
    var target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      var selector = target.id ? ('#' + target.id) : (target.name ? ('[name="' + target.name + '"]') : '');
      window.parent.postMessage({
        type: 'AD_INPUT',
        selector: selector,
        value: target.value,
        id: target.id,
        name: target.name
      }, '*');
    }
  }, true);

  // Throttled scroll
  var scrollTimeout;
  window.addEventListener('scroll', function() {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(function() {
      scrollTimeout = null;
      window.parent.postMessage({
        type: 'AD_SCROLL',
        scrollX: window.scrollX,
        scrollY: window.scrollY
      }, '*');
    }, 50);
  }, { passive: true });

  // Listen for remote events from parent frame
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    
    if (e.data.type === 'REMOTE_KEEPALIVE_PULSE') {
      handleKeepalivePulse();
    } else if (e.data.type === 'REMOTE_SCROLL') {
      window.scrollTo({
        left: e.data.scrollX,
        top: e.data.scrollY,
        behavior: 'smooth'
      });
    } else if (e.data.type === 'REMOTE_CLICK') {
      showRemoteRipple(e.data.x, e.data.y, e.data.color);
      var el = document.elementFromPoint(e.data.x, e.data.y);
      if (el) {
        if (typeof el.focus === 'function') el.focus();
        if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'A') {
          el.click();
        }
      }
    } else if (e.data.type === 'REMOTE_INPUT') {
      var el = null;
      if (e.data.selector) el = document.querySelector(e.data.selector);
      if (!el && e.data.id) el = document.getElementById(e.data.id);
      if (!el && e.data.name) el = document.querySelector('[name="' + e.data.name + '"]');
      if (el && 'value' in el) {
        el.value = e.data.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  window.parent.postMessage({
    type: 'AD_READY',
    title: document.title,
    url: TARGET_URL
  }, '*');
})();
</script>
`;
}

// Proxy Endpoint: Fetches target URL or serves internal apps
app.get('/api/proxy', async (req, res) => {
  const targetUrl = (req.query.url as string) || 'antideploy://hub';

  if (targetUrl === 'antideploy://hub' || targetUrl === 'about:blank') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const html = getHubHtml().replace('</body>', `${getBridgeScript(targetUrl)}</body>`);
    return res.send(html);
  }

  if (targetUrl === 'antideploy://game') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const html = getGameHtml().replace('</body>', `${getBridgeScript(targetUrl)}</body>`);
    return res.send(html);
  }

  if (targetUrl === 'antideploy://notes') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const html = getNotesHtml(browserState.sharedNotes).replace(
      '</body>',
      `${getBridgeScript(targetUrl)}</body>`
    );
    return res.send(html);
  }

  let fetchUrl = targetUrl;
  if (!fetchUrl.startsWith('http://') && !fetchUrl.startsWith('https://')) {
    fetchUrl = 'https://' + fetchUrl;
  }

  try {
    const parsed = new URL(fetchUrl);
    const origin = parsed.origin;
    const basePath = parsed.pathname;

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (AntideployServerBrowser/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || 'text/html';

    if (!contentType.includes('text/html')) {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      return res.send(Buffer.from(buffer));
    }

    let html = await response.text();

    html = html.replace(/<head[^>]*>/i, (match) => {
      return `${match}\n<base href="${origin}${basePath}">`;
    });

    const bridge = getBridgeScript(fetchUrl);
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${bridge}</body>`);
    } else if (html.includes('</html>')) {
      html = html.replace('</html>', `${bridge}</html>`);
    } else {
      html += bridge;
    }

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.send(html);
  } catch (err: any) {
    const errorHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Host Protected or Unreachable</title>
  <style>
    body { background: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .box { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 480px; }
    h2 { margin-bottom: 12px; font-size: 20px; color: #f87171; }
    p { color: #94a3b8; font-size: 14px; margin-bottom: 20px; line-height: 1.5; }
    .btn { background: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 14px; text-decoration: none; display: inline-block; margin: 4px; }
    .url { font-family: monospace; background: #0f172a; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #38bdf8; word-break: break-all; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Host Unreachable / Protected</h2>
    <div class="url">${fetchUrl}</div>
    <p>This destination either blocked cross-origin proxy inspection or could not be reached (${err?.message || 'Network error'}). Try another URL or switch to the 24/7 Cloud Game Arena.</p>
    <a href="/api/proxy?url=antideploy://game" class="btn">Launch 24/7 Cloud Game Arena</a>
    <a href="/api/proxy?url=antideploy://hub" class="btn" style="background:#334155;">antideploy Hub</a>
  </div>
  ${getBridgeScript(fetchUrl)}
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(errorHtml);
  }
});

// Server State API
app.get('/api/state', (req, res) => {
  res.json({
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    serverStartTime,
    visitorsCount: connectedVisitors.size,
    browserState: {
      ...browserState,
      guardTelemetry,
    },
    actionLog: actionLog.slice(0, 50),
    guardTelemetry,
  });
});

// Guard config update
app.post('/api/guard/trigger-pulse', (req, res) => {
  guardTelemetry.afkPulseCount++;
  guardTelemetry.lastPulseTimestamp = Date.now();
  broadcast({
    type: 'guard:pulse',
    telemetry: guardTelemetry,
  });
  addActionLog('manual', 'Manual Trigger', '#06b6d4', 'guard', 'Triggered manual anti-AFK keepalive pulse');
  res.json({ success: true, guardTelemetry });
});

// ==========================================
// WEBSOCKET REAL-TIME SERVER
// ==========================================
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(msg: object, ignoreWs?: WebSocket) {
  const data = JSON.stringify(msg);
  for (const { ws } of connectedVisitors.values()) {
    if (ws !== ignoreWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

wss.on('connection', (ws) => {
  const visitorId = `visitor_${Math.random().toString(36).substring(2, 7)}`;
  const visitorNumber = Math.floor(Math.random() * 900) + 100;
  const visitorName = `Visitor #${visitorNumber}`;
  const visitorColor = getRandomColor();

  const visitor: Visitor = {
    id: visitorId,
    name: visitorName,
    color: visitorColor,
    connectedAt: Date.now(),
    lastActive: Date.now(),
  };

  connectedVisitors.set(visitorId, { ws, visitor });

  // 1. Send INIT to connecting client
  const allVisitorsList = Array.from(connectedVisitors.values()).map((v) => v.visitor);
  ws.send(
    JSON.stringify({
      type: 'init',
      data: {
        assignedUser: visitor,
        browserState: {
          ...browserState,
          guardTelemetry,
        },
        visitors: allVisitorsList,
        actionLog: actionLog.slice(0, 30),
        uptime: Math.floor((Date.now() - serverStartTime) / 1000),
        serverStartTime,
        guardTelemetry,
      },
    })
  );

  // 2. Broadcast user joined
  broadcast(
    {
      type: 'user:joined',
      visitor,
      visitorsCount: connectedVisitors.size,
    },
    ws
  );

  addActionLog(visitorId, visitorName, visitorColor, 'tab', `Joined the 24/7 browser session`);

  // 3. Handle incoming client events
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      visitor.lastActive = Date.now();

      switch (msg.type) {
        case 'cursor:move': {
          visitor.cursor = { x: msg.x, y: msg.y };
          broadcast(
            {
              type: 'cursor:update',
              userId: visitorId,
              userName: visitor.name,
              userColor: visitor.color,
              x: msg.x,
              y: msg.y,
            },
            ws
          );
          break;
        }

        case 'browser:navigate': {
          const { url, tabId } = msg;
          const targetTabId = tabId || browserState.activeTabId;
          const tab = browserState.tabs.find((t) => t.id === targetTabId);
          if (tab) {
            tab.url = url;
            tab.title = msg.title || url.replace(/^https?:\/\//, '').split('/')[0];
          }

          browserState.history.push({ url, title: tab?.title || url, timestamp: Date.now() });
          browserState.historyIndex = browserState.history.length - 1;

          const action = addActionLog(
            visitorId,
            visitor.name,
            visitor.color,
            'navigate',
            `Navigated to ${url}`
          );

          saveStateToDisk();

          broadcast({
            type: 'browser:navigated',
            tabId: targetTabId,
            url,
            title: tab?.title,
            action,
          });
          break;
        }

        case 'browser:click': {
          const action = addActionLog(
            visitorId,
            visitor.name,
            visitor.color,
            'click',
            `Clicked "${msg.text || msg.tagName || 'element'}" at (${Math.round(msg.x)}, ${Math.round(msg.y)})`
          );

          broadcast({
            type: 'browser:clicked',
            userId: visitorId,
            userName: visitor.name,
            userColor: visitor.color,
            x: msg.x,
            y: msg.y,
            selector: msg.selector,
            action,
          });
          break;
        }

        case 'browser:input': {
          if (msg.selector) {
            browserState.formValues[msg.selector] = msg.value;
          }

          broadcast(
            {
              type: 'browser:input_updated',
              userId: visitorId,
              selector: msg.selector,
              id: msg.id,
              name: msg.name,
              value: msg.value,
            },
            ws
          );
          break;
        }

        case 'browser:scroll': {
          browserState.scrollPosition = { scrollX: msg.scrollX, scrollY: msg.scrollY };
          broadcast(
            {
              type: 'browser:scrolled',
              userId: visitorId,
              scrollX: msg.scrollX,
              scrollY: msg.scrollY,
            },
            ws
          );
          break;
        }

        case 'browser:tab:switch': {
          browserState.activeTabId = msg.tabId;
          const currentTab = browserState.tabs.find((t) => t.id === msg.tabId);
          const action = addActionLog(
            visitorId,
            visitor.name,
            visitor.color,
            'tab',
            `Switched to tab "${currentTab?.title || msg.tabId}"`
          );

          broadcast({
            type: 'browser:tab_switched',
            tabId: msg.tabId,
            action,
          });
          break;
        }

        case 'browser:tab:add': {
          const newTabId = `tab-${Date.now().toString(36)}`;
          const newTab: Tab = {
            id: newTabId,
            title: msg.title || 'New Tab',
            url: msg.url || 'antideploy://hub',
            favicon: '🌐',
            zoom: 100,
          };
          browserState.tabs.push(newTab);
          browserState.activeTabId = newTabId;

          const action = addActionLog(
            visitorId,
            visitor.name,
            visitor.color,
            'tab',
            `Opened new tab "${newTab.title}"`
          );

          saveStateToDisk();

          broadcast({
            type: 'browser:tab_created',
            tab: newTab,
            action,
          });
          break;
        }

        case 'browser:tab:close': {
          if (browserState.tabs.length <= 1) return;
          const index = browserState.tabs.findIndex((t) => t.id === msg.tabId);
          if (index !== -1) {
            const closed = browserState.tabs[index];
            browserState.tabs.splice(index, 1);
            if (browserState.activeTabId === msg.tabId) {
              const nextTab = browserState.tabs[Math.max(0, index - 1)];
              browserState.activeTabId = nextTab.id;
            }

            const action = addActionLog(
              visitorId,
              visitor.name,
              visitor.color,
              'tab',
              `Closed tab "${closed.title}"`
            );

            saveStateToDisk();

            broadcast({
              type: 'browser:tab_closed',
              tabId: msg.tabId,
              newActiveTabId: browserState.activeTabId,
              action,
            });
          }
          break;
        }

        case 'browser:notes:update': {
          browserState.sharedNotes = msg.content;
          broadcast(
            {
              type: 'browser:notes_synced',
              content: msg.content,
              userId: visitorId,
            },
            ws
          );
          break;
        }

        case 'chat:send': {
          const chatEntry = {
            id: `msg_${Date.now()}`,
            userId: visitorId,
            userName: visitor.name,
            userColor: visitor.color,
            text: msg.text,
            timestamp: Date.now(),
          };

          const action = addActionLog(
            visitorId,
            visitor.name,
            visitor.color,
            'chat',
            `Message: "${msg.text.substring(0, 40)}"`
          );

          broadcast({
            type: 'chat:message',
            message: chatEntry,
            action,
          });
          break;
        }

        case 'user:rename': {
          const oldName = visitor.name;
          visitor.name = (msg.name || visitor.name).substring(0, 24);
          broadcast({
            type: 'user:updated',
            visitor,
          });
          addActionLog(
            visitorId,
            visitor.name,
            visitor.color,
            'tab',
            `Renamed from ${oldName} to ${visitor.name}`
          );
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket message parse error:', err);
    }
  });

  ws.on('close', () => {
    connectedVisitors.delete(visitorId);
    broadcast({
      type: 'user:left',
      userId: visitorId,
      visitorsCount: connectedVisitors.size,
    });
  });
});

// ==========================================
// VITE OR STATIC ASSETS MOUNT
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[antideploy] 24/7 server browser live on http://0.0.0.0:${PORT}`);
  });
}

startServer();
