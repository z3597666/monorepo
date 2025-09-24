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
    // 标记来源类型，避免依赖启发式字段（如 reverse/boundary）
    const markSourceType = (source: string | undefined, type: 'image' | 'mask') => {
        try {
            const parsed = source ? JSON.parse(source) : {};
            return JSON.stringify({ ...parsed, __psType: type });
        } catch {
            return JSON.stringify({ __psType: type, raw: source || '' });
        }
    };

    const createImageUploadPass = useCallback((config: PhotoshopParams, targetIndex?: number) => {
        const passKey = `${targetIndex ?? -1}:${config.content}-${config.boundary}-${config.cropBySelection}`;

        // Remove existing pass if any
        if (activeUploadPasses.current.has(passKey)) {
            const existingPass = activeUploadPasses.current.get(passKey);
            removeUploadPass(existingPass);
        }

        let sourceInfoRef = '';
        let uploadIdRef: string | null = null;

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

                    const { thumbnail_url, file_token, source, error } = await sdpppSDK.plugins.photoshop.getImage({
                        content,
                        boundary: boundaryParam,
                        imageSize: config.imageSize || 0,
                        imageQuality: config.imageQuality || 1,
                        cropBySelection: config.cropBySelection || 'no'
                    });

                    if (error) {
                        throw new Error(error);
                    }

                    // Check if aborted during the async operation
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }

                    const thumbnailUrl = thumbnail_url || '';
                    uploadIdRef = uploadIdRef || v4();
                    currentThumbnailRef.current = thumbnailUrl;
                    setUploadState(prev => ({
                        ...prev,
                        currentThumbnail: thumbnailUrl,
                        currentThumbnails: {
                            ...(prev.currentThumbnails || {}),
                            [uploadIdRef]: thumbnailUrl
                        }
                    }));

                    // 获取到thumbnail时调用setImages (per-slot)
                    const nextImages = [...originalImagesRef.current];
                    const tempItem = { url: thumbnailUrl, source: markSourceType(source, 'image'), thumbnail: thumbnailUrl, auto: true, uploadId: uploadIdRef } as ImageDetail;
                    const idx = typeof targetIndex === 'number' ? targetIndex : 0;
                    while (nextImages.length < idx) nextImages.push({ url: '', source: '', thumbnail: '' } as any);
                    nextImages[idx] = tempItem;
                    sourceInfoRef = source || '';
                    log('set temp image from GET', { url: thumbnailUrl, source: sourceInfoRef, index: idx });
                    onSetImages(nextImages);

                    if (!file_token) {
                        throw new Error('Missing file token from getImage');
                    }
                    return { type: 'token' as const, tokenOrBuffer: file_token, fileName: `${v4()}.png` };
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
                const nextImages = [...originalImagesRef.current];
                const idx = typeof targetIndex === 'number' ? targetIndex : 0;
                const finalItem = {
                    url,
                    source: markSourceType(sourceInfoRef, 'image'),
                    auto: (nextImages[idx]?.auto ?? true),
                    thumbnail: currentThumbnailRef.current,
                    uploadId: uploadIdRef || undefined
                } as ImageDetail;
                nextImages[idx] = finalItem;
                log('onUploaded set final image', { url, thumb: currentThumbnailRef.current, index: idx });
                originalImagesRef.current = nextImages; // 确保引用指向最新数据
                onSetImages(nextImages);
                // 如果这是最后一个上传完成的，直接调用onCallOnValueChange以确保及时传播
                setTimeout(() => {
                    onCallOnValueChange(nextImages);
                }, 50);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        };

        activeUploadPasses.current.set(passKey, uploadPass);
        addUploadPass(uploadPass);
    }, [addUploadPass, removeUploadPass, onSetImages, onCallOnValueChange]);

    const createMaskUploadPass = useCallback((config: PhotoshopMaskParams, targetIndex?: number) => {
        const passKey = `mask-${targetIndex ?? -1}-${config.content}-${config.reverse}-${config.imageSize}`;

        // Remove existing pass if any
        if (activeUploadPasses.current.has(passKey)) {
            const existingPass = activeUploadPasses.current.get(passKey);
            removeUploadPass(existingPass);
        }

        let sourceInfoRef = '';
        let uploadIdRef: string | null = null;

        const uploadPass = {
            getUploadFile: async (signal?: AbortSignal) => {
                log('increment upload count')
                incrementUploadCount();

                try {
                    // Check if already aborted
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }

                    const content = (config.content || layerIdentifyRef.current) as 'canvas' | 'curlayer' | 'selection';

                    // 与图片获取一致，尊重 WorkBoundary
                    const activeDocumentID = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
                    const workBoundaries = sdpppSDK.stores.WebviewStore.getState().workBoundaries;
                    const boundary = workBoundaries[activeDocumentID];

                    let boundaryParam: "canvas" | "curlayer" | "selection" | {
                        leftDistance: number;
                        topDistance: number;
                        rightDistance: number;
                        bottomDistance: number;
                        width: number;
                        height: number;
                    };
                    if (!boundary || (boundary.width >= 999999 && boundary.height >= 999999)) {
                        boundaryParam = 'canvas';
                    } else {
                        boundaryParam = boundary;
                    }

                    // Respect requested content; do not override to selection
                    const contentParam: 'canvas' | 'curlayer' | 'selection' = content;

                    const maskParams: any = {
                        content: contentParam,
                        reverse: config.reverse || false,
                        imageSize: config.imageSize || 0,
                        // Always include boundary; default to 'canvas' if undefined
                        boundary: boundaryParam as any
                    };

                    const { thumbnail_url, file_token, source } = await sdpppSDK.plugins.photoshop.getMask(maskParams as any);

                    // Check if aborted during the async operation
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }

                    const thumbnailUrl = thumbnail_url || '';
                    uploadIdRef = uploadIdRef || v4();
                    currentThumbnailRef.current = thumbnailUrl;
                    setUploadState(prev => ({
                        ...prev,
                        currentThumbnail: thumbnailUrl,
                        currentThumbnails: {
                            ...(prev.currentThumbnails || {}),
                            [uploadIdRef]: thumbnailUrl
                        }
                    }));

                    const nextImages = [...originalImagesRef.current];
                    const idx = typeof targetIndex === 'number' ? targetIndex : 0;
                    const tempItem = { url: thumbnailUrl, source: markSourceType(source || '', 'mask'), thumbnail: thumbnailUrl, auto: true, uploadId: uploadIdRef } as ImageDetail;
                    while (nextImages.length < idx) nextImages.push({ url: '', source: '', thumbnail: '' } as any);
                    nextImages[idx] = tempItem;
                    sourceInfoRef = source || '';
                    log('set temp mask from GET', { url: thumbnailUrl, source: sourceInfoRef, index: idx });
                    onSetImages(nextImages);

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
                const nextImages = [...originalImagesRef.current];
                const idx = typeof targetIndex === 'number' ? targetIndex : 0;
                const finalItem = {
                    url,
                    source: markSourceType(sourceInfoRef, 'mask'),
                    auto: (nextImages[idx]?.auto ?? true),
                    thumbnail: currentThumbnailRef.current,
                    uploadId: uploadIdRef || undefined
                } as ImageDetail;
                nextImages[idx] = finalItem;
                log('onUploaded mask set final image', { url, thumb: currentThumbnailRef.current, index: idx });
                originalImagesRef.current = nextImages; // 确保引用指向最新数据
                onSetImages(nextImages);
                // 如果这是最后一个上传完成的，直接调用onCallOnValueChange以确保及时传播
                setTimeout(() => {
                    onCallOnValueChange(nextImages);
                }, 50);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        };

        activeUploadPasses.current.set(passKey, uploadPass);
        addUploadPass(uploadPass);
    }, [addUploadPass, removeUploadPass, onSetImages, onCallOnValueChange]);

    const removeImageUploadPassByConfig = useCallback((config: PhotoshopParams, targetIndex?: number) => {
        const passKey = `${targetIndex ?? -1}:${config.content}-${config.boundary}-${config.cropBySelection}`;
        const uploadPass = activeUploadPasses.current.get(passKey);

        if (uploadPass) {
            removeUploadPass(uploadPass);
            activeUploadPasses.current.delete(passKey);
        }
    }, [removeUploadPass]);

    const removeMaskUploadPassByConfig = useCallback((config: PhotoshopMaskParams, targetIndex?: number) => {
        const passKey = `mask-${targetIndex ?? -1}-${config.content}-${config.reverse}-${config.imageSize}`;
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
