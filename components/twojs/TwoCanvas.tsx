'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings-store';

interface TwoCanvasProps {
  code: string;
  width?: number;
  height?: number;
  onError?: (error: Error) => void;
  onDownload?: () => void;
}

const TwoCanvas: React.FC<TwoCanvasProps> = ({ code, width = 400, height = 400, onError }) => {
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
    }
    svg, canvas { 
      display: block;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 100%;
      height: auto !important;
    }
    .error {
      color: #ff6b6b;
      font-family: monospace;
      padding: 20px;
      background: ${isDark ? '#2d1f1f' : '#fee2e2'};
      border-radius: 8px;
      max-width: 90%;
      word-wrap: break-word;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/two.js/0.8.14/two.min.js"></script>
</head>
<body>
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
          // If Two.js renders as SVG
          const svg = document.querySelector('svg');
          if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const DOMURL = window.URL || window.webkitURL || window;
            const url = DOMURL.createObjectURL(blob);
            
            const img = new Image();
            img.onload = function () {
              const offscreenCanvas = document.createElement('canvas');
              offscreenCanvas.width = svg.clientWidth * 2;
              offscreenCanvas.height = svg.clientHeight * 2;
              const ctx = offscreenCanvas.getContext('2d');
              ctx.scale(2, 2);
              
              // Fill background
              ctx.fillStyle = '${isDark ? '#0b0f19' : '#ffffff'}';
              ctx.fillRect(0, 0, svg.clientWidth, svg.clientHeight);
              
              ctx.drawImage(img, 0, 0);
              DOMURL.revokeObjectURL(url);
              
              const dataURL = offscreenCanvas.toDataURL('image/png');
              window.parent.postMessage({ type: 'canvasData', dataURL: dataURL }, '*');
            };
            img.onerror = function(e) {
               window.parent.postMessage({ type: 'canvasData', dataURL: null }, '*');
            }
            img.src = url;
          } else {
             window.parent.postMessage({ type: 'canvasData', dataURL: null }, '*');
          }
        }
      }
    });

    try {
      // User's Two.js code
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
        title="Two.js Artwork Preview"
      />
    </div>
  );
};

export default TwoCanvas;
