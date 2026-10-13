# 24/7 Cloud Gaming & Persistent Browser Session Engine

Perpetual server-side session execution that keeps cloud gaming services, streaming WebSockets, and live web apps connected and running 24/7—even when zero human visitors are currently on the page.

### User Review & Critical Decisions

> [!IMPORTANT]
> The primary requirement is avoiding game disconnection or timeout when zero visitors are online:
> - **Anti-AFK & Heartbeat Guard**: The server will actively dispatch synthetic micro-activity pulses (visibility spoofing, focus spoofing, keepalive heartbeats) to prevent cloud gaming services from flagging the session as idle or AFK.
> - **Continuous Background Execution**: The server maintains continuous runtime execution and network keepalive channels rather than merely saving static snapshot data.

- **Confirmed Requirement**: Sessions connected to cloud gaming or live web services must not disconnect, freeze, or sleep when no visitors are online.
- **AFK Pulse Interval**: Configurable 25-second synthetic keepalive heartbeat to beat standard 60-second / 300-second idle kick timers.
- **Demonstration Showcase**: Includes a built-in 24/7 persistent cloud-gaming simulation environment that visibly displays continuous uninterrupted ticks, physics, and state across disconnects.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms antideploy into a true perpetual cloud browser runner. When a visitor navigates to a cloud game or web service, the server keeps the underlying DOM, WebSockets, media context, and rendering loops active. When all visitors close their browser tabs, an automated Server Session Guard takes over, ensuring the game never detects idle timeout or loses connection.
- **Target Audience**: Users wanting persistent cloud gaming, remote live bots, continuous multiplayer canvases, always-on dashboards, and shared browser sandboxes that never sleep.
- **Key Value**: True zero-idle disconnect protection. You can connect a game, close your laptop, return hours later, and find the game running in the exact live state without having been kicked for inactivity.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Live Connection**: User enters a cloud game URL, web application, or launches the built-in 24/7 game world (`antideploy://game`).
  2. **Active Guard Telemetry**: Top banner and Dock display "24/7 Cloud Game Persistence: Active", showing live heartbeats, anti-AFK pulse timers, and fake-focus indicators.
  3. **Simulated Zero-Visitor Handoff**: When visitors leave (or when tested via "Test 0-Visitor Mode"), the Server Session Guard visibly assumes custody, continuing heartbeats and network keepalive pings.
  4. **Seamless Reconnection**: Reconnecting visitors see the game still running in real-time, showing continuous uptime, elapsed game ticks, and preserved network connections.

- **Visual Identity & Theme**:
  - *Aesthetic*: High-density SaaS developer console with dark slate surfaces (`#090d16`, `#0d131f`), cyan highlights (`#06b6d4`), and emerald status indicators for active keepalive.
  - *Typography*: Plus Jakarta Sans for UI structure, paired with JetBrains Mono (`tabular-nums`) for heartbeat timers, socket telemetry, and tick counters.
  - *Status Indicators*: Dedicated "Cloud Gaming Persistence" panel with live pulse radar, synthetic event counter, and visibility state monitor.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Anti-AFK Visibility & Focus Spoofing**
  - *Chosen Approach*: Inject client-side patches into the proxy pipeline that permanently lock `document.visibilityState = 'visible'`, `document.hidden = false`, and `document.hasFocus = () => true`, plus disable RAF (requestAnimationFrame) background clamping.
  - *Why*: Cloud games and WebRTC/WebSocket streaming apps detect tab switching or closing via visibility events to pause rendering or shut down streams. Spoofing active focus guarantees unthrottled streaming.
  - *Alternatives Considered*: Standard iframe sandbox without spoofing (rejected because services auto-pause within seconds of losing focus).

- **Decision 2: Automated Server Keepalive Heartbeat Pulse**
  - *Chosen Approach*: A server-side timer dispatches synthetic micro-interaction events (subtle 1px mouse wiggle, keyup null pulses, and keepalive network ping) every 25 seconds during zero-visitor periods.
  - *Why*: Cloud gaming platforms (e.g. GeForce Now, Xbox Cloud, cloud VMs) monitor user input activity to enforce 5-15 minute idle timeouts. Periodic synthetic pulses satisfy anti-AFK checks.

- **Decision 3: Built-in 24/7 Perpetual Cloud Game Simulation**
  - *Chosen Approach*: Provide a built-in canvas arena (`antideploy://game`) with continuous physics, live bots, ticking game loops, and real-time multiplayer state so users can immediately test and verify 24/7 persistence without requiring external credentials.
  - *Why*: Provides verifiable, instant proof of continuous background execution without requiring third-party game logins.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                      antideploy.com 24/7 Host                          │
│                                                                        │
│  ┌───────────────────────┐          ┌───────────────────────────────┐  │
│  │ Express + Vite Proxy  │          │    WebSocket Event Engine     │  │
│  │ - HTML Injection      │◄────────►│ - Real-time Cursors           │  │
│  │ - Base URL Rewrite    │          │ - Multi-user Interference     │  │
│  │ - Anti-CORS / Headers │          │ - Continuous Action Log       │  │
│  └───────────┬───────────┘          └───────────────┬───────────────┘  │
│              │                                      │                  │
│              ▼                                      ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             Headless 24/7 Server Session Guard                   │  │
│  │  - Zero-Visitor Detection & Automatic Custody Takeover          │  │
│  │  - Anti-AFK Keepalive Pulse Engine (every 25s)                  │  │
│  │  - Visibility & Focus Lock ('visible' / hasFocus = true)         │  │
│  │  - Unthrottled requestAnimationFrame & Timer Loop               │  │
│  │  - Persistent WebSockets & Network Ping Heartbeats              │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   Live Browser / Game Target                     │  │
│  │  (Cloud Game / Streaming WebGL / antideploy://game / External)   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Core Components to Implement:
1. **`server.ts` Keepalive Engine**:
   - `sessionGuard`: Background runner with `activeState`, `afkPulseCount`, `lastKeepaliveTime`, and `zeroVisitorCustody`.
   - Automated 25-second synthetic keepalive broadcast to active session when 0 human clients are connected.
   - Built-in `antideploy://game` endpoint hosting a real-time persistent 24/7 canvas multiplayer arena.
2. **Proxy Bridge Injection Updates**:
   - Visibility API spoofing: Overriding `document.visibilityState`, `document.hidden`, `window.onblur`, `document.hasFocus()`.
   - Anti-AFK event handler responding to keepalive pulses.
   - Throttling bypass preventing canvas/audio pause when idle.
3. **Frontend Telemetry & Controls**:
   - New "Cloud Game Persistence" tab in the dock showing live keepalive pulses, AFK prevention status, heartbeat interval, and zero-visitor simulation toggle.
   - Visual keepalive pulse radar in the header.
