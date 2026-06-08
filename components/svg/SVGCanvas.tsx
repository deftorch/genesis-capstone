'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings-store';

interface SVGCanvasProps {
  code: string;
  width?: number;
  height?: number;
  onError?: (error: Error) => void;
}

const SVGCanvas: React.FC<SVGCanvasProps> = ({ code, width = 400, height = 400, onError }) => {
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
    const cleanCode = code.replace(/^\/\/ renderer: svg\s*\n?/, '').trim();

    // Encode the SVG markup as base64 to avoid escaping issues in srcdoc
    const encodedSVG = btoa(unescape(encodeURIComponent(cleanCode)));

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
      overflow: hidden;
      transition: background-color 0.3s ease;
    }
    .svg-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100vh;
      padding: 20px;
    }
    .svg-container svg {
      max-width: 100%;
      height: auto !important;
      display: block;
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
</head>
<body>
  <div class="svg-container" id="svg-root"></div>
  <script>
    // Error handling
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      document.body.innerHTML = '<div class="error"><strong>SVG Error:</strong><br>' + msg + '</div>';
      return false;
    };

    // Listen for download request from parent
    window.addEventListener('message', function(event) {
      if (event.data === 'downloadCanvas') {
        var svgElement = document.querySelector('svg');
        if (svgElement) {
          var rect = svgElement.getBoundingClientRect();
          var clone = svgElement.cloneNode(true);
          
          if (!clone.hasAttribute('viewBox')) {
            var w = clone.getAttribute('width') ? parseFloat(clone.getAttribute('width')) : rect.width;
            var h = clone.getAttribute('height') ? parseFloat(clone.getAttribute('height')) : rect.height;
            clone.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
          }
          
          var targetWidth = Math.max(1, rect.width * 2);
          var targetHeight = Math.max(1, rect.height * 2);
          clone.setAttribute('width', targetWidth);
          clone.setAttribute('height', targetHeight);
          
          var svgData = new XMLSerializer().serializeToString(clone);
          var svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          var url = URL.createObjectURL(svgBlob);
          var img = new Image();
          img.onload = function() {
            var canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            var dataURL = canvas.toDataURL('image/png');
            window.parent.postMessage({ type: 'canvasData', dataURL: dataURL }, '*');
          };
          img.onerror = function() {
            URL.revokeObjectURL(url);
            window.parent.postMessage({ type: 'canvasData', dataURL: null }, '*');
          };
          img.src = url;
        } else {
          window.parent.postMessage({ type: 'canvasData', dataURL: null }, '*');
        }
      }
    });

    try {
      var container = document.getElementById('svg-root');
      // Decode the base64-encoded SVG markup
      var svgMarkup = decodeURIComponent(escape(atob('${encodedSVG}')));
      container.innerHTML = svgMarkup;

      // Validate that an SVG element was actually rendered
      if (!container.querySelector('svg')) {
        container.innerHTML = '<div class="error"><strong>SVG Error:</strong><br>No valid SVG element found in the code.</div>';
      }
    } catch(e) {
      document.body.innerHTML = '<div class="error"><strong>SVG Error:</strong><br>' + e.message + '</div>';
    }
  </script>
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
            link.download = `genesis-svg-${Date.now()}.png`;
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
          <p>No SVG illustration to preview</p>
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
        sandbox="allow-scripts"
        title="SVG Illustration"
      />
    </div>
  );
};

export default SVGCanvas;
