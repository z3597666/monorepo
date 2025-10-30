import React, { useCallback, useRef } from 'react';
import { useUploadPasses } from '../../upload-pass-context';
import { GlobalImageStore, type AutoSyncConfig } from '../stores/global-image-store';
import { getPhotoshopImage } from '../utils/image-operations';
import { createTokenUploadPass, updateUrlsAtIndex, isAbortError } from '../utils/upload-helpers';

export interface AutoSyncEvent {
  altKey: boolean;
  shiftKey: boolean;
}

export interface AutoSyncOverrides {
  boundary?: 'canvas' | 'curlayer' | 'selection';
  cropBySelection?: 'no' | 'negative' | 'positive';
}

export interface UseImageAutoSyncOptions {
  componentId: string;
  urls: string[];
  isMask: boolean;
  onValueChange: (urls: string[]) => void;
}

export function useImageAutoSync({ componentId, urls, isMask, onValueChange }: UseImageAutoSyncOptions) {
  const { addUploadPass, removeUploadPass } = useUploadPasses();
  const passesRef = useRef<Map<number, any>>(new Map());
  const urlsRef = useRef<string[]>(urls || []);

  React.useEffect(() => {
    urlsRef.current = urls || [];
  }, [urls]);

  const onAutoSyncChange = useCallback(
    (index: number, activeId: string | null, event: AutoSyncEvent, overrides?: AutoSyncOverrides) => {
      const type = isMask ? 'mask' : 'image';
      const altUsed = !!event?.altKey;

      // Update auto-sync state in global store (drives realtime thumbnails)
      if (!activeId) {
        GlobalImageStore.getState().setSlotAuto(componentId, index, null);
      } else if (activeId === 'canvas' || activeId === 'curlayer' || activeId === 'selection') {
        const autoConfig: AutoSyncConfig = {
          type,
          content: activeId as any,
          alt: altUsed,
          boundary: overrides?.boundary,
          cropBySelection: overrides?.cropBySelection,
        };
        GlobalImageStore.getState().setSlotAuto(componentId, index, autoConfig);
      }

      // Remove existing pass for this slot
      const existing = passesRef.current.get(index);
      if (existing) {
        try {
          removeUploadPass(existing);
        } catch {}
        passesRef.current.delete(index);
      }

      // If disabled, nothing more to do
      if (!activeId) return;

      // Create a persistent upload pass that fetches latest PS content at execution time
      const uploadPass = {
        getUploadFile: async (signal?: AbortSignal) => {
          if (signal?.aborted) {
            throw new DOMException('Upload aborted', 'AbortError');
          }

          // Mark slot uploading for UI indication
          try {
            GlobalImageStore.getState().setSlotUploading(componentId, index, true);
          } catch {}

          // Propagate Alt semantics (reverse/crop) like once-sync Alt behavior
          const { file_token, result } = await getPhotoshopImage(isMask, activeId as any, {
            reverse: altUsed,
            boundary: overrides?.boundary,
            cropBySelection: overrides?.cropBySelection,
          });

          if (result?.error) {
            throw new Error(result.error);
          }

          if (!file_token) {
            throw new Error('Missing file token from Photoshop');
          }

          return {
            type: 'token' as const,
            tokenOrBuffer: file_token,
            fileName: `${Date.now()}.png`,
          };
        },
        onUploaded: async (finalUrl: string) => {
          const next = updateUrlsAtIndex(urlsRef.current, index, finalUrl);
          onValueChange(next);

          // Clear uploading state
          try {
            GlobalImageStore.getState().setSlotUploading(componentId, index, false);
          } catch {}
        },
        onUploadError: (error: any) => {
          if (!isAbortError(error)) {
            console.warn('Auto sync upload failed:', error);
          }
          try {
            GlobalImageStore.getState().setSlotUploading(componentId, index, false);
          } catch {}
        },
      };

      passesRef.current.set(index, uploadPass);
      addUploadPass(uploadPass);
    },
    [componentId, isMask, urls, onValueChange, addUploadPass, removeUploadPass]
  );

  return { onAutoSyncChange };
}
