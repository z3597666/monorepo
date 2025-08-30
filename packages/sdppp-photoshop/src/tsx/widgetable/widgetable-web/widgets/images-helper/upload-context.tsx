import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { useWidgetable } from '../../../context';
import { sdpppSDK } from '../../../../../sdk/sdppp-ps-sdk';
import { v4 } from 'uuid';
import { PhotoshopMaskParams, PhotoshopParams, useSourceInfo } from './lib/source-render';

const log = sdpppSDK.logger.extend('UploadContext');

export interface ImageDetail {
    url: string;
    source: string;
    thumbnail?: string;
    auto?: boolean;
    uploadId?: string;
}

export interface UploadState {
    uploading: boolean;
    uploadError: string;
    currentThumbnail: string;
}

export interface UploadContextValue {
    // State
    uploadState: UploadState;

    // Centralized image modification functions
    setImages: (images: ImageDetail[]) => void;
    callOnValueChange: (images: ImageDetail[]) => void;
    clearImages: () => void;
    setUploadError: (error: string) => void;

    // Actions
    createImageUploadPass: (config: PhotoshopParams) => void;
    removeImageUploadPass: (config: PhotoshopParams) => void;
    createMaskUploadPass: (config: PhotoshopMaskParams) => void;
    removeMaskUploadPass: (config: PhotoshopMaskParams) => void;
    cancelAllUploads: () => void;

    // Direct upload methods
    uploadFromPhotoshop: (isMask?: boolean) => Promise<void>;
    uploadFromDisk: (file: File) => Promise<void>;
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

interface UploadProviderProps {
    children: React.ReactNode;
    onSetImages: (images: ImageDetail[]) => void;
    onCallOnValueChange: (images: ImageDetail[]) => void;
    maxCount?: number;
}

export const UploadProvider: React.FC<UploadProviderProps> = ({ children, onSetImages, onCallOnValueChange, maxCount = 1 }) => {
    const { addUploadPass, removeUploadPass, runUploadPassOnce, cancelAllUploads: cancelWidgetableUploads } = useWidgetable();
    const [uploadState, setUploadState] = useState<UploadState>({
        uploading: false,
        uploadError: '',
        currentThumbnail: ''
    });

    const activeUploadPasses = useRef<Map<string, any>>(new Map());
    const layerIdentifyRef = useRef<string>('');
    const currentThumbnailRef = useRef<string>('');
    const originalImagesRef = useRef<ImageDetail[]>([]);
    const activeUploadsCount = useRef<number>(0);

    // 上传状态管理辅助函数
    const incrementUploadCount = useCallback(() => {
        activeUploadsCount.current += 1;
        setUploadState(prev => ({ ...prev, uploading: true }));
    }, []);

    const decrementUploadCount = useCallback(() => {
        activeUploadsCount.current = Math.max(0, activeUploadsCount.current - 1);
        if (activeUploadsCount.current === 0) {
            setUploadState(prev => ({ ...prev, uploading: false }));
        }
    }, []);

    // 处理多图片添加的辅助方法
    const handleImagesChange = useCallback((newImages: ImageDetail[]) => {
        const finalImages = maxCount > 1 
            ? [...originalImagesRef.current, ...newImages]
            : newImages;
        originalImagesRef.current = finalImages;
        onCallOnValueChange(finalImages);
    }, [maxCount, onCallOnValueChange]);

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
                    const { thumbnail_url, file_token, source } = await sdpppSDK.plugins.photoshop.doGetImage({
                        content,
                        boundary: config.boundary || 'canvas',
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
            onUploaded: async (url: string) => {
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
                        content,
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
            onUploaded: async (url: string) => {
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

    const uploadFromPhotoshop = useCallback(async (isMask = false) => {
        // 保存原始images状态，用当前最新状态
        const originalImages = [...originalImagesRef.current];

        try {
            setUploadState(prev => ({ ...prev, uploadError: '' }));
            
            const { thumbnail_url, file_token, source } = isMask
                ? await sdpppSDK.plugins.photoshop.requestMaskGet({ isMask: true })
                : await sdpppSDK.plugins.photoshop.requestImageGet({});

            if (!thumbnail_url || !source) {
                return; // 可能是取消 
            }

            // 为这个上传任务生成唯一ID
            const uploadId = v4();
            
            // 获取到thumbnail时先显示缩略图，添加uploadId标识
            const thumbnailImages = [{ url: thumbnail_url, source, thumbnail: thumbnail_url, uploadId }];
            const tempImages = maxCount > 1 
                ? [...originalImages, ...thumbnailImages]
                : thumbnailImages;
            onSetImages(tempImages);
            // 立即更新 originalImagesRef 以确保后续操作基于正确的状态
            originalImagesRef.current = tempImages;

            await runUploadPassOnce({
                getUploadFile: async (signal?: AbortSignal) => {
                    incrementUploadCount();
                    // Check if already aborted
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }
                    return { type: 'token', tokenOrBuffer: file_token, fileName: `${v4()}.png` };
                },
                onUploaded: async (url) => {
                    // 上传成功后替换对应的缩略图
                    const currentImages = [...originalImagesRef.current];
                    const targetIndex = currentImages.findIndex(img => img.uploadId === uploadId);
                    
                    if (targetIndex !== -1) {
                        // 替换找到的缩略图
                        currentImages[targetIndex] = { url, source, thumbnail: thumbnail_url };
                        originalImagesRef.current = currentImages;
                        onCallOnValueChange(currentImages);
                    } else {
                        // 如果找不到对应缩略图，降级为追加模式
                        const newImages = [{ url, source, thumbnail: thumbnail_url }];
                        handleImagesChange(newImages);
                    }
                    
                    decrementUploadCount();
                    await new Promise(resolve => setTimeout(resolve, 100));
                },
                onUploadError: (error: Error) => {
                    // 上传失败时恢复到原始状态（但取消时不恢复）
                    if (error.name !== 'AbortError') {
                        onSetImages(originalImages);
                    }
                    decrementUploadCount();
                    setUploadState(prev => ({ ...prev, uploadError: error.name === 'AbortError' ? '' : error.message }));
                }
            });
        } catch (error: any) {
            // 获取thumbnail失败时也要恢复原始状态
            onSetImages(originalImages);
            setUploadState(prev => ({ ...prev, uploadError: error.message }));
        }
    }, [runUploadPassOnce, onSetImages, handleImagesChange, maxCount]);

    const uploadFromDisk = useCallback(async (file: File) => {
        // 保存原始images状态，用当前最新状态
        const originalImages = [...originalImagesRef.current];

        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            setUploadState(prev => ({ ...prev, uploadError: '只能上传图片文件！' }));
            return;
        }

        // 为这个上传任务生成唯一ID
        const uploadId = v4();
        
        const thumbnailURL = URL.createObjectURL(file);
        const thumbnailImages = [{ url: thumbnailURL, source: 'disk', thumbnail: thumbnailURL, uploadId }];

        setUploadState(prev => ({ ...prev, uploadError: '' }));
        // 先显示缩略图，支持多图片
        const tempImages = maxCount > 1 
            ? [...originalImages, ...thumbnailImages]
            : thumbnailImages;
        onSetImages(tempImages);
        // 立即更新 originalImagesRef 以确保后续操作基于正确的状态
        originalImagesRef.current = tempImages;

        try {
            await runUploadPassOnce({
                getUploadFile: async (signal?: AbortSignal) => {
                    // Check if already aborted
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }
                    const buffer = await file.arrayBuffer();
                    return { type: 'buffer', tokenOrBuffer: Buffer.from(buffer), fileName: file.name };
                },
                onUploaded: async (url) => {
                    // 上传成功后替换对应的缩略图
                    const currentImages = [...originalImagesRef.current];
                    const targetIndex = currentImages.findIndex(img => img.uploadId === uploadId);
                    
                    if (targetIndex !== -1) {
                        // 替换找到的缩略图
                        currentImages[targetIndex] = { url, source: 'disk', thumbnail: thumbnailURL };
                        originalImagesRef.current = currentImages;
                        onCallOnValueChange(currentImages);
                    } else {
                        // 如果找不到对应缩略图，降级为追加模式
                        const newImages = [{ url, source: 'disk', thumbnail: thumbnailURL }];
                        handleImagesChange(newImages);
                    }
                    
                    decrementUploadCount();
                    await new Promise(resolve => setTimeout(resolve, 100));
                },
                onUploadError: (error: Error) => {
                    // 上传失败时恢复到原始状态（但取消时不恢复）
                    if (error.name !== 'AbortError') {
                        onSetImages(originalImages);
                    }
                    decrementUploadCount();
                    setUploadState(prev => ({ ...prev, uploadError: error.name === 'AbortError' ? '' : error.message }));
                }
            });
        } catch (error: any) {
            // 上传失败时恢复到原始状态
            onSetImages(originalImages);
            setUploadState(prev => ({ ...prev, uploading: false, uploadError: error.message }));
        }
    }, [runUploadPassOnce, onSetImages, handleImagesChange, maxCount]);

    // 提供给子组件使用的集中化函数
    const setImages = useCallback((images: ImageDetail[]) => {
        originalImagesRef.current = images;
        onSetImages(images);
    }, [onSetImages]);

    const callOnValueChange = useCallback((images: ImageDetail[]) => {
        originalImagesRef.current = images;
        onCallOnValueChange(images);
    }, [onCallOnValueChange]);

    const cancelAllUploads = useCallback(() => {
        // Cancel all widgetable uploads
        cancelWidgetableUploads();
        
        // Clear all active upload passes
        activeUploadPasses.current.clear();
        
        // Reset upload counter and state
        activeUploadsCount.current = 0;
        setUploadState(prev => ({ ...prev, uploading: false, uploadError: '' }));
    }, [cancelWidgetableUploads]);

    const clearImages = useCallback(() => {
        // First cancel all uploads
        cancelAllUploads();
        
        // Then clear images
        originalImagesRef.current = [];
        onCallOnValueChange([]);
    }, [onCallOnValueChange, cancelAllUploads]);

    const setUploadErrorFunc = useCallback((error: string) => {
        setUploadState(prev => ({ ...prev, uploadError: error }));
    }, []);

    const contextValue: UploadContextValue = {
        uploadState,
        setImages,
        callOnValueChange,
        clearImages,
        setUploadError: setUploadErrorFunc,
        createImageUploadPass,
        removeImageUploadPass: removeImageUploadPassByConfig,
        createMaskUploadPass,
        removeMaskUploadPass: removeMaskUploadPassByConfig,
        cancelAllUploads,
        uploadFromPhotoshop,
        uploadFromDisk
    };

    return (
        <UploadContext.Provider value={contextValue}>
            {children}
        </UploadContext.Provider>
    );
};

export const useImageUpload = () => {
    const context = useContext(UploadContext);
    if (context === undefined) {
        throw new Error('useImageUpload must be used within an UploadProvider');
    }
    return context;
};

// Convenience hook for auto upload scenarios
export const useAutoImageUpload = (
    imageSource: string,
    enabled = true
) => {
    const { createImageUploadPass, removeImageUploadPass, createMaskUploadPass, removeMaskUploadPass } = useImageUpload();
    const sourceInfo = useSourceInfo(imageSource);
    const imageConfigRef = useRef<PhotoshopParams | null>(null);
    const maskConfigRef = useRef<PhotoshopMaskParams | null>(null);

    useEffect(() => {
        if (!(enabled && imageSource && (
            (sourceInfo.type === 'photoshop_image' && sourceInfo.params) ||
            (sourceInfo.type === 'photoshop_mask' && sourceInfo.maskParams)
        ))) {
            // Cleanup existing configs
            if (imageConfigRef.current) {
                removeImageUploadPass(imageConfigRef.current);
                imageConfigRef.current = null;
            }
            if (maskConfigRef.current) {
                removeMaskUploadPass(maskConfigRef.current);
                maskConfigRef.current = null;
            }
            return;
        }

        if (sourceInfo.type === 'photoshop_image' && sourceInfo.params) {
            const config = sourceInfo.params;

            // Remove previous mask config if switching types
            if (maskConfigRef.current) {
                removeMaskUploadPass(maskConfigRef.current);
                maskConfigRef.current = null;
            }

            // Remove previous image config if different
            if (imageConfigRef.current && (
                imageConfigRef.current.content !== config.content ||
                imageConfigRef.current.boundary !== config.boundary ||
                imageConfigRef.current.cropBySelection !== config.cropBySelection
            )) {
                removeImageUploadPass(imageConfigRef.current);
            }

            imageConfigRef.current = config;
            createImageUploadPass(config);
        }

        if (sourceInfo.type === 'photoshop_mask' && sourceInfo.maskParams) {
            const config = sourceInfo.maskParams;

            // Remove previous image config if switching types
            if (imageConfigRef.current) {
                removeImageUploadPass(imageConfigRef.current);
                imageConfigRef.current = null;
            }

            // Remove previous mask config if different
            if (maskConfigRef.current && (
                maskConfigRef.current.content !== config.content ||
                maskConfigRef.current.reverse !== config.reverse ||
                maskConfigRef.current.imageSize !== config.imageSize
            )) {
                removeMaskUploadPass(maskConfigRef.current);
            }

            maskConfigRef.current = config;
            createMaskUploadPass(config);
        }

        return () => {
            if (imageConfigRef.current) {
                removeImageUploadPass(imageConfigRef.current);
            }
            if (maskConfigRef.current) {
                removeMaskUploadPass(maskConfigRef.current);
            }
        };
    }, [imageSource, sourceInfo, enabled, createImageUploadPass, removeImageUploadPass, createMaskUploadPass, removeMaskUploadPass]);

    return { 
        uploadConfig: imageConfigRef.current || maskConfigRef.current,
        imageConfig: imageConfigRef.current,
        maskConfig: maskConfigRef.current 
    };
};