import { sdpppSDK } from '@sdppp/common';
import React, { useRef } from 'react';
import { useUploadPasses } from '../../../upload-pass-context';
import { getPhotoshopImage } from './direct-upload';
import { ImageUIStore } from '../../stores/image-ui-store';

export interface UseImageAutoSyncOptions {
  componentId: string;
  urls: string[];
  isMask: boolean;
  onValueChange: (urls: string[]) => void;
}

export function useImageAutoSync({ componentId, urls, isMask, onValueChange }: UseImageAutoSyncOptions) {
  const { addUploadPass, removeUploadPass, runUploadPassOnce } = useUploadPasses();
  const passesRef = useRef<Map<number, any>>(new Map());
  const urlsRef = useRef<string[]>(urls || []);

  React.useEffect(() => {
    urlsRef.current = urls || [];
  }, [urls]);

  const onAutoSyncChange = React.useCallback(
    (index: number, activeId: string | null, _event: { altKey: boolean; shiftKey: boolean }) => {
      const type = isMask ? 'mask' : 'image';
      const altUsed = !!_event?.altKey;
      // removed verbose logger

      // Update auto-sync state in UI store (drives realtime thumbnails)
      if (!activeId) {
        ImageUIStore.getState().setSlotAuto(componentId, index, null);
      } else if (activeId === 'canvas' || activeId === 'curlayer' || activeId === 'selection') {
        ImageUIStore.getState().setSlotAuto(componentId, index, { type, content: activeId as any, alt: altUsed });
      }

      // Remove existing pass for this slot
      const existing = passesRef.current.get(index);
      if (existing) {
        // removed verbose logger
        try { removeUploadPass(existing); } catch {}
        passesRef.current.delete(index);
      }

      // If disabled, nothing more to do
      if (!activeId) return;

      // Create a persistent upload pass that fetches latest PS content at execution time
      const uploadPass = {
        getUploadFile: async (signal?: AbortSignal) => {
          if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError');
          // removed verbose logger
          // mark slot uploading for UI indication
          try { ImageUIStore.getState().setSlotUploading(componentId, index, true); } catch {}
          // Propagate Alt semantics (reverse/crop) like once-sync Alt behavior
          const { file_token, result } = await getPhotoshopImage(isMask, activeId as any, altUsed);
          if (result?.error) throw new Error(result.error);
          if (!file_token) throw new Error('Missing file token from Photoshop');
          return { type: 'token' as const, tokenOrBuffer: file_token, fileName: `${Date.now()}.png` };
        },
        onUploaded: async (finalUrl: string) => {
          const base = Array.isArray(urlsRef.current) ? urlsRef.current : [];
          const next = base.slice();
          while (next.length <= index) next.push('');
          next[index] = finalUrl;
          // removed verbose logger
          onValueChange(next);
          // clear uploading state
          try { ImageUIStore.getState().setSlotUploading(componentId, index, false); } catch {}
        },
        onUploadError: (error: any) => {
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            // removed verbose logger
            console.warn('Auto sync upload failed:', error);
          }
          try { ImageUIStore.getState().setSlotUploading(componentId, index, false); } catch {}
        },
      };

      passesRef.current.set(index, uploadPass);
      addUploadPass(uploadPass);
    },
    [componentId, isMask, urls, onValueChange, addUploadPass, removeUploadPass]
  );

  return { onAutoSyncChange };
}
