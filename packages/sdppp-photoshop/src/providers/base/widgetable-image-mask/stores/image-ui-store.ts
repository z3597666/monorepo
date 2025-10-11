import { sdpppSDK } from '@sdppp/common';
import { create } from 'zustand';
import { RealtimeThumbnailStore, startAutoThumbnail, stopAutoThumbnail } from './realtime-thumbnail-store';

type ContentType = 'canvas' | 'curlayer' | 'selection';
type TrackType = 'image' | 'mask';

export interface SlotState {
  auto: null | { type: TrackType; content: ContentType; alt?: boolean };
  thumbnail?: string;
  uploading?: boolean;
  uploadId?: string | null;
}

interface ComponentState {
  maxCount: number;
  isMask: boolean;
  slots: Record<number, SlotState>;
}

interface ImageUIState {
  components: Record<string, ComponentState>;
  blobUrls: Set<string>;
  ensureComponent: (id: string, info: { maxCount: number; isMask: boolean }) => void;
  setMaxCount: (id: string, maxCount: number) => void;
  setSlotAuto: (id: string, index: number, auto: SlotState['auto']) => void;
  setSlotThumbnail: (id: string, index: number, url: string | undefined) => void;
  setSlotUploading: (id: string, index: number, uploading: boolean, uploadId?: string | null) => void;
  clearSlot: (id: string, index: number) => void;
  clearComponent: (id: string) => void;
  clearAllImageThumbnails: () => void;
  clearAllMaskThumbnails: () => void;
  registerBlob: (url: string) => void;
  revokeBlob: (url: string) => void;
}

export const ImageUIStore = create<ImageUIState>((set, get) => ({
  components: {},
  blobUrls: new Set<string>(),
  ensureComponent: (id, info) => {
    set(state => ({
      components: state.components[id]
        ? { ...state.components, [id]: { ...state.components[id], ...info } }
        : { ...state.components, [id]: { ...info, slots: {} } },
    }));
  },
  setMaxCount: (id, maxCount) => {
    set(state => ({ components: { ...state.components, [id]: { ...(state.components[id] || { maxCount, isMask: false, slots: {} }), maxCount } } }));
  },
  setSlotAuto: (id, index, auto) => {
    set(state => {
      const comp = state.components[id] || { maxCount: 1, isMask: false, slots: {} };
      const prev = comp.slots[index] || {};
      const next: ComponentState = { ...comp, slots: { ...comp.slots, [index]: { ...prev, auto } } };
      return { components: { ...state.components, [id]: next } };
    });
    const type: TrackType = auto?.type || (get().components[id]?.isMask ? 'mask' : 'image');
    if (auto) startAutoThumbnail(type, auto.content, !!auto.alt);
    else {
      // stop all types for safety
      stopAutoThumbnail('image', 'canvas');
      stopAutoThumbnail('image', 'curlayer');
      stopAutoThumbnail('image', 'selection');
      stopAutoThumbnail('mask', 'canvas');
      stopAutoThumbnail('mask', 'curlayer');
      stopAutoThumbnail('mask', 'selection');
    }
  },
  setSlotThumbnail: (id, index, url) => {
    set(state => {
      const comp = state.components[id] || { maxCount: 1, isMask: false, slots: {} };
      const prev = comp.slots[index] || {};
      const next: ComponentState = { ...comp, slots: { ...comp.slots, [index]: { ...prev, thumbnail: url } } };
      return { components: { ...state.components, [id]: next } };
    });
  },
  setSlotUploading: (id, index, uploading, uploadId) => {
    set(state => {
      const comp = state.components[id] || { maxCount: 1, isMask: false, slots: {} };
      const prev = comp.slots[index] || {};
      const next: ComponentState = { ...comp, slots: { ...comp.slots, [index]: { ...prev, uploading, uploadId } } };
      return { components: { ...state.components, [id]: next } };
    });
  },
  clearSlot: (id, index) => {
    set(state => {
      const comp = state.components[id];
      if (!comp) return {} as any;
      const slots = { ...comp.slots };
      const s = slots[index];
      if (s?.thumbnail?.startsWith('blob:')) URL.revokeObjectURL(s.thumbnail);
      delete slots[index];
      return { components: { ...state.components, [id]: { ...comp, slots } } };
    });
  },
  clearComponent: (id) => {
    set(state => {
      const comp = state.components[id];
      if (!comp) return {} as any;
      for (const idx of Object.keys(comp.slots)) {
        const s = comp.slots[+idx];
        if (s?.thumbnail?.startsWith('blob:')) URL.revokeObjectURL(s.thumbnail);
      }
      const next = { ...state.components };
      delete next[id];
      return { components: next };
    });
  },
  clearAllImageThumbnails: () => {
    set(state => {
      const nextComponents: Record<string, ComponentState> = { ...state.components };
      for (const [compId, comp] of Object.entries(state.components)) {
        // Only clear thumbnails for image components (not masks)
        if (!comp?.isMask && comp?.slots) {
          const nextSlots: Record<number, SlotState> = { ...comp.slots };
          for (const [k, s] of Object.entries(comp.slots)) {
            const idx = Number(k);
            const prev = comp.slots[idx] || {} as SlotState;
            // Revoke blob URLs to avoid leaks
            if (prev?.thumbnail?.startsWith?.('blob:')) {
              try { URL.revokeObjectURL(prev.thumbnail); } catch {}
            }
            nextSlots[idx] = { ...prev, thumbnail: undefined };
          }
          nextComponents[compId] = { ...comp, slots: nextSlots };
        }
      }
      return { components: nextComponents };
    });
  },
  clearAllMaskThumbnails: () => {
    set(state => {
      const nextComponents: Record<string, ComponentState> = { ...state.components };
      for (const [compId, comp] of Object.entries(state.components)) {
        // Only clear thumbnails for mask components
        if (comp?.isMask && comp?.slots) {
          const nextSlots: Record<number, SlotState> = { ...comp.slots };
          for (const [k, s] of Object.entries(comp.slots)) {
            const idx = Number(k);
            const prev = comp.slots[idx] || {} as SlotState;
            if (prev?.thumbnail?.startsWith?.('blob:')) {
              try { URL.revokeObjectURL(prev.thumbnail); } catch {}
            }
            nextSlots[idx] = { ...prev, thumbnail: undefined };
          }
          nextComponents[compId] = { ...comp, slots: nextSlots };
        }
      }
      return { components: nextComponents };
    });
  },
  registerBlob: (url) => {
    if (!url?.startsWith?.('blob:')) return;
    const setRef = get().blobUrls;
    setRef.add(url);
  },
  revokeBlob: (url) => {
    if (!url?.startsWith?.('blob:')) return;
    try { URL.revokeObjectURL(url); } catch {}
    const setRef = get().blobUrls;
    setRef.delete(url);
  },
}));

export function useComponent(componentId: string) {
  return ImageUIStore(s => s.components[componentId]);
}

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
  return { previewUrl, activeAutoSyncId, uploading: !!slot?.uploading };
}

export function useBindRealtimeThumbnails(componentId: string) {
  const comp = useComponent(componentId);
  const docId = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
  // The subscription is already handled by RealtimeThumbnailStore and ImageUIStore.setSlotAuto start/stop
  // This hook simply ties the lifecycle to component presence to avoid TS unused warnings
  return !!comp && !!docId;
}

// Clear all thumbnails on WorkBoundary changes (temporarily disabled)
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
//       const curr = state?.workBoundaries?.[docId];
//       const prevB = prev?.workBoundaries?.[docId];
//       if (!eqRect(curr, prevB)) {
//         // Boundary changed: clear thumbnails of all image components
//         try {
//           ImageUIStore.getState().clearAllImageThumbnails();
//           ImageUIStore.getState().clearAllMaskThumbnails();
//         } catch {}
//       }
//     } catch {}
//   });
// })();
