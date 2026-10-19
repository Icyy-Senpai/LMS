import React from 'react';
import BrandGlobe from './BrandGlobe';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function BrandHero({ name, role, subtitle, chips = [], extra }) {
  return (
    <section className="sdca-hero">
      <div className="sdca-hero-grid" />
      <div className="sdca-hero-glow" />
      <div className="sdca-hero-body">
        <div className="sdca-hero-kicker">
          <span className="sdca-hero-dot" />St. Dominic College of Asia{role ? ` · ${role}` : ''}
        </div>
        <h2 className="sdca-hero-title">{greeting()}{name ? <>, <span>{name}</span></> : ''}</h2>
        {subtitle && <p className="sdca-hero-sub">{subtitle}</p>}
        {chips.length > 0 && (
          <div className="sdca-hero-chips">
            {chips.map((c, i) => (
              <div key={c.label} className="sdca-hero-chip" style={{ animationDelay: `${0.25 + i * 0.08}s` }}>
                <strong>{c.value}</strong><span>{c.label}</span>
              </div>
            ))}
          </div>
        )}
        {extra}
      </div>
      <BrandGlobe size={230} className="sdca-hero-globe" />
    </section>
  );
}
