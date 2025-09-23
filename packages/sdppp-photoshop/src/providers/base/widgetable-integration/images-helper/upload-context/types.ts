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
    createImageUploadPass: (config: PhotoshopParams) => void;
    removeImageUploadPass: (config: PhotoshopParams) => void;
    createMaskUploadPass: (config: PhotoshopMaskParams) => void;
    removeMaskUploadPass: (config: PhotoshopMaskParams) => void;
    cancelAllUploads: () => void;

    // Direct upload methods
    uploadFromPhotoshop: (isMask?: boolean, source?: 'canvas' | 'curlayer' | 'selection', reverse?: boolean) => Promise<void>;
    uploadFromDisk: (file: File) => Promise<void>;
    // Advanced: open PS selection dialog then fetch
    uploadFromPhotoshopViaDialog: (isMask?: boolean) => Promise<void>;
}

export interface UploadProviderProps {
    children: React.ReactNode;
    onSetImages: (images: ImageDetail[]) => void;
    onCallOnValueChange: (images: ImageDetail[]) => void;
    maxCount?: number;
}
