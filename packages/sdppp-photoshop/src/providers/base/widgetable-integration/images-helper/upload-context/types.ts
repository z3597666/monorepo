import { PhotoshopMaskParams, PhotoshopParams } from '../lib/source-render';

export interface ImageDetail {
    url: string;
    source: string;
    thumbnail?: string;
    auto?: boolean;
    uploadId?: string;
    isUploading?: boolean;
}

export interface UploadState {
    uploading: boolean;
    uploadError: string;
    // Deprecated: last global thumbnail (kept for backward compatibility)
    currentThumbnail: string;
    // New: per-image current thumbnails, keyed by image.uploadId or image.url
    currentThumbnails: Record<string, string>;
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
    createImageUploadPass: (config: PhotoshopParams, targetIndex?: number) => void;
    removeImageUploadPass: (config: PhotoshopParams, targetIndex?: number) => void;
    createMaskUploadPass: (config: PhotoshopMaskParams, targetIndex?: number) => void;
    removeMaskUploadPass: (config: PhotoshopMaskParams, targetIndex?: number) => void;
    cancelAllUploads: () => void;

    // Direct upload methods
    uploadFromPhotoshop: (isMask?: boolean, source?: 'canvas' | 'curlayer' | 'selection', reverse?: boolean, targetIndex?: number) => Promise<void>;
    uploadFromDisk: (file: File, targetIndex?: number) => Promise<void>;
    // Advanced: open PS selection dialog then fetch
    uploadFromPhotoshopViaDialog: (isMask?: boolean, source?: 'canvas' | 'curlayer' | 'selection', targetIndex?: number) => Promise<void>;
}

export interface UploadProviderProps {
    children: React.ReactNode;
    onSetImages: (images: ImageDetail[]) => void;
    onCallOnValueChange: (images: ImageDetail[]) => void;
    maxCount?: number;
}
