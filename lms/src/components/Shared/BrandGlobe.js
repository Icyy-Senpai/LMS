import React from 'react';

const star = (x, y, r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (-90 + i * 36) * Math.PI / 180;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(x + rr * Math.cos(a)).toFixed(2)},${(y + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
};

const MERIDIANS = 6;
const SPIN = 12;
const STARS = [[150, 22, 7], [168, 12, 9], [184, 30, 6], [160, 42, 6], [176, 50, 7]];

export default function BrandGlobe({ size = 260, className = '', style }) {
  const R = 70;
  return (
    <svg className={`sdca-globe ${className}`} viewBox="0 0 200 200" width={size} height={size} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="sdcaSwoosh" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef3b3b" />
          <stop offset="55%" stopColor="#c62828" />
          <stop offset="100%" stopColor="#6d0f0f" />
        </linearGradient>
        <radialGradient id="sdcaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(198,40,40,0.35)" />
          <stop offset="100%" stopColor="rgba(198,40,40,0)" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="92" fill="url(#sdcaGlow)" className="sdca-globe-glow" />

      <g transform="rotate(-22 100 100)" className="sdca-globe-wire">
        <circle cx="100" cy="100" r={R} />
        {[-48, -24, 0, 24, 48].map(y => {
          const rx = Math.sqrt(R * R - y * y);
          return <ellipse key={y} cx="100" cy={100 + y} rx={rx} ry={rx * 0.18} />;
        })}
        {Array.from({ length: MERIDIANS }, (_, i) => (
          <ellipse key={i} cx="100" cy="100" rx="0" ry={R}>
            <animate attributeName="rx" values={`0;${R};0`} keyTimes="0;0.5;1" calcMode="spline"
              keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur={`${SPIN}s`} begin={`${-(SPIN / MERIDIANS) * i}s`} repeatCount="indefinite" />
          </ellipse>
        ))}
      </g>

      <path className="sdca-globe-swoosh" d="M160 48 C 196 92, 190 160, 132 186 C 104 198, 70 196, 46 182"
        fill="none" stroke="url(#sdcaSwoosh)" strokeWidth="7" strokeLinecap="round" />
      <path className="sdca-globe-swoosh thin" d="M150 70 C 176 110, 168 158, 120 176"
        fill="none" stroke="url(#sdcaSwoosh)" strokeWidth="2.5" strokeLinecap="round" />

      <g className="sdca-globe-stars">
        {STARS.map(([x, y, r], i) => (
          <polygon key={i} points={star(x, y, r)} style={{ animationDelay: `${i * 0.45}s`, transformOrigin: `${x}px ${y}px` }} />
        ))}
      </g>
    </svg>
  );
}
