import { useCallback } from 'react';
import { v4 } from 'uuid';
import { PhotoshopParams, PhotoshopMaskParams } from '../lib/source-render';
import { ImageDetail, UploadState } from './types';
import { sdpppSDK } from '@sdppp/common';

const log = sdpppSDK.logger.extend('UploadPasses');

export const useUploadPasses = (
    activeUploadPasses: React.MutableRefObject<Map<string, any>>,
    layerIdentifyRef: React.MutableRefObject<string>,
    currentThumbnailRef: React.MutableRefObject<string>,
    originalImagesRef: React.MutableRefObject<ImageDetail[]>,
    incrementUploadCount: () => void,
    decrementUploadCount: () => void,
    setUploadState: React.Dispatch<React.SetStateAction<UploadState>>,
    onSetImages: (images: ImageDetail[]) => void,
    onCallOnValueChange: (images: ImageDetail[]) => void,
    addUploadPass: (pass: any) => void,
    removeUploadPass: (pass: any) => void
) => {
    const createImageUploadPass = useCallback((config: PhotoshopParams) => {
        const passKey = `${config.content}-${config.boundary}-${config.cropBySelection}`;

        // Remove existing pass if any
        if (activeUploadPasses.current.has(passKey)) {
            const existingPass = activeUploadPasses.current.get(passKey);
            removeUploadPass(existingPass);
        }

        let sourceInfoRef = '';

        const uploadPass = {
            getUploadFile: async (signal?: AbortSignal) => {
                log('increment upload count') 
                incrementUploadCount();

                try {
                    // Check if already aborted
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }

                    const content = config.content || layerIdentifyRef.current;

                    // Use WorkBoundary when no boundary is specified in config
                    let boundaryParam = config.boundary;
                    if (!boundaryParam || boundaryParam === 'canvas') {
                        // Get boundary from WorkBoundary component
                        const activeDocumentID = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
                        const workBoundaries = sdpppSDK.stores.WebviewStore.getState().workBoundaries;
                        const boundary = workBoundaries[activeDocumentID];

                        if (!boundary || (boundary.width >= 999999 && boundary.height >= 999999)) {
                            boundaryParam = 'canvas';
                        } else {
                            // BoundaryRect format is already correct
                            boundaryParam = boundary;
                        }
                    }

                    const { thumbnail_url, file_token, source } = await sdpppSDK.plugins.photoshop.doGetImage({
                        content,
                        boundary: boundaryParam,
                        imageSize: config.imageSize || 0,
                        imageQuality: config.imageQuality || 1,
                        cropBySelection: config.cropBySelection || 'no'
                    });

                    // Check if aborted during the async operation
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }

                    const thumbnailUrl = thumbnail_url || '';
                    currentThumbnailRef.current = thumbnailUrl;
                    setUploadState(prev => ({ ...prev, currentThumbnail: thumbnailUrl }));

                    // 获取到thumbnail时调用setImages
                    const newImages = [{
                        url: thumbnailUrl, source: source || '',
                        thumbnail: thumbnailUrl, auto: true
                    }];
                    sourceInfoRef = source || ''
                    onSetImages(newImages);

                    return { type: 'token' as const, tokenOrBuffer: file_token || '', fileName: `${v4()}.png` };
                } catch (error: any) {
                    // 上传失败时恢复到原始状态
                    if (error.name !== 'AbortError') {
                        onSetImages(originalImagesRef.current);
                    }
                    throw error;
                }
            },
            onUploadError: (error: Error) => {
                decrementUploadCount();
                setUploadState(prev => ({ ...prev, uploadError: error.name === 'AbortError' ? '' : error.message }));
                // 上传失败时恢复到原始状态（但取消时不恢复）
                if (error.name !== 'AbortError') {
                    onSetImages(originalImagesRef.current);
                }
            },
            onUploaded: async (url: string, signal?: AbortSignal) => {
                // Check if already aborted
                if (signal?.aborted) {
                    return;
                }

                decrementUploadCount();
                // switchImageSource逻辑改为调用onCallOnValueChange
                const newImages = [{
                    url, source: sourceInfoRef,
                    auto: true,
                    thumbnail: currentThumbnailRef.current
                }];
                onCallOnValueChange(newImages);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        };

        activeUploadPasses.current.set(passKey, uploadPass);
        addUploadPass(uploadPass);
    }, [addUploadPass, removeUploadPass, onSetImages, onCallOnValueChange]);

    const createMaskUploadPass = useCallback((config: PhotoshopMaskParams) => {
        const passKey = `mask-${config.content}-${config.reverse}-${config.imageSize}`;

        // Remove existing pass if any
        if (activeUploadPasses.current.has(passKey)) {
            const existingPass = activeUploadPasses.current.get(passKey);
            removeUploadPass(existingPass);
        }

        let sourceInfoRef = '';

        const uploadPass = {
            getUploadFile: async (signal?: AbortSignal) => {
                log('increment upload count')
                incrementUploadCount();

                try {
                    // Check if already aborted
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }

                    const content = config.content || layerIdentifyRef.current;
                    const { thumbnail_url, file_token, source } = await sdpppSDK.plugins.photoshop.doGetMask({
                        content: content as 'canvas' | 'curlayer' | 'selection',
                        reverse: config.reverse || false,
                        imageSize: config.imageSize || 0
                    });

                    // Check if aborted during the async operation
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }

                    const thumbnailUrl = thumbnail_url || '';
                    currentThumbnailRef.current = thumbnailUrl;
                    setUploadState(prev => ({ ...prev, currentThumbnail: thumbnailUrl }));

                    // 获取到thumbnail时调用setImages
                    const newImages = [{
                        url: thumbnailUrl, source: source || '',
                        thumbnail: thumbnailUrl, auto: true
                    }];
                    sourceInfoRef = source || ''
                    onSetImages(newImages);

                    return { type: 'token' as const, tokenOrBuffer: file_token || '', fileName: `${v4()}.png` };
                } catch (error: any) {
                    // 上传失败时恢复到原始状态
                    if (error.name !== 'AbortError') {
                        onSetImages(originalImagesRef.current);
                    }
                    throw error;
                }
            },
            onUploadError: (error: Error) => {
                decrementUploadCount();
                setUploadState(prev => ({ ...prev, uploadError: error.name === 'AbortError' ? '' : error.message }));
                // 上传失败时恢复到原始状态（但取消时不恢复）
                if (error.name !== 'AbortError') {
                    onSetImages(originalImagesRef.current);
                }
            },
            onUploaded: async (url: string, signal?: AbortSignal) => {
                // Check if already aborted
                if (signal?.aborted) {
                    return;
                }

                decrementUploadCount();
                // switchImageSource逻辑改为调用onCallOnValueChange
                const newImages = [{
                    url, source: sourceInfoRef,
                    auto: true,
                    thumbnail: currentThumbnailRef.current
                }];
                onCallOnValueChange(newImages);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        };

        activeUploadPasses.current.set(passKey, uploadPass);
        addUploadPass(uploadPass);
    }, [addUploadPass, removeUploadPass, onSetImages, onCallOnValueChange]);

    const removeImageUploadPassByConfig = useCallback((config: PhotoshopParams) => {
        const passKey = `${config.content}-${config.boundary}-${config.cropBySelection}`;
        const uploadPass = activeUploadPasses.current.get(passKey);

        if (uploadPass) {
            removeUploadPass(uploadPass);
            activeUploadPasses.current.delete(passKey);
        }
    }, [removeUploadPass]);

    const removeMaskUploadPassByConfig = useCallback((config: PhotoshopMaskParams) => {
        const passKey = `mask-${config.content}-${config.reverse}-${config.imageSize}`;
        const uploadPass = activeUploadPasses.current.get(passKey);

        if (uploadPass) {
            removeUploadPass(uploadPass);
            activeUploadPasses.current.delete(passKey);
        }
    }, [removeUploadPass]);

    return {
        createImageUploadPass,
        createMaskUploadPass,
        removeImageUploadPass: removeImageUploadPassByConfig,
        removeMaskUploadPass: removeMaskUploadPassByConfig
    };
};