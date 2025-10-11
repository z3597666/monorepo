import { sdpppSDK } from '@sdppp/common';
import React, { useEffect, useRef, useState } from 'react';
import { useUploadPasses } from '../../../upload-pass-context';
import { getPhotoshopImage } from './direct-upload';
import { ImageUIStore } from '../../stores/image-ui-store';

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

  useEffect(() => {
    urlsRef.current = urls || [];
  }, [urls]);

  const onSync = React.useCallback(
    async (index: number, id: string, event: { altKey: boolean; shiftKey: boolean }) => {
      try {
        setUploadError('');
        if (id === 'disk') {
          // Create a hidden file input appended to DOM for reliable change events
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = false;
          input.style.position = 'fixed';
          input.style.left = '-10000px';
          input.style.top = '-10000px';
          document.body.appendChild(input);

          const cleanup = () => {
            try {
              // Allow re-selecting the same file next time
              input.value = '';
              // Remove from DOM
              document.body.removeChild(input);
            } catch {}
          };

          input.onchange = async () => {
            const file = input.files?.[0];
            cleanup();
            if (!file) return;
            if (!file.type?.startsWith('image/')) {
              console.warn('Only image files are allowed');
              return;
            }

            setUploading(true);
            const blobUrl = URL.createObjectURL(file);
            ImageUIStore.getState().setSlotThumbnail(componentId, index, blobUrl);
            ImageUIStore.getState().registerBlob?.(blobUrl);

            try {
              await runUploadPassOnce({
                getUploadFile: async (signal?: AbortSignal) => {
                  if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError');
                  const buffer = await file.arrayBuffer();
                  // Pass ArrayBuffer directly to avoid Node Buffer dependency
                  return { type: 'buffer', tokenOrBuffer: buffer, fileName: file.name } as const;
                },
                onUploaded: async (finalUrl: string) => {
                  const base = Array.isArray(urlsRef.current) ? urlsRef.current : [];
                  const next = base.slice();
                  while (next.length <= index) next.push('');
                  next[index] = finalUrl;
                  onValueChange(next);
                },
                onUploadError: (error: any) => {
                  if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    console.warn('Disk upload failed:', error);
                    setUploadError(error?.message || String(error));
                  }
                },
              });
            } finally {
              setUploading(false);
            }
          };

          // Open picker and rely on onchange for both success and cleanup
          input.click();
          return;
        }

        if (id === 'canvas' || id === 'curlayer' || id === 'selection') {
          setUploading(true);
          // removed verbose logger
          const { thumbnail_url, file_token, result } = await getPhotoshopImage(isMask, id as any, event.altKey ? true : false);
          if (result?.error) throw new Error(result.error);
          if (!file_token) throw new Error('Missing file token from Photoshop');

          if (thumbnail_url) {
            ImageUIStore.getState().setSlotThumbnail(componentId, index, thumbnail_url);
          }

          try {
            await runUploadPassOnce({
              getUploadFile: async (signal?: AbortSignal) => {
                if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError');
                return { type: 'token', tokenOrBuffer: file_token, fileName: `${Date.now()}.png` } as const;
              },
              onUploaded: async (finalUrl: string) => {
                const base = Array.isArray(urlsRef.current) ? urlsRef.current : [];
                const next = base.slice();
                while (next.length <= index) next.push('');
                next[index] = finalUrl;
                // removed verbose logger
                onValueChange(next);
              },
              onUploadError: (error: any) => {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                  // removed verbose logger
                  console.warn('Photoshop upload failed:', error);
                  setUploadError(error?.message || String(error));
                }
              },
            });
          } finally {
            setUploading(false);
          }
        }
      } catch (e) {
        setUploading(false);
        // removed verbose logger
        console.warn('onSync error:', e);
        setUploadError((e as any)?.message || String(e));
      }
    }, [componentId, isMask, onValueChange, runUploadPassOnce, urls]
  );

  return { onSync, uploading, uploadError };
}
