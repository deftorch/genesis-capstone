'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useSettingsStore } from '@/lib/store/settings-store';

interface MermaidCanvasProps {
  code: string;
  width?: number;
  height?: number;
  onError?: (error: Error) => void;
}

const MermaidCanvas: React.FC<MermaidCanvasProps> = ({ code, width = 400, height = 400, onError }) => {
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
    const cleanCode = code.replace(/^\/\/ renderer: mermaid\s*\n?/, '').trim();

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      display: flex; 
      flex-direction: column;
      min-height: 100vh;
      background: ${isDark ? '#0b0f19' : '#ffffff'};
      overflow: auto;
      padding: 20px;
      transition: background-color 0.3s ease;
    }
    .mermaid {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      width: 100%;
      min-height: 100%;
    }
    .mermaid svg {
      max-width: 100% !important;
      height: auto !important;
      margin: auto;
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
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
</head>
<body>
  <div class="mermaid" id="mermaid-root">
    ${cleanCode}
  </div>
  <script>
    mermaid.initialize({ 
      startOnLoad: true,
      theme: '${isDark ? 'dark' : 'neutral'}',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
      htmlLabels: false
    });

    // Error handling
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      document.body.innerHTML = '<div class="error"><strong>Mermaid Error:</strong><br>' + msg + '</div>';
      return false;
    };

    // Listen for message from parent to get SVG data
    window.addEventListener('message', function(event) {
      if (event.data === 'downloadCanvas') {
        var svgElement = document.querySelector('svg');
        if (svgElement) {
          var bbox = svgElement.getBBox();
          var clone = svgElement.cloneNode(true);
          
          if (!clone.hasAttribute('viewBox')) {
            clone.setAttribute('viewBox', bbox.x + ' ' + bbox.y + ' ' + bbox.width + ' ' + bbox.height);
          }
          
          var targetWidth = Math.max(1, bbox.width * 2);
          var targetHeight = Math.max(1, bbox.height * 2);
          clone.setAttribute('width', targetWidth);
          clone.setAttribute('height', targetHeight);
          
          var svgData = new XMLSerializer().serializeToString(clone);
          var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
          var img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = function() {
            var canvas = document.createElement('canvas');
            var padding = 40; // High-res padding
            canvas.width = targetWidth + padding * 2;
            canvas.height = targetHeight + padding * 2;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '${isDark ? '#0b0f19' : '#ffffff'}';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, padding, padding, targetWidth, targetHeight);
            try {
              var dataURL = canvas.toDataURL('image/png');
              window.parent.postMessage({ type: 'canvasData', dataURL: dataURL }, '*');
            } catch (e) {
              window.parent.postMessage({ type: 'canvasData', dataURL: null, error: e.message }, '*');
            }
          };
          img.onerror = function(err) {
            window.parent.postMessage({ type: 'canvasData', dataURL: null, error: 'Image failed to load' }, '*');
          };
          img.src = url;
        } else {
          window.parent.postMessage({ type: 'canvasData', dataURL: null }, '*');
        }
      }
    });
  </script>
</body>
</html>`;
  }, [code, isDark]);

  const downloadImage = () => {
    if (iframeRef.current?.contentWindow) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'canvasData') {
          if (event.data.dataURL) {
            const link = document.createElement('a');
            link.download = `genesis-mermaid-${Date.now()}.png`;
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
          <p>No diagram to preview</p>
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
        title="Mermaid Diagram"
      />
    </div>
  );
};

export default MermaidCanvas;
