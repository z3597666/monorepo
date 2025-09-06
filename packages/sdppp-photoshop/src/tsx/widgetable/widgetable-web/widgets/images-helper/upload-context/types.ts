import { PhotoshopMaskParams, PhotoshopParams } from '../lib/source-render';

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

export interface UploadProviderProps {
    children: React.ReactNode;
    onSetImages: (images: ImageDetail[]) => void;
    onCallOnValueChange: (images: ImageDetail[]) => void;
    maxCount?: number;
}