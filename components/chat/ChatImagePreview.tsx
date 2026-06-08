import React from 'react';
import { X, FileText } from 'lucide-react';
import { ImageAttachment } from '@/types';

interface ChatImagePreviewProps {
  images: ImageAttachment[];
  onRemoveImage: (id: string) => void;
  imageClassName?: string;
  buttonClassName?: string;
}

export const ChatImagePreview: React.FC<ChatImagePreviewProps> = ({
  images,
  onRemoveImage,
  imageClassName = "h-32 max-w-[180px] object-cover rounded-xl border-2 border-gray-200/50 dark:border-white/10 shadow-sm",
  buttonClassName = "absolute -top-2 -right-2 w-6 h-6 bg-gray-800/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
}) => {
  if (!images || images.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-3">
      {images.map((img) => (
        <div key={img.id} className="relative group">
          {img.type?.startsWith('image/') ? (
            <img
              src={img.preview || img.url}
              alt={img.name}
              className={imageClassName}
            />
          ) : (
            <div className={`flex flex-col items-center justify-center bg-muted overflow-hidden ${imageClassName}`}>
              <FileText className="h-8 w-8 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground font-medium uppercase px-2 truncate w-full text-center">
                {img.name.split('.').pop()}
              </span>
            </div>
          )}
          <button
            onClick={() => onRemoveImage(img.id)}
            className={buttonClassName}
          >
            <X size={14} className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
