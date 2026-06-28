import React from 'react';
import { ChevronDown, Loader2, Paperclip, Send, Square, Layout, Film, Image as ImageIcon, Play, Code, BarChart3, Network, PieChart, Shapes, GitFork, Clock } from 'lucide-react';
import { useUIStore } from '@/lib/store/ui-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useToast } from '@/lib/store/toast-store';
import { ChatImagePreview } from '@/components/chat/ChatImagePreview';
import { AIModel, ImageAttachment } from '@/types';
import { FILE_UPLOAD_CONFIG, AI_MODELS } from '@/config/constants';

interface HomeViewProps {
  chatInputRef: React.RefObject<HTMLTextAreaElement>;
  attachedImages: ImageAttachment[];
  removeAttachedImage: (id: string) => void;
  isLoading: boolean;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  modelDropdownRef: React.RefObject<HTMLDivElement>;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  isModelDropdownOpen: boolean;
  setIsModelDropdownOpen: (isOpen: boolean) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  chatInputRef,
  attachedImages,
  removeAttachedImage,
  isLoading,
  onSendMessage,
  onStopGeneration,
  isUploading,
  fileInputRef,
  modelDropdownRef,
  selectedModel,
  setSelectedModel,
  isModelDropdownOpen,
  setIsModelDropdownOpen,
}) => {
  const ui = useUIStore();
  const { preferences } = useSettingsStore();
  const { toast } = useToast();

  const [greeting, setGreeting] = React.useState('Welcome back');
  React.useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting('Good morning');
    else if (hrs < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const creationTools = [
    { name: 'Canvas', icon: Layout, prompt: 'Create a colorful animated canvas' },
    { name: 'Animation', icon: Film, prompt: 'Create a smooth animation' },
    { name: 'Art', icon: ImageIcon, prompt: 'Create generative art' },
    { name: 'Game', icon: Play, prompt: 'Create a simple interactive game' },
    { name: 'Pattern', icon: Code, prompt: 'Create a mesmerizing pattern' },
    {
      name: 'Bar Chart',
      icon: BarChart3,
      prompt: 'Create an interactive bar chart with sample sales data using D3.js',
    },
    {
      name: 'Network',
      icon: Network,
      prompt: 'Create a force-directed network graph using D3.js',
    },
    {
      name: 'Pie Chart',
      icon: PieChart,
      prompt: 'Create an animated pie chart with sample data using D3.js',
    },
    {
      name: 'Logo',
      icon: Shapes,
      prompt: 'Create a modern, minimalist logo design using SVG',
    },
    {
      name: 'Diagram',
      icon: GitFork,
      prompt: 'Create a simple flowchart diagram using SVG',
    },
    {
      name: 'Flowchart',
      icon: Network,
      prompt: 'Create a professional flowchart using Mermaid.js showing a business process',
    },
    {
      name: 'Sequence',
      icon: Clock,
      prompt: 'Create a sequence diagram using Mermaid.js for a system interaction',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-between md:justify-center p-4 md:p-8 md:gap-6 max-w-3xl mx-auto w-full h-full">
      <div className="flex-1 md:flex-initial flex flex-col items-center justify-center text-center">
        <div className="flex flex-col md:flex-row items-center gap-3.5 animate-fade-in mb-2 text-center md:text-left">
          <div className="w-[38px] h-[38px] flex-shrink-0 mb-2 md:mb-0">
            <svg className="w-full h-full mx-auto md:mx-0" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="genesisGradHome" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#60aaff" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <path
                d="M26 16C26 21.5228 21.5228 26 16 26C10.4772 26 6 21.5228 6 16C6 10.4772 10.4772 6 16 6C19.3431 6 22.2868 7.6393 24.1002 10.1584"
                stroke="url(#genesisGradHome)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path d="M16 16H25" stroke="url(#genesisGradHome)" strokeWidth="2.5" strokeLinecap="round" />
              <path
                d="M16 11L17.5 14.5L21 16L17.5 17.5L16 21L14.5 17.5L11 16L14.5 14.5L16 11Z"
                fill="url(#genesisGradHome)"
              />
            </svg>
          </div>
          <h1 className="font-serif text-3xl md:text-[40px] font-normal tracking-tight text-gray-900 dark:text-white leading-tight">
            {greeting}, Creator
          </h1>
        </div>
        <p className="hidden md:block text-gray-500 dark:text-[#b8d4ff]/80 text-center max-w-md text-sm leading-relaxed mb-2">
          Create stunning visual content with AI. Describe what you want, and watch it come to life in real-time.
        </p>
      </div>

      <div className="w-full max-w-[660px] flex flex-col items-center gap-2.5 animate-slide-up mt-auto md:mt-0">
        <div className="w-full md:hidden relative">
          <button
            onClick={() => ui.setIsMobileTemplatesOpen(!ui.isMobileTemplatesOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1a6adf]/10 dark:bg-white/5 border border-[#1a6adf]/30 dark:border-white/10 rounded-xl text-xs font-semibold text-[#1a6adf] dark:text-[#b8d4ff] hover:bg-[#1a6adf]/15 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span>Getting started with a template</span>
            <ChevronDown
              size={14}
              className={`transform transition-transform duration-200 ${ui.isMobileTemplatesOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {ui.isMobileTemplatesOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => ui.setIsMobileTemplatesOpen(false)} />
              <div className="absolute bottom-full left-0 right-0 mb-2 z-30 bg-white/95 dark:bg-[#0f0a1e]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl max-h-60 overflow-y-auto shadow-xl p-2 animate-fade-in">
                {creationTools.map((tool, index) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        ui.setInputMessage(tool.prompt);
                        ui.setIsMobileTemplatesOpen(false);
                        setTimeout(() => chatInputRef.current?.focus(), 50);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-[#1a6adf]/10 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Icon size={14} className="text-[#1a6adf] dark:text-[#60aaff] flex-shrink-0" />
                      <span>{tool.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Main input card for home view */}
        <div className="w-full glass-panel rounded-3xl p-4 md:p-5 flex flex-col focus-within:border-[#1a6adf]/45 focus-within:shadow-[0_0_0_3px_rgba(26,106,223,0.10)] dark:focus-within:border-white/20 dark:focus-within:shadow-none transition-all duration-200">
          <ChatImagePreview 
            images={attachedImages} 
            onRemoveImage={removeAttachedImage} 
            imageClassName="h-28 w-28 object-cover rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm"
            buttonClassName="absolute -top-2 -right-2 w-6 h-6 bg-gray-900/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
          />
          <textarea
            value={ui.inputMessage}
            onChange={(e) => ui.setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading) onSendMessage();
              }
            }}
            disabled={isLoading}
            placeholder="What creativity do you want to realize today?"
            className="w-full bg-transparent border-0 outline-none resize-none min-h-[44px] max-h-[180px] text-base leading-relaxed text-[#0a1628] dark:text-white placeholder-[#5580bb] dark:placeholder-gray-500 disabled:opacity-50"
            rows={1}
            ref={chatInputRef}
          />
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1e468c]/12 dark:border-white/5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading || attachedImages.length >= FILE_UPLOAD_CONFIG.maxFiles}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                title="Attach image"
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
              </button>
              {attachedImages.length > 0 && (
                <span className="text-[10px] text-gray-400 font-mono">
                  {attachedImages.length}/{FILE_UPLOAD_CONFIG.maxFiles}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={modelDropdownRef}>
                <button
                  onClick={() => {
                    if (!preferences.developerMode) {
                      toast({
                        title: 'Developer Mode Required',
                        description: 'Enable Developer Mode to select a model.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    setIsModelDropdownOpen(!isModelDropdownOpen);
                  }}
                  disabled={isLoading}
                  className="flex items-center gap-1 bg-transparent hover:bg-[#1a6adf]/10 dark:hover:bg-white/10 rounded-lg py-1 px-2.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#0a1628] dark:hover:text-white transition-colors cursor-pointer font-medium disabled:opacity-50"
                >
                  <span>
                    {preferences.developerMode
                      ? AI_MODELS[selectedModel]?.name || selectedModel
                      : 'Auto'}
                  </span>
                  <ChevronDown size={12} className={`stroke-[2] transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isModelDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-[#151121] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl py-1.5 z-50 animate-fade-in">
                    <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-white/5 mb-1">
                      Select Model
                    </div>
                    {Object.entries(AI_MODELS).map(([modelId, m]) => (
                      <button
                        key={modelId}
                        onClick={() => {
                          setSelectedModel(modelId as AIModel);
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center justify-between text-xs cursor-pointer ${selectedModel === modelId ? 'text-[#1a6adf] dark:text-[#60aaff] font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        <span>{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isLoading ? (
                <button
                  onClick={() => onStopGeneration()}
                  className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-sm transition-colors cursor-pointer"
                  title="Stop generating"
                >
                  <Square size={15} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => onSendMessage()}
                  disabled={!ui.inputMessage.trim() && attachedImages.length === 0}
                  className="p-2.5 bg-[#1a6adf] dark:bg-white text-white dark:text-black hover:opacity-95 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  title="Send message"
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick template pills for desktop view */}
        <div className="hidden md:flex flex-wrap justify-center gap-2 w-full select-none">
          {creationTools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  ui.setInputMessage(tool.prompt);
                  setTimeout(() => chatInputRef.current?.focus(), 50);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-[#1a6adf]/40 dark:hover:border-[#60aaff]/30 rounded-full transition-all cursor-pointer hover:bg-[#1a6adf]/8 dark:hover:bg-[#60aaff]/8 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Icon size={13} className="text-[#1a6adf] dark:text-[#60aaff]" />
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  {tool.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
