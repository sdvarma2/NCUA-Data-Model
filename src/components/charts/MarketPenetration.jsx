"use client";

import { useMemo } from "react";

const R       = 54;   // arc radius
const CX      = 70;   // center x of SVG
const CY      = 70;   // center y of SVG
const VIEW_W  = 140;
const VIEW_H  = 80;   // only the top half of the circle is shown

// Angles: the arc sweeps from 180° (left) to 0° (right) across the top.
const START_DEG = 180;
const SWEEP_DEG = 180;

function polarToXY(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(cx, cy, r, startDeg, pct) {
  const endDeg   = startDeg + SWEEP_DEG * Math.min(pct, 0.9999);
  const { x: x1, y: y1 } = polarToXY(cx, cy, r, startDeg);
  const { x: x2, y: y2 } = polarToXY(cx, cy, r, endDeg);
  const largeArc  = SWEEP_DEG * pct > 180 ? 1 : 0;
  // Sweep direction: 1 = clockwise
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * Semicircular arc gauge showing market penetration.
 *
 * Props:
 *   simulation     – { months }
 *   currentMonth   – 0–60
 *   scenario       – "scenario_a" | "scenario_b"
 */
export default function MarketPenetration({ simulation, currentMonth, scenario }) {
  const row = currentMonth > 0 ? simulation?.months[currentMonth - 1] : null;

  const expansionPct  = row?.samPenetrationPct  ?? 0;
  const footprintPct  = row?.footprintSamPenetrationPct ?? 0;
  const isB           = scenario === "scenario_b";

  const expansionLabel = `${(expansionPct * 100).toFixed(1)}%`;
  const footprintLabel = `${(footprintPct * 100).toFixed(1)}%`;

  // Track path (background)
  const trackPath      = arcPath(CX, CY, R, START_DEG, 1.0);
  // Expansion market progress
  const expPath        = arcPath(CX, CY, R, START_DEG, expansionPct);
  // Footprint market progress (inner ring, slightly smaller radius)
  const footPath       = arcPath(CX, CY, R - 14, START_DEG, footprintPct);
  const footTrackPath  = arcPath(CX, CY, R - 14, START_DEG, 1.0);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full" style={{ maxWidth: 180 }}>
        {/* Track (background arc) */}
        <path d={trackPath} fill="none" stroke="#e4e4e7" strokeWidth={10} strokeLinecap="round" />
        {/* Expansion progress */}
        <path d={expPath}   fill="none" stroke="#3b82f6" strokeWidth={10} strokeLinecap="round" />

        {isB && (
          <>
            <path d={footTrackPath} fill="none" stroke="#e4e4e7" strokeWidth={7} strokeLinecap="round" />
            <path d={footPath}      fill="none" stroke="#f59e0b" strokeWidth={7} strokeLinecap="round" />
          </>
        )}

        {/* Center text */}
        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          fontSize={isB ? 11 : 14}
          fontWeight="700"
          fill="#3b82f6"
        >
          {expansionLabel}
        </text>
        {isB && (
          <text x={CX} y={CY + 8} textAnchor="middle" fontSize={9} fontWeight="600" fill="#d97706">
            {footprintLabel}
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
          Expansion market
        </span>
        {isB && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            Branch footprint
          </span>
        )}
      </div>
    </div>
  );
}
