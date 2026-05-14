'use client';

/**
 * ThemeColorProvider
 * Reads themeColor from /api/system-settings once on mount and injects
 * it as CSS custom properties on :root, so every Tailwind class that
 * references hsl(var(--primary)) picks up the admin-chosen colour.
 */
import { useEffect } from 'react';

// Convert #rrggbb → "H S% L%" string (for CSS `hsl(var(--primary))`)
function hexToHsl(hex: string): string | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(hex: string) {
  const hsl = hexToHsl(hex);
  if (!hsl) return;
  const root = document.documentElement;
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--ring', hsl);
  // Also update the Tailwind @theme custom properties for emerald/green aliases
  // so bg-emerald-500, text-emerald-600 etc. stay in sync
  root.style.setProperty('--color-brand-primary', hex);
}

export default function ThemeColorProvider() {
  useEffect(() => {
    // Check session cache first to avoid flicker on every page navigation
    const cached = sessionStorage.getItem('mm_theme_color');
    if (cached) {
      applyTheme(cached);
    }

    // Fetch fresh theme from system settings
    fetch('/api/system-settings')
      .then(r => r.json())
      .then(data => {
        const color: string | undefined = data?.settings?.themeColor;
        if (color && color.startsWith('#')) {
          applyTheme(color);
          sessionStorage.setItem('mm_theme_color', color);
        }
      })
      .catch(() => {/* keep existing CSS default */});
  }, []);

  return null; // purely side-effectful
}
