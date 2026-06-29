'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUIStore } from '@/lib/store/ui-store';
import { Check, Edit3 } from 'lucide-react';

interface PlanCanvasProps {
  code: string;
}

const markdownComponents: any = {
  h2: ({ ...props }) => <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2" {...props} />,
  h3: ({ ...props }) => <h3 className="text-md font-bold text-gray-800 dark:text-gray-100 mt-3 mb-2" {...props} />,
  p: ({ ...props }) => <p className="mb-2 last:mb-0 text-sm" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-sm text-left" {...props} />,
  ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-sm text-left" {...props} />,
  li: ({ ...props }) => <li className="" {...props} />,
  code: ({ ...props }) => <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
};

const PlanCanvas: React.FC<PlanCanvasProps> = ({ code }) => {
  const ui = useUIStore();
  
  // Clean up the `// renderer: plan` line
  const cleanCode = code.replace(/\/\/ renderer: plan\n?/g, '');

  const handleApprove = () => {
    ui.setInputMessage("Rencana disetujui. Silakan kerjakan langkah pertama.");
    ui.setShowMobileChatInput(true);
  };

  const handleRequestChanges = () => {
    ui.setInputMessage("Saya ingin mengubah rencana ini: ");
    ui.setShowMobileChatInput(true);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f8fafc] dark:bg-[#0b0f19] text-gray-800 dark:text-gray-200 p-4 sm:p-6 overflow-y-auto rounded-lg">
      <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {cleanCode}
        </ReactMarkdown>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-3 sticky bottom-0 bg-[#f8fafc]/95 dark:bg-[#0b0f19]/95 backdrop-blur-md pb-2 z-10">
        <button
          onClick={handleRequestChanges}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <Edit3 size={14} />
          Request Changes
        </button>
        <button
          onClick={handleApprove}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Check size={14} />
          Approve & Execute
        </button>
      </div>
    </div>
  );
};

export default PlanCanvas;
