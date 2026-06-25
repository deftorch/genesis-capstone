'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings-store';

interface P5CanvasProps {
  code: string;
  width?: number;
  height?: number;
  onError?: (error: Error) => void;
  onDownload?: () => void;
}

const P5Canvas: React.FC<P5CanvasProps> = ({ code, width = 400, height = 400, onError }) => {
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
    canvas { 
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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"><\/script>
</head>
<body>
  <script>
    let mediaRecorder;
    let recordedChunks = [];

    // Error handling
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      document.body.innerHTML = '<div class="error"><strong>Error:</strong><br>' + msg + '</div>';
      return false;
    };

    // Listen for download and recording requests from parent
    window.addEventListener('message', function(event) {
      if (event.data === 'downloadCanvas') {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const dataURL = canvas.toDataURL('image/png');
          window.parent.postMessage({ type: 'canvasData', dataURL: dataURL }, '*');
        }
          } else if (event.data && event.data.type === 'startRecording') {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          recordedChunks = [];
          let options = { mimeType: 'video/webm;codecs=vp9' };
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm;codecs=vp8' };
          }
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm' };
          }
          try {
            const targetFps = event.data.fps || 30;
            const stream = canvas.captureStream(targetFps);
            mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorder.ondataavailable = function(e) {
              if (e.data && e.data.size > 0) {
                recordedChunks.push(e.data);
              }
            };
            mediaRecorder.onstop = function() {
              const blob = new Blob(recordedChunks, { type: 'video/webm' });
              const reader = new FileReader();
              reader.onloadend = function() {
                window.parent.postMessage({ type: 'videoData', dataURL: reader.result }, '*');
              };
              reader.readAsDataURL(blob);
            };
            mediaRecorder.start();
            window.parent.postMessage({ type: 'recordingStatus', status: 'started' }, '*');
          } catch (err) {
            window.parent.postMessage({ type: 'recordingError', error: err.message }, '*');
          }
        } else {
          window.parent.postMessage({ type: 'recordingError', error: 'No canvas element found for recording' }, '*');
        }
      } else if (event.data === 'stopRecording') {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      } else if (event.data === 'pauseCanvas') {
        if (typeof window.noLoop === 'function') window.noLoop();
      } else if (event.data === 'playCanvas') {
        if (typeof window.loop === 'function') window.loop();
      }
    });

    try {
      // User's p5.js code
      ${code}
    } catch(e) {
      document.body.innerHTML = '<div class="error"><strong>Error:</strong><br>' + e.message + '</div>';
    }
  <\/script>
</body>
</html>`;
  }, [code, isDark]);

  // Function to trigger download
  const downloadImage = () => {
    if (iframeRef.current?.contentWindow) {
      // Set up listener for canvas data
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'canvasData' && event.data.dataURL) {
          // Create download link
          const link = document.createElement('a');
          link.download = `genesis-artwork-${Date.now()}.png`;
          link.href = event.data.dataURL;
          link.click();
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
      iframeRef.current.contentWindow.postMessage('downloadCanvas', '*');
    }
  };

  // Function to record video
  const startRecording = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage('startRecording', '*');
    }
  };

  const stopRecording = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage('stopRecording', '*');
    }
  };

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
        title="p5.js Artwork Preview"
      />
    </div>
  );
};

export default P5Canvas;
