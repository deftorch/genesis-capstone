'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Maximize2,
  Minimize2,
  Maximize,
  Minimize,
  X,
  Eye,
  Code,
  GitCompare,
  ChevronDown,
  ChevronLeft,
  RefreshCw,
  Check,
  Copy,
  Download,
  FileCode2,
  Image as ImageIcon,
  Video,
  Settings,
  Wand2,
  Hand,
  ZoomOut,
  ZoomIn,
  Move,
  MessageSquare,
  Send,
  Square,
  PanelLeft,
  Play,
  Pause,
} from 'lucide-react';
import { useUIStore } from '@/lib/store/ui-store';
import { useChatStore } from '@/lib/store/chat-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useToast } from '@/lib/store/toast-store';
import { CodeEditor } from './CodeEditor';

const P5Canvas = dynamic(() => import('@/components/p5/P5Canvas'), { ssr: false });
const D3Canvas = dynamic(() => import('@/components/d3/D3Canvas'), { ssr: false });
const SVGCanvas = dynamic(() => import('@/components/svg/SVGCanvas'), { ssr: false });
const MermaidCanvas = dynamic(() => import('@/components/mermaid/MermaidCanvas'), { ssr: false });
const CodeDiff = dynamic(() => import('@/components/p5/CodeDiff'), { ssr: false });

interface ArtifactPanelProps {
  onSendMessage: (customPrompt?: string) => Promise<void>;
  isLoading: boolean;
  onStopGeneration: () => void;
  codeVersions: any[];
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  onSendMessage,
  isLoading,
  onStopGeneration,
  codeVersions,
}) => {
  const ui = useUIStore();
  const chatStore = useChatStore();
  const { preferences } = useSettingsStore();
  const { toast } = useToast();

  const [isDark, setIsDark] = useState(false);

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

    if (preferences.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [preferences.theme]);

  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [showDownloadSettings, setShowDownloadSettings] = useState(false);
  const [downloadSettings, setDownloadSettings] = useState({
    videoDuration: 10,
    videoFps: 30,
  });

  const downloadDropdownRef = useRef<HTMLDivElement>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  // Load download settings
  useEffect(() => {
    const saved = localStorage.getItem('genesis_download_settings');
    if (saved) {
      try {
        setDownloadSettings(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const updateDownloadSettings = (newSettings: Partial<typeof downloadSettings>) => {
    setDownloadSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('genesis_download_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetZoom = () => {
    ui.setZoom(1);
    ui.setPan({ x: 0, y: 0 });
  };

  // Zoom handlers
  const handleZoomIn = () => ui.setZoom((prev) => prev + 0.1);
  const handleZoomOut = () => ui.setZoom((prev) => prev - 0.1);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!ui.panMode) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...ui.pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !ui.panMode) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    ui.setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!ui.panMode || e.touches.length !== 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    panStartRef.current = { ...ui.pan };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !ui.panMode || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    ui.setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  // Fullscreen handlers
  const toggleTrueFullscreen = () => {
    if (!previewPanelRef.current) return;
    if (!document.fullscreenElement) {
      previewPanelRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      ui.setIsTrueFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [ui]);

  // Click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        downloadDropdownRef.current &&
        !downloadDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDownloadDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Download & recording logic
  const handleDownloadCode = () => {
    const element = document.createElement('a');
    const file = new Blob([ui.p5Code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    let filename = 'canvas.js';
    if (ui.activeRenderer === 'svg') filename = 'illustration.svg';
    else if (ui.activeRenderer === 'mermaid') filename = 'diagram.mmd';
    else if (ui.activeRenderer === 'd3') filename = 'visualization.js';
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadImage = () => {
    setIsDownloadDropdownOpen(false);
    const iframe = previewViewportRef.current?.querySelector('iframe');
    if (iframe?.contentWindow) {
      toast({
        title: 'Generating Image',
        description: 'Exporting canvas to PNG...',
      });
      iframe.contentWindow.postMessage('downloadCanvas', '*');
    } else {
      toast({
        title: 'Export Failed',
        description: 'Preview not ready or not loaded.',
        variant: 'destructive',
      });
    }
  };

  const handleStartRecording = () => {
    setIsDownloadDropdownOpen(false);
    const iframe = previewViewportRef.current?.querySelector('iframe');
    if (iframe?.contentWindow) {
      if (ui.activeRenderer !== 'p5') {
        toast({
          title: 'Video Recording',
          description: 'Video recording is only supported for p5.js animations.',
          variant: 'destructive',
        });
        return;
      }
      iframe.contentWindow.postMessage(
        {
          type: 'startRecording',
          fps: downloadSettings.videoFps,
        },
        '*',
      );
    } else {
      toast({
        title: 'Recording Failed',
        description: 'Preview not ready or not loaded.',
        variant: 'destructive',
      });
    }
  };

  const handleStopRecording = () => {
    const iframe = previewViewportRef.current?.querySelector('iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage('stopRecording', '*');
    }
  };

  const handleRunCode = () => {
    ui.setP5Code(ui.editableCode);
    ui.setActiveTab('preview');
    ui.setIsPlaying(true);
    setRefreshKey((prev) => prev + 1);
  };

  const handleTogglePlay = () => {
    const nextState = !ui.isPlaying;
    ui.setIsPlaying(nextState);
    const iframe = previewViewportRef.current?.querySelector('iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(nextState ? 'playCanvas' : 'pauseCanvas', '*');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ui.p5Code);
    ui.copied = true; // wait, store doesn't have setCopied but it has copied boolean. Let's do local copied state if it is easier, or store state.
    // Let's use a local state for copied to avoid state mutation directly.
    setCopiedLocal(true);
    setTimeout(() => setCopiedLocal(false), 2000);
  };
  const [copiedLocal, setCopiedLocal] = useState(false);

  // Message listener for canvas data and video data from iframes
  useEffect(() => {
    let recordingInterval: any;
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'canvasData') {
        if (event.data.dataURL) {
          const link = document.createElement('a');
          const filename = `genesis-${ui.activeRenderer}-${Date.now()}.png`;
          link.download = filename;
          link.href = event.data.dataURL;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast({
            title: 'Image Downloaded',
            description: `Successfully exported to ${filename}`,
          });
        } else {
          toast({
            title: 'Download Failed',
            description: 'Could not export canvas data.',
            variant: 'destructive',
          });
        }
      }
      
      if (event.data?.type === 'recordingStatus') {
        if (event.data.status === 'started') {
          setIsRecording(true);
          setRecordingProgress(0);
          
          toast({
            title: 'Recording Started',
            description: `Capturing p5.js canvas animation at ${downloadSettings.videoFps} FPS...`,
          });

          let seconds = 0;
          recordingInterval = setInterval(() => {
            seconds += 1;
            setRecordingProgress(seconds);
            if (seconds >= downloadSettings.videoDuration) {
              clearInterval(recordingInterval);
              handleStopRecording();
            }
          }, 1000);
        }
      }
      
      if (event.data?.type === 'recordingError') {
        setIsRecording(false);
        if (recordingInterval) clearInterval(recordingInterval);
        toast({
          title: 'Recording Error',
          description: event.data.error || 'An error occurred during recording.',
          variant: 'destructive',
        });
      }
      
      if (event.data?.type === 'videoData' && event.data.dataURL) {
        setIsRecording(false);
        if (recordingInterval) clearInterval(recordingInterval);
        
        const link = document.createElement('a');
        const filename = `genesis-animation-${Date.now()}.webm`;
        link.download = filename;
        link.href = event.data.dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: 'Video Downloaded',
          description: `Successfully saved video as ${filename}`,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (recordingInterval) clearInterval(recordingInterval);
    };
  }, [ui.activeRenderer, toast, downloadSettings]);

  const getFriendlyTitle = () => {
    const activeChat = chatStore.chats.find((c) => c.id === ui.activeChatId);
    if (activeChat && activeChat.title && activeChat.title !== 'New Chat') {
      return activeChat.title;
    }
    switch (ui.activeRenderer) {
      case 'svg':
        return 'SVG Illustration';
      case 'mermaid':
        return 'Flowchart Diagram';
      case 'd3':
        return 'Interactive Visualization';
      default:
        return 'Generative Canvas';
    }
  };

  const [localVersionDropdownOpen, setLocalVersionDropdownOpen] = useState(false);

  return (
    <div
      ref={previewPanelRef}
      className={`${
        ui.artifactMode === 'wide' ? 'fixed inset-0 z-40 w-screen h-screen' : 
        'w-full md:w-[60%] h-full border-l border-[#1e468c]/12 dark:border-white/10'
      } preview-panel-container flex flex-col overflow-hidden bg-white/90 dark:bg-[#070214]/92 backdrop-blur-xl transition-all duration-300 relative`}
    >
      {/* Row 1: Header / Title */}
      {!ui.isTrueFullscreen && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e468c]/10 dark:border-white/10 select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1a6adf] dark:text-[#60aaff] plan-badge-custom px-2 py-0.5 rounded-md">
              Artifact
            </span>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white truncate max-w-[150px] sm:max-w-[280px]">
              {getFriendlyTitle()}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => ui.setArtifactMode(ui.artifactMode === 'wide' ? 'standard' : 'wide')}
              className="hidden sm:block p-1.5 rounded-md transition-all cursor-pointer preview-panel-action"
              title={ui.artifactMode === 'wide' ? 'Standard view' : 'Widescreen view'}
            >
              {ui.artifactMode === 'wide' ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              onClick={toggleTrueFullscreen}
              className="p-1.5 rounded-md transition-all cursor-pointer preview-panel-action"
              title={ui.isTrueFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {ui.isTrueFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
            <button
              onClick={() => ui.setShowMobileChatInput(!ui.showMobileChatInput)} // use the store action
              className={`${ui.artifactMode === 'wide' ? 'block' : 'block sm:hidden'} p-1.5 rounded-md transition-all cursor-pointer preview-panel-action`}
              title="Toggle Chat Input"
            >
              <MessageSquare size={15} />
            </button>
            <button
              onClick={() => {
                ui.setShowArtifact(false);
              }}
              className="p-1.5 rounded-md transition-all cursor-pointer preview-panel-action"
              title="Close preview"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Row 2: Toolbars / Tabs */}
      {!ui.isTrueFullscreen && (
        <div className="flex items-center justify-between px-4 py-2 flex-wrap gap-2 border-b border-[#1e468c]/10 dark:border-white/10 bg-transparent select-none">
          <div className="flex items-center gap-3">
            {preferences.developerMode && (
              <div className="flex p-0.5 bg-[#1a6adf]/8 dark:bg-white/5 border border-[#1e468c]/10 dark:border-white/10 rounded-lg backdrop-blur-md">
                <button
                  onClick={() => ui.setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer preview-panel-tab ${ui.activeTab === 'preview' ? 'active' : ''}`}
                >
                  <Eye size={13} />
                  <span className="hidden sm:inline">Preview</span>
                </button>
                <button
                  onClick={() => ui.setActiveTab('code')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer preview-panel-tab ${ui.activeTab === 'code' ? 'active' : ''}`}
                >
                  <Code size={13} />
                  <span className="hidden sm:inline">Code</span>
                </button>
                <button
                  onClick={() => ui.setActiveTab('diff')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer preview-panel-tab ${ui.activeTab === 'diff' ? 'active' : ''}`}
                >
                  <GitCompare size={13} />
                  <span className="hidden sm:inline">Diff</span>
                </button>
              </div>
            )}

            {/* Version System Dropdown */}
            <div className="flex items-center gap-2 text-xs preview-panel-meta relative">
              <div
                onClick={() => setLocalVersionDropdownOpen(!localVersionDropdownOpen)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#1e468c]/15 dark:border-white/15 cursor-pointer select-none preview-panel-dropdown bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <span className="font-semibold">v{ui.activeVersionNumber || 1}</span>
                <ChevronDown
                  size={10}
                  className={`transition-transform duration-200 ${localVersionDropdownOpen ? 'rotate-180' : ''}`}
                />
              </div>

              {localVersionDropdownOpen && codeVersions.length > 0 && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setLocalVersionDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#151121] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1.5 z-40 max-h-60 overflow-y-auto animate-fade-in text-gray-900 dark:text-white">
                    <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-white/5 mb-1 select-none">
                      Version History
                    </div>
                    {codeVersions.map((v) => (
                      <button
                        key={v.versionNumber}
                        onClick={() => {
                          ui.setActiveVersionNumber(v.versionNumber);
                          setLocalVersionDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center justify-between text-xs cursor-pointer ${v.versionNumber === ui.activeVersionNumber ? 'text-[#1a6adf] dark:text-[#60aaff] font-medium bg-[#1a6adf]/5 dark:bg-[#60aaff]/5' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        <span>Version {v.versionNumber}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                          {v.renderer.toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <span className="hidden sm:inline">·</span>
              <span className="font-mono text-[11px] hidden sm:inline">
                {ui.p5Code ? ui.p5Code.split('\n').length : 0} lines ·{' '}
                {ui.p5Code ? (ui.p5Code.length / 1024).toFixed(1) : 0} KB
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1">
            {ui.activeRenderer === 'p5' && (
              <button
                onClick={handleTogglePlay}
                className="p-1.5 rounded-md transition-all cursor-pointer relative preview-panel-action text-[#60aaff] hover:bg-[#60aaff]/10"
                title={ui.isPlaying ? 'Pause Animation' : 'Play Animation'}
              >
                {ui.isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
            )}
            <button
              onClick={handleRunCode}
              className="p-1.5 rounded-md transition-all cursor-pointer preview-panel-action text-[#60aaff] hover:bg-[#60aaff]/10"
              title="Update preview"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-md transition-all cursor-pointer relative preview-panel-action"
              title="Copy code"
            >
              {copiedLocal ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
            <div className="relative" ref={downloadDropdownRef}>
              <button
                onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
                className={`p-1.5 rounded-md transition-all cursor-pointer preview-panel-action flex items-center justify-center ${isDownloadDropdownOpen ? 'bg-gray-100 dark:bg-white/10 text-white' : ''}`}
                title="Download options"
              >
                <Download size={14} />
              </button>
              {isDownloadDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => {
                      setIsDownloadDropdownOpen(false);
                      setShowDownloadSettings(false);
                    }}
                  />
                  <div className="absolute top-full right-0 mt-1.5 w-56 bg-white dark:bg-[#151121] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1.5 z-40 animate-fade-in text-gray-900 dark:text-white">
                    {!showDownloadSettings ? (
                      <>
                        <div className="px-3 pb-1.5 border-b border-gray-100 dark:border-white/5 mb-1.5 select-none">
                          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Download As
                          </span>
                        </div>
                        
                        <button
                          onClick={() => {
                            handleDownloadCode();
                            setIsDownloadDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2 text-xs cursor-pointer text-gray-700 dark:text-gray-300"
                        >
                          <FileCode2 size={13} className="text-[#60aaff]" />
                          <span>Source Code</span>
                        </button>
                        
                        <button
                          onClick={handleDownloadImage}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2 text-xs cursor-pointer text-gray-700 dark:text-gray-300"
                        >
                          <ImageIcon size={13} className="text-emerald-500" />
                          <span>Image (PNG)</span>
                        </button>

                        {ui.activeRenderer === 'p5' && (
                          <div className="flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/5 transition-colors pr-1.5 group">
                            <button
                              onClick={handleStartRecording}
                              className="flex-1 text-left px-3 py-2 flex items-center gap-2 text-xs cursor-pointer text-gray-700 dark:text-gray-300"
                            >
                              <Video size={13} className="text-red-500" />
                              <span>Video Animation (WebM)</span>
                            </button>
                            <button
                              onClick={() => setShowDownloadSettings(true)}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="Video Settings"
                            >
                              <Settings size={12} className="group-hover:rotate-45 transition-transform duration-300" />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="px-3 pb-1 flex items-center border-b border-gray-100 dark:border-white/5 mb-2 select-none">
                          <button
                            onClick={() => setShowDownloadSettings(false)}
                            className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer mr-1"
                            title="Back"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-1 text-left">
                            Video Settings
                          </span>
                        </div>

                        <div className="px-3 py-1 space-y-3">
                          <div>
                            <label className="text-[10px] font-medium text-gray-400 dark:text-gray-500 block mb-1">
                              Video Duration: {downloadSettings.videoDuration}s
                            </label>
                            <div className="grid grid-cols-4 gap-1">
                              {[5, 10, 15, 30].map((d) => (
                                <button
                                  key={d}
                                  onClick={() => updateDownloadSettings({ videoDuration: d })}
                                  className={`py-1 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer ${downloadSettings.videoDuration === d ? 'border-[#1a6adf] dark:border-[#60aaff] bg-[#1a6adf]/10 dark:bg-[#60aaff]/10 text-[#1a6adf] dark:text-[#60aaff]' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'}`}
                                >
                                  {d}s
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-medium text-gray-400 dark:text-gray-500 block mb-1">
                              Video Frame Rate: {downloadSettings.videoFps} FPS
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[30, 60].map((f) => (
                                <button
                                  key={f}
                                  onClick={() => updateDownloadSettings({ videoFps: f })}
                                  className={`py-1.5 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer ${downloadSettings.videoFps === f ? 'border-[#1a6adf] dark:border-[#60aaff] bg-[#1a6adf]/10 dark:bg-[#60aaff]/10 text-[#1a6adf] dark:text-[#60aaff]' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'}`}
                                >
                                  {f} FPS
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex-1 overflow-hidden relative">
        {/* Floating Exit Fullscreen Button */}
        {ui.isTrueFullscreen && (
          <button
            onClick={toggleTrueFullscreen}
            className="absolute top-4 right-4 z-50 p-2.5 rounded-xl bg-white/90 dark:bg-black/85 text-gray-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white shadow-lg backdrop-blur-md transition-all cursor-pointer flex items-center justify-center"
            title="Exit fullscreen"
          >
            <Minimize size={16} />
          </button>
        )}
        {ui.activeTab === 'preview' && (
          <div
            ref={previewViewportRef}
            className="w-full h-full relative overflow-hidden select-none rounded-lg border border-[#1e468c]/10 dark:border-white/10 transition-colors duration-300 bg-[#f8fafc] dark:bg-[#0b0f19]"
          >
            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-red-500/90 text-white px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm font-medium text-xs border border-red-400 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>Recording Video... {recordingProgress}s / 10s</span>
                <button
                  onClick={handleStopRecording}
                  className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded-md text-[10px] cursor-pointer transition-colors"
                >
                  Stop
                </button>
              </div>
            )}

            {/* Floating Zoom & Pan Controls */}
            <div
              className={`absolute right-4 z-40 flex items-center gap-1 bg-white/90 dark:bg-black/80 border border-slate-200 dark:border-white/10 p-1.5 rounded-xl shadow-lg backdrop-blur-md transition-all duration-300 ${ui.showMobileChatInput ? 'bottom-36' : 'bottom-4'}`}
            >
              <button
                onClick={() => ui.setPanMode(!ui.panMode)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${ui.panMode ? 'bg-[#1a6adf] text-white' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'}`}
                title={ui.panMode ? 'Interactive Mode (Mouse interaction)' : 'Pan Mode (Drag to move)'}
              >
                <Hand size={14} />
              </button>

              <span className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1" />

              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>

              <span className="text-[10px] font-mono font-bold px-1.5 min-w-[36px] text-center text-gray-600 dark:text-gray-300">
                {Math.round(ui.zoom * 100)}%
              </span>

              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>

              <span className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1" />

              <button
                onClick={handleResetZoom}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="Reset Zoom & Pan"
              >
                <Move size={14} />
              </button>
            </div>

            {/* Floating mobile chat input overlay when previewing */}
            {ui.showMobileChatInput && (
              <div className={`${ui.artifactMode === 'wide' ? 'block' : 'block sm:hidden'} absolute bottom-6 left-4 right-4 z-40 group/input max-w-3xl mx-auto`}>
                {/* Pulsing gradient border wrapper */}
                <div className={`absolute -inset-[1px] bg-gradient-to-r from-[#1a6adf] via-[#60aaff] to-[#1a6adf] dark:from-[#1a6adf] dark:via-[#60aaff] dark:to-[#1a6adf] rounded-2xl opacity-0 transition-opacity duration-500 blur-sm ${
                  !isLoading && ui.inputMessage.trim() ? 'opacity-30 group-focus-within/input:opacity-50' : 'group-hover/input:opacity-20'
                }`} />
                <div className="relative p-3 glass-panel rounded-2xl flex flex-col focus-within:border-[#1a6adf]/45 focus-within:shadow-[0_0_0_3px_rgba(26,106,223,0.10)] dark:focus-within:border-white/20 dark:focus-within:shadow-none transition-all duration-200 shadow-[0_10px_35px_rgba(26,106,223,0.15)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.55)] animate-fade-in">
                  <div className="flex flex-col">
                    <textarea
                    value={ui.inputMessage}
                    onChange={(e) => ui.setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!isLoading && ui.inputMessage.trim()) {
                          onSendMessage();
                          ui.setShowMobileChatInput(false);
                        }
                      }
                    }}
                    disabled={isLoading}
                    placeholder="Comment or ask for changes..."
                    className="w-full bg-transparent border-0 outline-none resize-none min-h-[36px] max-h-[80px] text-sm leading-relaxed text-[#0a1628] dark:text-white placeholder-[#5580bb] dark:placeholder-gray-500 disabled:opacity-50"
                    rows={1}
                  />
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#1e468c]/12 dark:border-white/5">
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 select-none">
                      Ask AI to edit this design...
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isLoading ? (
                        <button
                          onClick={() => {
                            onStopGeneration();
                            ui.setShowMobileChatInput(false);
                          }}
                          className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                          title="Stop Generation"
                        >
                          <Square size={12} className="fill-white" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (!isLoading && ui.inputMessage.trim()) {
                              onSendMessage();
                              ui.setShowMobileChatInput(false);
                            }
                          }}
                          disabled={isLoading || !ui.inputMessage.trim()}
                          className="p-1.5 bg-[#1a6adf] hover:bg-[#1a6adf]/90 dark:bg-white text-white dark:text-black dark:hover:bg-gray-100 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                          title="Send message"
                        >
                          <Send size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Pan overlay */}
            {ui.panMode && (
              <div
                className="absolute inset-0 z-30 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              />
            )}

            {/* Scaled/Panned Content Wrapper */}
            <div
              className="w-full h-full flex items-center justify-center origin-center"
              style={{
                transform: `translate(${ui.pan.x}px, ${ui.pan.y}px) scale(${ui.zoom})`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
            >
              {ui.p5Code && ui.activeRenderer === 'd3' ? (
                <D3Canvas key={`d3-${refreshKey}`} code={ui.p5Code} width={400} height={400} />
              ) : ui.p5Code && ui.activeRenderer === 'svg' ? (
                <SVGCanvas key={`svg-${refreshKey}`} code={ui.p5Code} width={400} height={400} />
              ) : ui.p5Code && ui.activeRenderer === 'mermaid' ? (
                <MermaidCanvas key={`mermaid-${refreshKey}`} code={ui.p5Code} width={400} height={400} />
              ) : ui.p5Code ? (
                <P5Canvas key={`p5-${refreshKey}`} code={ui.p5Code} width={400} height={400} />
              ) : (
                <div className="bg-gray-200 h-full flex items-center justify-center rounded-lg w-full">
                  <div className="text-center text-gray-500">
                    <Wand2 size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-semibold">No preview yet</p>
                    <p className="text-sm">Ask AI to create something visual!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {ui.activeTab === 'code' && (
          <CodeEditor value={ui.editableCode} onChange={ui.setEditableCode} />
        )}

        {ui.activeTab === 'diff' && (
          <div className="h-full">
            <CodeDiff oldCode={ui.previousCode} newCode={ui.p5Code} />
          </div>
        )}
      </div>
    </div>
  );
};
