import React from 'react';
import { RemoteCursor, RemoteClick } from '../types';

interface RemoteCursorsProps {
  cursors: Map<string, RemoteCursor>;
  clicks: RemoteClick[];
  currentUserId: string;
}

export const RemoteCursors: React.FC<RemoteCursorsProps> = ({
  cursors,
  clicks,
  currentUserId,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {/* Remote Click Ripples */}
      {clicks.map((click) => (
        <div
          key={click.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${click.x}px`, top: `${click.y}px` }}
        >
          <div
            className="w-10 h-10 rounded-full border-2 animate-ping"
            style={{
              borderColor: click.userColor,
              backgroundColor: `${click.userColor}20`,
            }}
          />
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-white whitespace-nowrap shadow-md"
            style={{ backgroundColor: click.userColor }}
          >
            {click.userName} clicked
          </div>
        </div>
      ))}

      {/* Remote Cursors */}
      {Array.from(cursors.values()).map((c) => {
        if (c.userId === currentUserId) return null; // Don't show own cursor

        return (
          <div
            key={c.userId}
            className="absolute transition-all duration-75 ease-out pointer-events-none"
            style={{
              left: `${c.x}px`,
              top: `${c.y}px`,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* SVG Mouse Pointer */}
            <svg
              className="w-5 h-5 filter drop-shadow-md"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={c.userColor}
                stroke="#0f172a"
                strokeWidth="1.2"
              />
            </svg>

            {/* User Label Tag */}
            <div
              className="ml-3 -mt-2 px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-sm flex items-center gap-1 select-none whitespace-nowrap"
              style={{ backgroundColor: c.userColor }}
            >
              <span>{c.userName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
