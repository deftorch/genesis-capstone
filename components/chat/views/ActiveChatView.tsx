import React from 'react';
import { Loader2, Paperclip, ChevronDown, Send } from 'lucide-react';
import { MessageList } from '@/components/chat/MessageList';
import { ChatImagePreview } from '@/components/chat/ChatImagePreview';
import { useUIStore } from '@/lib/store/ui-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useToast } from '@/lib/store/toast-store';
import { AIModel, ImageAttachment } from '@/types';
import { FILE_UPLOAD_CONFIG, AI_MODELS } from '@/config/constants';

interface ActiveChatViewProps {
  messages: any[];
  isLoading: boolean;
  regeneratingId: string | null;
  onRegenerate: (messageId: string) => void;
  onSwitchVersionIdx: (messageId: string, idx: number) => void;
  onSaveMessageEdit: (messageId: string, index: number, text: string) => void;
  codeVersions: any[];
  
  attachedImages: ImageAttachment[];
  removeAttachedImage: (id: string) => void;
  chatInputRef: React.RefObject<HTMLTextAreaElement>;
  onSendMessage: () => void;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  
  modelDropdownRef: React.RefObject<HTMLDivElement>;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  isModelDropdownOpen: boolean;
  setIsModelDropdownOpen: (open: boolean) => void;
}

export const ActiveChatView: React.FC<ActiveChatViewProps> = ({
  messages,
  isLoading,
  regeneratingId,
  onRegenerate,
  onSwitchVersionIdx,
  onSaveMessageEdit,
  codeVersions,
  
  attachedImages,
  removeAttachedImage,
  chatInputRef,
  onSendMessage,
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

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          regeneratingId={regeneratingId}
          onRegenerate={onRegenerate}
          onSwitchVersionIdx={onSwitchVersionIdx}
          onSaveMessageEdit={onSaveMessageEdit}
          codeVersions={codeVersions}
        />
      </div>

      <div className="border-t border-[#1e468c]/12 dark:border-white/10 p-4 flex-shrink-0 bg-transparent w-full">
        <div className="max-w-3xl mx-auto w-full">
          <div className="glass-panel w-full rounded-2xl p-4 flex flex-col focus-within:border-[#1a6adf]/45 focus-within:shadow-[0_0_0_3px_rgba(26,106,223,0.10)] dark:focus-within:border-white/20 dark:focus-within:shadow-none transition-all duration-200 shadow-sm">
            <ChatImagePreview 
              images={attachedImages} 
              onRemoveImage={removeAttachedImage} 
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
              className="w-full bg-transparent border-0 outline-none resize-none min-h-[36px] max-h-[150px] text-[15px] leading-relaxed text-[#0a1628] dark:text-white placeholder-[#5580bb] dark:placeholder-gray-500 disabled:opacity-50"
              rows={1}
              ref={chatInputRef}
            />
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1e468c]/12 dark:border-white/5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading || attachedImages.length >= FILE_UPLOAD_CONFIG.maxFiles}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Attach image"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                </button>
                {attachedImages.length > 0 && (
                  <span className="text-[10px] text-gray-400">
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
                <button
                  onClick={() => onSendMessage()}
                  disabled={isLoading || (!ui.inputMessage.trim() && attachedImages.length === 0)}
                  className="p-2.5 bg-[#1a6adf] dark:bg-white text-white dark:text-black hover:opacity-95 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
