'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings-store';

interface PixiCanvasProps {
  code: string;
  width?: number;
  height?: number;
  onError?: (error: Error) => void;
  onDownload?: () => void;
}

const PixiCanvas: React.FC<PixiCanvasProps> = ({ code, width = 400, height = 400, onError }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { preferences } = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const theme = useSettingsStore.getState().preferences.theme;
      if (theme === 'dark') return true;
      if (theme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    setMounted(true);
    const checkTheme = () => {
      if (preferences.theme === 'dark') {
        setIsDark(true);
      } else if (preferences.theme === 'system') {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      } else {
        setIsDark(false);
      }
    };
    checkTheme();

    if (preferences.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [preferences.theme]);

  // Generate the HTML content for the iframe using srcdoc
  const htmlContent = useMemo(() => {
    if (!code) return '';

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh;
      background: ${isDark ? '#0b0f19' : '#f8fafc'};
      overflow: hidden;
      transition: background-color 0.3s ease;
      position: relative;
    }
    .error {
      color: #ff6b6b;
      font-family: monospace;
      padding: 20px;
      background: ${isDark ? '#2d1f1f' : '#fee2e2'};
      border-radius: 8px;
      max-width: 90%;
      word-wrap: break-word;
      z-index: 100;
      position: relative;
    }
    #pixi-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    canvas {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <!-- Load Pixi.js inside body to ensure document.body is available if needed -->
  <script src="https://cdn.jsdelivr.net/npm/pixi.js@7.x/dist/pixi.min.js"></script>
  <div id="pixi-container"></div>
  <script>
    // Error handling
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      document.body.innerHTML = '<div class="error"><strong>Error:</strong><br>' + msg + '</div>';
      return false;
    };

    // Listen for download requests from parent
    window.addEventListener('message', function(event) {
      if (event.data === 'downloadCanvas') {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const dataURL = canvas.toDataURL('image/png');
          window.parent.postMessage({ type: 'canvasData', dataURL: dataURL }, '*');
        } else {
          window.parent.postMessage({ type: 'canvasData', dataURL: null }, '*');
        }
      }
    });

    try {
      // User's Pixi.js code
      ${code}
    } catch(e) {
      document.body.innerHTML = '<div class="error"><strong>Error:</strong><br>' + e.message + '</div>';
    }
  </script>
</body>
</html>`;
  }, [code, isDark]);

  if (!mounted) {
    return <div className="w-full h-full bg-[#f8fafc] dark:bg-[#0b0f19] animate-pulse rounded-lg" />;
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-downloads"
        title="PixiJS Preview"
      />
    </div>
  );
};

export default PixiCanvas;
