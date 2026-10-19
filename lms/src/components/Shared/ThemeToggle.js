import React from 'react';
import { Tooltip } from 'antd';
import { useThemeMode } from '../../themeMode';

/** Animated light / dark switch: a sliding knob that morphs between a sun and a crescent moon. */
export default function ThemeToggle({ className = '' }) {
  const { mode, toggle } = useThemeMode();
  const dark = mode === 'dark';

  return (
    <Tooltip title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <button type="button" className={`sdca-theme-toggle${dark ? ' is-dark' : ''} ${className}`}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark}
        onClick={(e) => toggle({ x: e.clientX, y: e.clientY })}>
        <span className="sdca-theme-toggle-stars" aria-hidden="true"><i /><i /><i /></span>
        <span className="sdca-theme-toggle-knob" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <mask id="sdca-moon-mask">
              <rect x="0" y="0" width="24" height="24" fill="#fff" />
              <circle className="sdca-moon-bite" cx="24" cy="2" r="7" fill="#000" />
            </mask>
            <circle className="sdca-sun-core" cx="12" cy="12" r="5" mask="url(#sdca-moon-mask)" />
            <g className="sdca-sun-rays">
              {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                <line key={a} x1="12" y1="1.8" x2="12" y2="4.2" transform={`rotate(${a} 12 12)`} />
              ))}
            </g>
          </svg>
        </span>
      </button>
    </Tooltip>
  );
}
