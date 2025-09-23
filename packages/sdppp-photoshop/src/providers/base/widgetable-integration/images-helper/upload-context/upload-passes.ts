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
                    setUploadState(prev => ({
                        ...prev,
                        currentThumbnail: thumbnailUrl,
                        currentThumbnails: {
                            ...(prev.currentThumbnails || {}),
                            // No uploadId here; key by thumbnailUrl so SingleImagePreview can find via image.url
                            [thumbnailUrl]: thumbnailUrl
                        }
                    }));

                    // 获取到thumbnail时调用setImages
                    const newImages = [{
                        url: thumbnailUrl, source: markSourceType(source, 'image'),
                        thumbnail: thumbnailUrl, auto: true
                    }];
                    sourceInfoRef = source || ''
                    log('set temp image from GET', { url: thumbnailUrl, source: sourceInfoRef });
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
                    url,
                    source: markSourceType(sourceInfoRef, 'image'),
                    // 保留用户的 auto 设置（若未定义则默认保持开启）
                    auto: (originalImagesRef.current?.[0]?.auto ?? true),
                    thumbnail: currentThumbnailRef.current
                }];
                log('onUploaded set final image', { url, thumb: currentThumbnailRef.current });
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

                    // 当有明确矩形边界时，使用 selection 触发蒙版生成（若后端支持 selection 边界）
                    const contentParam: 'canvas' | 'curlayer' | 'selection' =
                        boundaryParam === 'canvas' ? content : 'selection';

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
                    currentThumbnailRef.current = thumbnailUrl;
                    setUploadState(prev => ({
                        ...prev,
                        currentThumbnail: thumbnailUrl,
                        currentThumbnails: {
                            ...(prev.currentThumbnails || {}),
                            [thumbnailUrl]: thumbnailUrl
                        }
                    }));

                    // 获取到thumbnail时调用setImages
                    const newImages = [{
                        url: thumbnailUrl, source: markSourceType(source || '', 'mask'),
                        thumbnail: thumbnailUrl, auto: true
                    }];
                    sourceInfoRef = source || ''
                    log('set temp mask from GET', { url: thumbnailUrl, source: sourceInfoRef });
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
                    url,
                    source: markSourceType(sourceInfoRef, 'mask'),
                    // 保留用户的 auto 设置（若未定义则默认保持开启）
                    auto: (originalImagesRef.current?.[0]?.auto ?? true),
                    thumbnail: currentThumbnailRef.current
                }];
                log('onUploaded mask set final image', { url, thumb: currentThumbnailRef.current });
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
