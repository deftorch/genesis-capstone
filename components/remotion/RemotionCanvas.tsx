'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import * as remotion from 'remotion';
import * as Babel from '@babel/standalone';
import { useSettingsStore } from '@/lib/store/settings-store';

interface RemotionCanvasProps {
  code: string;
  width?: number;
  height?: number;
  onError?: (error: Error) => void;
}

const RemotionCanvas: React.FC<RemotionCanvasProps> = ({ code, width = 400, height = 400, onError }) => {
  const [Component, setComponent] = useState<React.FC<any> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { preferences } = useSettingsStore();

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const theme = useSettingsStore.getState().preferences.theme;
      if (theme === 'dark') return true;
      if (theme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
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
  }, [preferences.theme]);

  useEffect(() => {
    if (!code) return;
    
    try {
      setErrorMsg(null);
      // Clean up the code for Babel
      let cleanCode = code;
      // Remove // renderer: remotion
      cleanCode = cleanCode.replace(/\/\/ renderer: remotion\n?/g, '');
      
      const compiled = Babel.transform(cleanCode, {
        presets: ['react', 'env'],
      }).code;

      if (!compiled) {
        throw new Error("Compilation failed");
      }

      // We provide React and remotion to the evaluated context
      const exports: any = {};
      const requireFunc = (moduleName: string) => {
        if (moduleName === 'remotion') return remotion;
        if (moduleName === 'react') return React;
        throw new Error(`Module ${moduleName} is not available in the sandbox.`);
      };

      const fn = new Function('React', 'exports', 'require', compiled);
      fn(React, exports, requireFunc);

      if (exports.default) {
        setComponent(() => exports.default);
      } else {
        throw new Error("No default export found. Use 'export default MyComponent'.");
      }
    } catch (err: any) {
      console.error("Remotion Compilation Error:", err);
      setErrorMsg(err.message || 'Unknown error during compilation');
      if (onError) onError(err);
      setComponent(null);
    }
  }, [code, onError]);

  if (errorMsg) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg overflow-auto">
        <div className="font-mono text-xs">
          <strong>Remotion Error:</strong>
          <br />
          {errorMsg}
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f8fafc] dark:bg-[#0b0f19] text-gray-400 text-sm rounded-lg">
        Compiling Remotion...
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-[#0b0f19]' : 'bg-[#f8fafc]'} rounded-lg overflow-hidden`}>
      <Player
        component={Component}
        durationInFrames={120}
        compositionWidth={1080}
        compositionHeight={1080}
        fps={30}
        controls
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};

export default RemotionCanvas;
