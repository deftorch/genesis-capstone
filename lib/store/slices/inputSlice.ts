import { StateCreator } from 'zustand';
import { ImageAttachment } from '@/types';
import { UIState } from '../ui-store';

export interface InputSlice {
  inputMessage: string;
  attachedImages: ImageAttachment[];

  setInputMessage: (msg: string) => void;
  setAttachedImages: (images: ImageAttachment[] | ((prev: ImageAttachment[]) => ImageAttachment[])) => void;
  removeAttachedImage: (id: string) => void;
}

export const createInputSlice: StateCreator<UIState, [], [], InputSlice> = (set) => ({
  inputMessage: '',
  attachedImages: [],

  setInputMessage: (msg) => set({ inputMessage: msg }),
  setAttachedImages: (images) =>
    set((state) => ({
      attachedImages:
        typeof images === 'function' ? images(state.attachedImages) : images,
    })),
  removeAttachedImage: (id) =>
    set((state) => ({
      attachedImages: state.attachedImages.filter((img) => img.id !== id),
    })),
});
