import React, { useCallback, useRef, useState } from 'react';
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

  React.useEffect(() => {
    urlsRef.current = urls || [];
  }, [urls]);

  const onSync = useCallback(
    async (index: number, syncType: string, event: SyncEvent) => {
      try {
        setUploadError('');

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

            const uploadPass = createFileUploadPass(
              file,
              (finalUrl: string) => {
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
            event.altKey
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
            (finalUrl: string) => {
              const next = updateUrlsAtIndex(urlsRef.current, index, finalUrl);
              onValueChange(next);
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
    [componentId, isMask, onValueChange, runUploadPassOnce, urls]
  );

  return { onSync, uploading, uploadError };
}