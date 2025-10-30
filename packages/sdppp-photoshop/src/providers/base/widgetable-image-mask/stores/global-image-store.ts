import { sdpppSDK } from '@sdppp/common';
import { create } from 'zustand';
import { RealtimeThumbnailStore, startAutoThumbnail, stopAutoThumbnail } from './realtime-thumbnail-store';
import type { BoundaryRect } from '../utils/image-operations';

type ContentType = 'canvas' | 'curlayer' | 'selection';
type TrackType = 'image' | 'mask';

export interface AutoSyncConfig {
  type: TrackType;
  content: ContentType;
  alt?: boolean;
  boundary?: 'canvas' | 'curlayer' | 'selection';
  cropBySelection?: 'no' | 'negative' | 'positive';
}

export interface SlotState {
  auto: AutoSyncConfig | null;
  thumbnail?: string;
  uploading?: boolean;
  uploadId?: string | null;
  boundary?: BoundaryRect;
}

export interface ImageComponentState {
  id: string;
  maxCount: number;
  isMask: boolean;
  urls: string[];
  slots: Record<number, SlotState>;
  blobUrls: Set<string>;
}

export interface GlobalImageStoreState {
  components: Record<string, ImageComponentState>;

  // Component management
  registerComponent: (id: string, config: { maxCount: number; isMask: boolean; urls: string[] }) => void;
  unregisterComponent: (id: string) => void;
  updateUrls: (id: string, urls: string[]) => void;

  // Slot management
  setSlotAuto: (id: string, index: number, auto: AutoSyncConfig | null) => void;
  setSlotThumbnail: (id: string, index: number, url: string | undefined) => void;
  setSlotUploading: (id: string, index: number, uploading: boolean, uploadId?: string | null) => void;
  setSlotBoundary: (id: string, index: number, boundary: BoundaryRect | undefined) => void;
  clearSlot: (id: string, index: number) => void;

  // Utility methods
  getComponent: (id: string) => ImageComponentState | undefined;
  getSlot: (id: string, index: number) => SlotState | undefined;

  // Blob URL management
  registerBlob: (url: string) => void;
  revokeBlob: (url: string) => void;

  // Thumbnail clearing
  clearAllImageThumbnails: () => void;
  clearAllMaskThumbnails: () => void;
}

export const GlobalImageStore = create<GlobalImageStoreState>((set, get) => ({
  components: {},

  registerComponent: (id, config) => {
    set(state => {
      const existing = state.components[id];
      const urls = config.urls || [];

      return {
        components: {
          ...state.components,
          [id]: {
            id,
            maxCount: config.maxCount,
            isMask: config.isMask,
            urls,
            slots: existing?.slots || {},
            blobUrls: existing?.blobUrls || new Set<string>(),
          },
        },
      };
    });
  },

  unregisterComponent: (id) => {
    set(state => {
      const comp = state.components[id];
      if (!comp) return state;

      // Clean up slots and blob URLs
      for (const slot of Object.values(comp.slots)) {
        if (slot.thumbnail?.startsWith('blob:')) {
          try { URL.revokeObjectURL(slot.thumbnail); } catch {}
        }
      }

      // Revoke all blob URLs
      comp.blobUrls.forEach(url => {
        try { URL.revokeObjectURL(url); } catch {}
      });

      const next = { ...state.components };
      delete next[id];
      return { components: next };
    });
  },

  updateUrls: (id, urls) => {
    set(state => {
      const comp = state.components[id];
      if (!comp) return state;

      return {
        components: {
          ...state.components,
          [id]: { ...comp, urls: urls || [] },
        },
      };
    });
  },

  setSlotAuto: (id, index, auto) => {
    let previousAuto: AutoSyncConfig | null = null;
    set(state => {
      const comp = state.components[id];
      if (!comp) return state;

      const prev = comp.slots[index] || {};
      previousAuto = prev.auto || null;
      const nextSlot: SlotState = { ...prev, auto };

      return {
        components: {
          ...state.components,
          [id]: {
            ...comp,
            slots: { ...comp.slots, [index]: nextSlot },
          },
        },
      };
    });

    // Handle realtime thumbnail tracking
    const comp = get().components[id];
    const type: TrackType = auto?.type || (comp?.isMask ? 'mask' : 'image');

    if (auto) {
      startAutoThumbnail(type, auto.content, {
        alt: auto.alt,
        boundary: auto.boundary,
        cropBySelection: auto.cropBySelection,
      });
    } else if (previousAuto) {
      const prevType: TrackType = previousAuto.type || (comp?.isMask ? 'mask' : 'image');
      stopAutoThumbnail({
        type: prevType,
        content: previousAuto.content,
        alt: previousAuto.alt,
        boundary: previousAuto.boundary,
        cropBySelection: previousAuto.cropBySelection,
      });
    } else {
      // Fallback: clear all tracking for component type
      stopAutoThumbnail({ type, content: 'canvas' });
      stopAutoThumbnail({ type, content: 'curlayer' });
      stopAutoThumbnail({ type, content: 'selection' });
    }
  },

  setSlotThumbnail: (id, index, url) => {
    set(state => {
      const comp = state.components[id];
      if (!comp) return state;

      const prev = comp.slots[index] || {};
      const nextSlot: SlotState = { ...prev, thumbnail: url };

      return {
        components: {
          ...state.components,
          [id]: {
            ...comp,
            slots: { ...comp.slots, [index]: nextSlot },
          },
        },
      };
    });
  },

  setSlotUploading: (id, index, uploading, uploadId) => {
    set(state => {
      const comp = state.components[id];
      if (!comp) return state;

      const prev = comp.slots[index] || {};
      const nextSlot: SlotState = { ...prev, uploading, uploadId };

      return {
        components: {
          ...state.components,
          [id]: {
            ...comp,
            slots: { ...comp.slots, [index]: nextSlot },
          },
        },
      };
    });
  },

  setSlotBoundary: (id, index, boundary) => {
    set(state => {
      const comp = state.components[id];
      if (!comp) return state;

      const prev = comp.slots[index] || {};
      const nextSlot: SlotState = { ...prev, boundary };

      return {
        components: {
          ...state.components,
          [id]: {
            ...comp,
            slots: { ...comp.slots, [index]: nextSlot },
          },
        },
      };
    });
  },

  clearSlot: (id, index) => {
    set(state => {
      const comp = state.components[id];
      if (!comp) return state;

      const slot = comp.slots[index];
      if (slot?.thumbnail?.startsWith('blob:')) {
        try { URL.revokeObjectURL(slot.thumbnail); } catch {}
      }

      const slots = { ...comp.slots };
      delete slots[index];

      return {
        components: {
          ...state.components,
          [id]: { ...comp, slots },
        },
      };
    });
  },

  getComponent: (id) => {
    return get().components[id];
  },

  getSlot: (id, index) => {
    return get().components[id]?.slots[index];
  },

  registerBlob: (url) => {
    if (!url?.startsWith?.('blob:')) return;

    set(state => {
      const updatedComponents = { ...state.components };

      // Add to all components for now - could be more specific
      Object.keys(updatedComponents).forEach(id => {
        const comp = updatedComponents[id];
        const newBlobUrls = new Set(comp.blobUrls);
        newBlobUrls.add(url);
        updatedComponents[id] = { ...comp, blobUrls: newBlobUrls };
      });

      return { components: updatedComponents };
    });
  },

  revokeBlob: (url) => {
    if (!url?.startsWith?.('blob:')) return;

    try { URL.revokeObjectURL(url); } catch {}

    set(state => {
      const updatedComponents = { ...state.components };

      Object.keys(updatedComponents).forEach(id => {
        const comp = updatedComponents[id];
        const newBlobUrls = new Set(comp.blobUrls);
        newBlobUrls.delete(url);
        updatedComponents[id] = { ...comp, blobUrls: newBlobUrls };
      });

      return { components: updatedComponents };
    });
  },

  clearAllImageThumbnails: () => {
    set(state => {
      const nextComponents: Record<string, ImageComponentState> = { ...state.components };

      for (const [compId, comp] of Object.entries(state.components)) {
        if (!comp?.isMask && comp?.slots) {
          const nextSlots: Record<number, SlotState> = { ...comp.slots };

          for (const [k, slot] of Object.entries(comp.slots)) {
            const idx = Number(k);
            if (slot?.thumbnail?.startsWith?.('blob:')) {
              try { URL.revokeObjectURL(slot.thumbnail); } catch {}
            }
            nextSlots[idx] = { ...slot, thumbnail: undefined };
          }

          nextComponents[compId] = { ...comp, slots: nextSlots };
        }
      }

      return { components: nextComponents };
    });
  },

  clearAllMaskThumbnails: () => {
    set(state => {
      const nextComponents: Record<string, ImageComponentState> = { ...state.components };

      for (const [compId, comp] of Object.entries(state.components)) {
        if (comp?.isMask && comp?.slots) {
          const nextSlots: Record<number, SlotState> = { ...comp.slots };

          for (const [k, slot] of Object.entries(comp.slots)) {
            const idx = Number(k);
            if (slot?.thumbnail?.startsWith?.('blob:')) {
              try { URL.revokeObjectURL(slot.thumbnail); } catch {}
            }
            nextSlots[idx] = { ...slot, thumbnail: undefined };
          }

          nextComponents[compId] = { ...comp, slots: nextSlots };
        }
      }

      return { components: nextComponents };
    });
  },
}));

// Subscribe to work boundary changes to clear thumbnails (temporarily disabled)
// Reason: 暂时不用根据 boundary 清空图片
// (() => {
//   const eqRect = (a: any, b: any) => {
//     if (!a && !b) return true;
//     if (!a || !b) return false;
//     return a.leftDistance === b.leftDistance &&
//       a.topDistance === b.topDistance &&
//       a.rightDistance === b.rightDistance &&
//       a.bottomDistance === b.bottomDistance &&
//       a.width === b.width &&
//       a.height === b.height;
//   };
//
//   sdpppSDK.stores.WebviewStore.subscribe((state: any, prev: any) => {
//     try {
//       const docId = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
//       if (!docId) return;
//
//       const curr = state?.workBoundaries?.[docId];
//       const prevB = prev?.workBoundaries?.[docId];
//
//       if (!eqRect(curr, prevB)) {
//         // Boundary changed: clear thumbnails
//         try {
//           GlobalImageStore.getState().clearAllImageThumbnails();
//           GlobalImageStore.getState().clearAllMaskThumbnails();
//         } catch {}
//       }
//     } catch {}
//   });
// })();

// Hook to use component state
export function useComponent(componentId: string) {
  return GlobalImageStore(state => state.components[componentId]);
}

// Hook to use slot state with realtime thumbnails
export function useImageSlotState(componentId: string, index: number) {
  const comp = useComponent(componentId);
  const slot = comp?.slots?.[index];
  const docId = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
  const thumbs = RealtimeThumbnailStore(state => state.thumbsByDoc[docId || 0]);

  const rtKey = slot?.auto?.content ? `${slot.auto.content}${slot?.auto?.alt ? '_alt' : ''}` : null;
  const rt = rtKey
    ? (comp?.isMask ? thumbs?.mask?.[rtKey] : thumbs?.image?.[rtKey])
    : '';

  const previewUrl = rt || slot?.thumbnail || '';
  const activeAutoSyncId = slot?.auto?.content || null;

  return {
    previewUrl,
    activeAutoSyncId,
    uploading: !!slot?.uploading,
    slot,
    comp
  };
}
