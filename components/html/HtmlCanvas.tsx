'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings-store';

interface HtmlCanvasProps {
  code: string;
  width?: number;
  height?: number;
  onError?: (error: Error) => void;
  onDownload?: () => void;
}

const HtmlCanvas: React.FC<HtmlCanvasProps> = ({ code, width = 400, height = 400, onError }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { preferences } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bersihkan tag renderer di baris pertama jika ada agar tidak merusak HTML
  const cleanHtml = code.replace(/^\/\/\s*renderer\s*:\s*html\s*\n/i, '');

  if (!mounted) {
    return <div className="w-full h-full bg-[#f8fafc] dark:bg-[#0b0f19] animate-pulse rounded-lg" />;
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white dark:bg-[#0b0f19]">
      <iframe
        ref={iframeRef}
        srcDoc={cleanHtml}
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-downloads allow-same-origin"
        title="HTML Web Preview"
      />
    </div>
  );
};

export default HtmlCanvas;
