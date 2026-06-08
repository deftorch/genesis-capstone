'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings-store';

interface D3CanvasProps {
  code: string;
  width?: number;
  height?: number;
  onError?: (error: Error) => void;
}

const D3Canvas: React.FC<D3CanvasProps> = ({ code, width = 400, height = 400, onError }) => {
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

    // Strip the renderer comment from the code before injecting
    const cleanCode = code.replace(/^\/\/ renderer: d3\s*\n?/, '');

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
      background: ${isDark ? '#0b0f19' : '#ffffff'};
      color: ${isDark ? '#ffffff' : '#0f172a'};
      overflow: hidden;
      transition: background-color 0.3s ease, color 0.3s ease;
    }
    #chart {
      width: 100%;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    svg {
      display: block;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
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
    /* D3 tooltip styling */
    .tooltip {
      position: absolute;
      background: ${isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)'};
      color: ${isDark ? '#fff' : '#000'};
      border: ${isDark ? 'none' : '1px solid #e2e8f0'};
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    /* Axis styling */
    .tick text {
      fill: ${isDark ? '#aaa' : '#4b5563'};
      font-size: 12px;
    }
    .tick line {
      stroke: ${isDark ? '#444' : '#e2e8f0'};
    }
    .domain {
      stroke: ${isDark ? '#555' : '#cbd5e1'};
    }
  </style>
  <script src="https://d3js.org/d3.v7.min.js"><\/script>
</head>
<body>
  <div id="chart"></div>
  <script>
    // Error handling
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      document.body.innerHTML = '<div class="error"><strong>D3.js Error:</strong><br>' + msg + '</div>';
      return false;
    };

    // Listen for download request from parent
    window.addEventListener('message', function(event) {
      if (event.data === 'downloadCanvas') {
        const svgElement = document.querySelector('svg');
        if (svgElement) {
          const rect = svgElement.getBoundingClientRect();
          const clone = svgElement.cloneNode(true);
          
          if (!clone.hasAttribute('viewBox')) {
            const w = clone.getAttribute('width') ? parseFloat(clone.getAttribute('width')) : rect.width;
            const h = clone.getAttribute('height') ? parseFloat(clone.getAttribute('height')) : rect.height;
            clone.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
          }
          
          const targetWidth = Math.max(1, rect.width * 2);
          const targetHeight = Math.max(1, rect.height * 2);
          clone.setAttribute('width', targetWidth);
          clone.setAttribute('height', targetHeight);
          
          // Convert SVG to PNG via canvas
          const svgData = new XMLSerializer().serializeToString(clone);
          const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = '${isDark ? '#0b0f19' : '#ffffff'}';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.drawImage(img, 0, 0);
            try {
              const dataURL = canvas.toDataURL('image/png');
              window.parent.postMessage({ type: 'canvasData', dataURL: dataURL }, '*');
            } catch (e) {
              window.parent.postMessage({ type: 'canvasData', dataURL: null, error: e.message }, '*');
            }
          };
          img.onerror = function() {
            window.parent.postMessage({ type: 'canvasData', dataURL: null, error: 'Image failed to load' }, '*');
          };
          img.src = url;
        } else {
          // Fallback: try to capture the chart div
          window.parent.postMessage({ type: 'canvasData', dataURL: null }, '*');
        }
      }
    });

    try {
      // User's D3.js code
      ${cleanCode}
    } catch(e) {
      document.body.innerHTML = '<div class="error"><strong>D3.js Error:</strong><br>' + e.message + '</div>';
    }
  <\/script>
</body>
</html>`;
  }, [code, isDark]);

  // Function to trigger download
  const downloadImage = () => {
    if (iframeRef.current?.contentWindow) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'canvasData') {
          if (event.data.dataURL) {
            const link = document.createElement('a');
            link.download = `genesis-d3-${Date.now()}.png`;
            link.href = event.data.dataURL;
            link.click();
          }
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
      iframeRef.current.contentWindow.postMessage('downloadCanvas', '*');
    }
  };

  if (!code) {
    return (
      <div className={`w-full h-full flex items-center justify-center rounded-lg transition-colors duration-300 ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
        <div className="text-center">
          <p>No D3.js visualization to preview</p>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return <div className={`w-full h-full animate-pulse rounded-lg ${isDark ? 'bg-gray-950' : 'bg-white'}`} style={{ minHeight: `${height}px` }} />;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <iframe
        ref={iframeRef}
        key={code}
        srcDoc={htmlContent}
        className={`w-full flex-1 border-0 rounded-lg transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-white'}`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin"
        title="D3.js Visualization"
      />
    </div>
  );
};

export default D3Canvas;
