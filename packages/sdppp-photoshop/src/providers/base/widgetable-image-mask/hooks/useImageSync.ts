import React, { useCallback, useRef, useState } from 'react';
import { sdpppSDK } from '@sdppp/common';
import { useUploadPasses } from '../../upload-pass-context';
import { GlobalImageStore } from '../stores/global-image-store';
import {
  getPhotoshopImage,
  createFileInput,
  validateImageFile,
  createBlobUrl,
} from '../utils/image-operations';
import {
  createFileUploadPass,
  createTokenUploadPass,
  updateUrlsAtIndex,
  isAbortError,
} from '../utils/upload-helpers';

export interface SyncEvent {
  altKey: boolean;
  shiftKey: boolean;
}

export interface SyncOverrides {
  boundary?: 'canvas' | 'curlayer' | 'selection';
  cropBySelection?: 'no' | 'negative' | 'positive';
}

export interface UseImageSyncOptions {
  componentId: string;
  urls: string[];
  isMask: boolean;
  onValueChange: (urls: string[]) => void;
}

export function useImageSync({ componentId, urls, isMask, onValueChange }: UseImageSyncOptions) {
  const { runUploadPassOnce } = useUploadPasses();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const urlsRef = useRef<string[]>(urls || []);
  const syncTypeRef = useRef<string>('');
  const syncOverridesRef = useRef<SyncOverrides | undefined>(undefined);

  React.useEffect(() => {
    urlsRef.current = urls || [];
  }, [urls]);

  const updateSlotBoundary = useCallback(
    async (index: number, syncType: string, overrides?: SyncOverrides) => {
      try {
        if (!componentId) return;
        GlobalImageStore.getState().setSlotBoundary(componentId, index, undefined);

        const overrideBoundary = overrides?.boundary;
        if (overrideBoundary && typeof overrideBoundary === 'object') {
          GlobalImageStore.getState().setSlotBoundary(componentId, index, overrideBoundary as any);
          return;
        }

        let boundaryType: 'curlayer' | 'selection' | undefined;
        if (overrideBoundary === 'curlayer' || overrideBoundary === 'selection') {
          boundaryType = overrideBoundary;
        } else if (syncType === 'curlayer' || syncType === 'selection') {
          boundaryType = syncType as 'curlayer' | 'selection';
        }

        if (boundaryType) {
          try {
            const res = await sdpppSDK.plugins.photoshop.getBoundary({ type: boundaryType });
            if (res?.boundary) {
              GlobalImageStore.getState().setSlotBoundary(componentId, index, res.boundary as any);
              return;
            }
          } catch (error) {
            console.warn('sdk.getBoundary failed', { boundaryType, error });
          }
        }

        const docId = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
        const workBoundaries = sdpppSDK.stores.WebviewStore.getState().workBoundaries || {};
        const fallback = docId ? workBoundaries?.[docId] : undefined;
        if (fallback) {
          GlobalImageStore.getState().setSlotBoundary(componentId, index, fallback as any);
        }
      } catch (error) {
        console.warn('Failed to resolve boundary for slot', { componentId, index, syncType, error });
      }
    },
    [componentId]
  );

  const onSync = useCallback(
    async (index: number, syncType: string, event: SyncEvent, overrides?: SyncOverrides) => {
      try {
        setUploadError('');
        syncTypeRef.current = syncType;
        syncOverridesRef.current = overrides;

        if (syncType === 'disk') {
          createFileInput((file) => {
            if (!validateImageFile(file)) {
              console.warn('Only image files are allowed');
              return;
            }

            setUploading(true);
            const blobUrl = createBlobUrl(file);
            GlobalImageStore.getState().setSlotThumbnail(componentId, index, blobUrl);
            GlobalImageStore.getState().registerBlob(blobUrl);
            GlobalImageStore.getState().setSlotBoundary(componentId, index, undefined);

            const uploadPass = createFileUploadPass(
              file,
              async (finalUrl: string) => {
                const next = updateUrlsAtIndex(urlsRef.current, index, finalUrl);
                onValueChange(next);
                setUploading(false);
              },
              (error: any) => {
                if (!isAbortError(error)) {
                  console.warn('Disk upload failed:', error);
                  setUploadError(error?.message || String(error));
                }
                setUploading(false);
              }
            );

            runUploadPassOnce(uploadPass);
          });
          return;
        }

        if (syncType === 'canvas' || syncType === 'curlayer' || syncType === 'selection') {
          setUploading(true);

          const { thumbnail_url, file_token, result } = await getPhotoshopImage(
            isMask,
            syncType as any,
            {
              reverse: event.altKey,
              boundary: overrides?.boundary,
              cropBySelection: overrides?.cropBySelection,
            }
          );

          if (result?.error) {
            throw new Error(result.error);
          }

          if (!file_token) {
            throw new Error('Missing file token from Photoshop');
          }

          if (thumbnail_url) {
            GlobalImageStore.getState().setSlotThumbnail(componentId, index, thumbnail_url);
          }

          const uploadPass = createTokenUploadPass(
            file_token,
            `${Date.now()}.png`,
            async (finalUrl: string) => {
              const next = updateUrlsAtIndex(urlsRef.current, index, finalUrl);
              onValueChange(next);
              await updateSlotBoundary(index, syncType, overrides);
              setUploading(false);
            },
            (error: any) => {
              if (!isAbortError(error)) {
                console.warn('Photoshop upload failed:', error);
                setUploadError(error?.message || String(error));
              }
              setUploading(false);
            }
          );

          runUploadPassOnce(uploadPass);
        }
      } catch (e) {
        setUploading(false);
        console.warn('onSync error:', e);
        setUploadError((e as any)?.message || String(e));
      }
    },
    [componentId, isMask, onValueChange, runUploadPassOnce, updateSlotBoundary, urls]
  );

  return { onSync, uploading, uploadError };
}
