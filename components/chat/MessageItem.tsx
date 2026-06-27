import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import dynamic from 'next/dynamic';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Pencil,
  RotateCw,
  ThumbsDown,
  ThumbsUp,
  Loader2,
  FileText,
} from 'lucide-react';
import { useUIStore } from '@/lib/store/ui-store';
import { formatMessageTimestamp } from '@/lib/utils';
import { RendererType } from '@/types';

const P5Canvas = dynamic(() => import('@/components/p5/P5Canvas'), { ssr: false });
const D3Canvas = dynamic(() => import('@/components/d3/D3Canvas'), { ssr: false });
const SVGCanvas = dynamic(() => import('@/components/svg/SVGCanvas'), { ssr: false });
const MermaidCanvas = dynamic(() => import('@/components/mermaid/MermaidCanvas'), { ssr: false });
const TwoCanvas = dynamic(() => import('@/components/twojs/TwoCanvas'), { ssr: false });
const MoJsCanvas = dynamic(() => import('@/components/mojs/MoJsCanvas'), { ssr: false });
const PixiCanvas = dynamic(() => import('@/components/pixi/PixiCanvas'), { ssr: false });
const GsapCanvas = dynamic(() => import('@/components/gsap/GsapCanvas'), { ssr: false });
const AnimeCanvas = dynamic(() => import('@/components/anime/AnimeCanvas'), { ssr: false });
const LottieCanvas = dynamic(() => import('@/components/lottie/LottieCanvas'), { ssr: false });
const MatterCanvas = dynamic(() => import('@/components/matter/MatterCanvas'), { ssr: false });

interface MessageItemProps {
  msg: any;
  index: number;
  isUser: boolean;
  storeMessage: any;
  activeVersionIdx: number;
  editingMessageId: string | null;
  editingMessageText: string;
  setEditingMessageText: (text: string) => void;
  handleSaveHomeEdit: (id: string, index: number) => void;
  setEditingMessageId: (id: string | null) => void;
  onSwitchVersionIdx: (messageId: string, idx: number) => void;
  handleCopyText: (text: string) => void;
  isLoading: boolean;
  onRegenerate: (messageId: string) => void;
  regeneratingId: string | null;
  codeVersions: any[];
}

export const MessageItem: React.FC<MessageItemProps> = ({
  msg,
  index,
  isUser,
  storeMessage,
  activeVersionIdx,
  editingMessageId,
  editingMessageText,
  setEditingMessageText,
  handleSaveHomeEdit,
  setEditingMessageId,
  onSwitchVersionIdx,
  handleCopyText,
  isLoading,
  onRegenerate,
  regeneratingId,
  codeVersions,
}) => {
  const ui = useUIStore();

  const [previewWidth, setPreviewWidth] = useState(368);
  const [previewNode, setPreviewNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!previewNode) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setPreviewWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(previewNode);
    return () => observer.disconnect();
  }, [previewNode]);

  const renderAiMessage = (content: string, messageIndex: number) => {
    const codeRegex = /```(?:javascript|js|html|svg|mermaid|p5)?\n([\s\S]*?)```/g;
    const match = codeRegex.exec(content);

    if (match) {
      const textBefore = content.substring(0, match.index);
      const code = match[1];

      let rType: RendererType = 'p5';
      if (code.includes('// renderer: d3')) {
        rType = 'd3';
      } else if (code.includes('// renderer: svg') || code.includes('<svg')) {
        rType = 'svg';
      } else if (
        code.includes('// renderer: mermaid') ||
        code.includes('graph ') ||
        code.includes('flowchart ')
      ) {
        rType = 'mermaid';
      } else if (code.includes('// renderer: twojs')) {
        rType = 'twojs';
      } else if (code.includes('// renderer: mojs')) {
        rType = 'mojs';
      } else if (code.includes('// renderer: pixi')) {
        rType = 'pixi';
      } else if (code.includes('// renderer: gsap')) {
        rType = 'gsap';
      } else if (code.includes('// renderer: anime')) {
        rType = 'anime';
      } else if (code.includes('// renderer: lottie')) {
        rType = 'lottie';
      } else if (code.includes('// renderer: matter')) {
        rType = 'matter';
      }

      const verObj = codeVersions.find((v) => v.messageIndex === messageIndex);

      return (
        <div className="flex flex-col gap-2.5">
          <style>{`
            .preview-in-chat button {
              display: none !important;
            }
          `}</style>
          {textBefore && (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-left mb-3">
              <ReactMarkdown
                components={{
                  p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                  strong: ({ ...props }) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
                  em: ({ ...props }) => <em className="italic" {...props} />,
                  ul: ({ ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1 text-left" {...props} />,
                  ol: ({ ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-left" {...props} />,
                  li: ({ ...props }) => <li className="text-sm" {...props} />,
                  code: ({ ...props }) => (
                    <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                  ),
                }}
              >
                {textBefore}
              </ReactMarkdown>
            </div>
          )}

          <div
            onClick={() => {
              ui.setShowArtifact(true);
              if (verObj) {
                ui.setActiveVersionNumber(verObj.versionNumber);
              } else {
                ui.setP5Code(code);
                ui.setEditableCode(code);
                ui.setActiveRenderer(rType);
              }
              ui.setActiveTab('preview');
            }}
            className={`border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#090514]/45 overflow-hidden text-gray-200 font-mono text-[12px] cursor-pointer hover:border-[#60aaff]/35 transition-all shadow-md group/card relative ${
              !ui.showArtifact ? 'w-full' : 'max-w-full'
            }`}
          >
            <div 
              ref={setPreviewNode}
              className={`p-0 bg-white dark:bg-[#07030e]/30 rounded-xl overflow-hidden flex items-center justify-center relative select-none preview-in-chat pointer-events-none aspect-[8/5] ${
                !ui.showArtifact 
                  ? 'w-full' 
                  : 'w-[280px] sm:w-[368px] max-w-full'
              }`}
            >
              <div 
                className="absolute left-0 top-0 origin-top-left"
                style={{ 
                  width: '800px', 
                  height: '500px',
                  transform: `scale(${previewWidth / 800})`
                }}
              >
                {rType === 'd3' && <D3Canvas code={code} />}
                {rType === 'svg' && <SVGCanvas code={code} />}
                {rType === 'mermaid' && <MermaidCanvas code={code} />}
                {rType === 'twojs' && <TwoCanvas code={code} />}
                {rType === 'mojs' && <MoJsCanvas code={code} />}
                {rType === 'pixi' && <PixiCanvas code={code} />}
                {rType === 'gsap' && <GsapCanvas code={code} />}
                {rType === 'anime' && <AnimeCanvas code={code} />}
                {rType === 'lottie' && <LottieCanvas code={code} />}
                {rType === 'matter' && <MatterCanvas code={code} />}
                {rType === 'p5' && <P5Canvas code={code} />}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-left">
        <ReactMarkdown
          components={{
            p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
            strong: ({ ...props }) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
            em: ({ ...props }) => <em className="italic" {...props} />,
            ul: ({ ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1 text-left" {...props} />,
            ol: ({ ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-left" {...props} />,
            li: ({ ...props }) => <li className="text-sm" {...props} />,
            code: ({ ...props }) => (
              <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-xs font-mono" {...props} />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in w-full`}>
      <div className={`flex flex-col gap-1.5 group ${!isUser && !ui.showArtifact ? 'w-full max-w-full' : 'max-w-[92%] sm:max-w-[80%]'}`}>
        <div
          className={`p-4 rounded-xl shadow-sm border ${
            isUser
              ? 'bg-[#1a6adf] dark:bg-[#60aaff]/10 border-transparent dark:border-[#60aaff]/20 text-white dark:text-[#b8d4ff]'
              : 'glass-panel text-[#0a1628] dark:text-gray-100'
          }`}
        >
          {isUser ? (
            editingMessageId === storeMessage?.id && storeMessage ? (
              <div className="space-y-2 min-w-[220px]">
                <textarea
                  value={editingMessageText}
                  onChange={(e) => setEditingMessageText(e.target.value)}
                  className="w-full min-h-[60px] p-2 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1525] text-sm text-gray-900 dark:text-white resize-y"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleSaveHomeEdit(storeMessage.id, index)}
                    className="px-2.5 py-1 bg-white text-black rounded text-xs font-semibold hover:bg-gray-100"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingMessageId(null)}
                    className="px-2.5 py-1 border border-white/20 rounded text-xs font-semibold text-white/80 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {msg.images && msg.images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {msg.images.map((img: any, imgIdx: number) => {
                      const isObject = typeof img === 'object';
                      const url = isObject ? (img.preview || img.url) : img;
                      const isImage = isObject ? img.type?.startsWith('image/') : true;
                      const name = isObject ? img.name : `Attached image ${imgIdx + 1}`;
                      
                      return isImage ? (
                        <img
                          key={imgIdx}
                          src={url}
                          alt={name}
                          className="max-w-[260px] max-h-[200px] object-cover rounded-xl border border-white/20 shadow-sm bg-background"
                        />
                      ) : (
                        <div key={imgIdx} className="flex flex-col items-center justify-center bg-muted rounded-xl border border-white/20 shadow-sm overflow-hidden w-24 h-24">
                          <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground font-medium uppercase px-2 truncate w-full text-center">
                            {name.split('.').pop()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {msg.content && (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-left">
                    {msg.content}
                  </div>
                )}
              </div>
            )
          ) : (
            renderAiMessage(msg.content, index)
          )}
        </div>

        <div
          className={`flex items-center gap-2.5 px-1 mt-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 select-none text-[11px] ${isUser ? 'justify-end' : 'justify-start'}`}
        >
          <div className="relative group/tooltip flex items-center gap-1 cursor-default text-[10px] text-gray-400 dark:text-gray-500">
            <span>
              {formatMessageTimestamp(storeMessage?.timestamp || new Date())}
            </span>
            <div
              className={`absolute bottom-full mb-1 hidden group-hover/tooltip:block bg-gray-900 dark:bg-popover border border-slate-700 dark:border-white/10 text-white dark:text-popover-foreground text-[10px] rounded px-2 py-1 shadow-md whitespace-nowrap z-50 ${isUser ? 'right-0' : 'left-0'}`}
            >
              {new Date(storeMessage?.timestamp || new Date()).toLocaleDateString('en-US', {
                dateStyle: 'medium',
              })}
              ,{' '}
              {new Date(storeMessage?.timestamp || new Date()).toLocaleTimeString('en-US', {
                timeStyle: 'short',
              })}{' '}
              — {isUser ? 'you' : 'assistant'}
            </div>
          </div>

          <span className="text-gray-300 dark:text-white/5 select-none">|</span>

          {storeMessage?.versions && storeMessage.versions.length > 1 && (
            <>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                <button
                  disabled={activeVersionIdx === 0}
                  onClick={() => onSwitchVersionIdx(storeMessage.id, activeVersionIdx - 1)}
                  className="hover:text-[#1a6adf] dark:hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft size={10} />
                </button>
                <span className="font-mono">
                  {activeVersionIdx + 1} / {storeMessage.versions.length}
                </span>
                <button
                  disabled={activeVersionIdx === storeMessage.versions.length - 1}
                  onClick={() => onSwitchVersionIdx(storeMessage.id, activeVersionIdx + 1)}
                  className="hover:text-[#1a6adf] dark:hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight size={10} />
                </button>
              </div>
              <span className="text-gray-300 dark:text-white/5 select-none">|</span>
            </>
          )}

          {!isUser && (
            <>
              <button
                className="hover:text-[#1a6adf] dark:hover:text-white transition-colors cursor-pointer"
                title="Like message"
              >
                <ThumbsUp size={11} />
              </button>
              <button
                className="hover:text-[#1a6adf] dark:hover:text-white transition-colors cursor-pointer"
                title="Dislike message"
              >
                <ThumbsDown size={11} />
              </button>
            </>
          )}
          <button
            onClick={() => handleCopyText(msg.content)}
            className="hover:text-[#1a6adf] dark:hover:text-white transition-colors cursor-pointer"
            title="Copy message"
          >
            <Copy size={11} />
          </button>
          {isUser && storeMessage && (
            <button
              onClick={() => {
                setEditingMessageId(storeMessage.id);
                setEditingMessageText(msg.content);
              }}
              className="hover:text-[#1a6adf] dark:hover:text-white transition-colors cursor-pointer"
              title="Edit message"
            >
              <Pencil size={11} />
            </button>
          )}
          {storeMessage && (
            <button
              disabled={isLoading}
              onClick={() => onRegenerate(storeMessage.id)}
              className="hover:text-[#1a6adf] dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Retry generation"
            >
              {regeneratingId === storeMessage.id ? (
                <Loader2 className="animate-spin" size={11} />
              ) : (
                <RotateCw size={11} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
