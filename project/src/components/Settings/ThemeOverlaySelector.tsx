import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';

interface Theme {
  id: string;
  name: string;
  preview: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const themes: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    preview: 'from-indigo-900 via-purple-900 to-pink-900',
    colors: { primary: '#4F46E5', secondary: '#7C3AED', accent: '#EC4899' }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    preview: 'from-blue-900 via-cyan-900 to-teal-900',
    colors: { primary: '#1E40AF', secondary: '#0891B2', accent: '#059669' }
  },
  {
    id: 'forest',
    name: 'Forest',
    preview: 'from-green-900 via-emerald-900 to-teal-900',
    colors: { primary: '#166534', secondary: '#047857', accent: '#0D9488' }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    preview: 'from-orange-900 via-red-900 to-pink-900',
    colors: { primary: '#EA580C', secondary: '#DC2626', accent: '#E11D48' }
  }
];

interface ThemeOverlaySelectorProps {
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
}

export function ThemeOverlaySelector({ selectedTheme, onThemeChange }: ThemeOverlaySelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Palette className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Theme Overlay</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme.id)}
            className={`relative p-4 rounded-xl border-2 transition-all ${
              selectedTheme === theme.id
                ? 'border-white/50 ring-2 ring-blue-500/30'
                : 'border-white/20 hover:border-white/30'
            }`}
          >
            <div className={`w-full h-16 rounded-lg bg-gradient-to-r ${theme.preview} mb-3`} />
            <div className="text-center">
              <h4 className="text-white font-medium">{theme.name}</h4>
              <div className="flex justify-center gap-1 mt-2">
                {Object.values(theme.colors).map((color, index) => (
                  <div
                    key={index}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            {selectedTheme === theme.id && (
              <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}