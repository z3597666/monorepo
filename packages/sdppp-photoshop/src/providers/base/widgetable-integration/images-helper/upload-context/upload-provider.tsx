import React, { createContext, useCallback, useRef, useState } from 'react';
import { ImageDetail, UploadState, UploadContextValue, UploadProviderProps } from './types';
import { useUploadPasses } from './upload-passes';
import { useDirectUpload } from './direct-upload';
import { useWidgetable } from '@sdppp/widgetable-ui';

export const UploadContext = createContext<UploadContextValue | undefined>(undefined);

export const UploadProvider: React.FC<UploadProviderProps> = ({ children, onSetImages, onCallOnValueChange, maxCount = 1 }) => {
    const { addUploadPass, removeUploadPass, runUploadPassOnce, cancelAllUploads: cancelWidgetableUploads } = useWidgetable();
    const [uploadState, setUploadState] = useState<UploadState>({
        uploading: false,
        uploadError: '',
        currentThumbnail: '',
        currentThumbnails: {}
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

    // 使用上传通道的钩子
    const {
        createImageUploadPass,
        createMaskUploadPass,
        removeImageUploadPass,
        removeMaskUploadPass
    } = useUploadPasses(
        activeUploadPasses,
        layerIdentifyRef,
        currentThumbnailRef,
        originalImagesRef,
        incrementUploadCount,
        decrementUploadCount,
        setUploadState,
        onSetImages,
        onCallOnValueChange,
        addUploadPass,
        removeUploadPass
    );

    // 使用直接上传的钩子
    const { uploadFromPhotoshop, uploadFromPhotoshopViaDialog, uploadFromDisk } = useDirectUpload(
        originalImagesRef,
        incrementUploadCount,
        decrementUploadCount,
        setUploadState,
        onSetImages,
        onCallOnValueChange,
        runUploadPassOnce,
        handleImagesChange,
        maxCount
    );

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
        removeImageUploadPass,
        createMaskUploadPass,
        removeMaskUploadPass,
        cancelAllUploads,
        uploadFromPhotoshop,
        uploadFromPhotoshopViaDialog,
        uploadFromDisk
    };

    return (
        <UploadContext.Provider value={contextValue}>
            {children}
        </UploadContext.Provider>
    );
};
