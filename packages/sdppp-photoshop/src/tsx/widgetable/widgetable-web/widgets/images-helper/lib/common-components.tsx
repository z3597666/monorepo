import React, { useCallback } from 'react';
import { useWidgetable } from '../../../../context';
import { useImageUpload, ImageDetail } from '../upload-context';
import { useTranslation } from '@sdppp/common/i18n/react';

interface ActionButtonsProps {
    images: ImageDetail[];
    maxCount: number;
    isMask?: boolean;
    imagesRef: React.MutableRefObject<ImageDetail[]>;
    onClearImages?: () => void;
    isUploading?: boolean;
    uploadProgress?: { completed: number; total: number };
}

export const ActionButtons: React.FC<ActionButtonsProps> = (props) => {
    const { renderActionButtons, runUploadPassOnce } = useWidgetable();
    const { uploadState, clearImages, setImages, callOnValueChange } = useImageUpload();
    const [uploadError, setUploadError] = React.useState<string>('');
    const abortControllerRef = React.useRef<AbortController>(new AbortController());
    
    // Callbacks to bridge between renderActionButtons and existing upload system
    const onPushThumbnail = useCallback((thumbnail: string, source: string) => {
        // Push thumbnail through existing system
        const tempImage: ImageDetail = {
            url: thumbnail,
            source: source,
            thumbnail: thumbnail
        };
        
        if (props.maxCount > 1) {
            setImages([...props.imagesRef.current, tempImage]);
        } else {
            setImages([tempImage]);
        }
    }, [props.maxCount, props.imagesRef, setImages]);
    
    const onPushFinalResult = useCallback((url: string, source: string) => {
        // Update the image with final URL
        const finalImage: ImageDetail = {
            url: url,
            source: source
        };
        
        if (props.maxCount > 1) {
            // Replace the last thumbnail with final image
            const newImages = [...props.imagesRef.current];
            if (newImages.length > 0) {
                newImages[newImages.length - 1] = finalImage;
            }
            callOnValueChange(newImages);
        } else {
            callOnValueChange([finalImage]);
        }
    }, [props.maxCount, props.imagesRef, callOnValueChange]);
    
    const onPushError = useCallback((error: string) => {
        setUploadError(error);
    }, []);
    
    const onClearImages = useCallback(() => {
        if (props.onClearImages) {
            props.onClearImages();
        }
        clearImages();
        setUploadError('');
    }, [props.onClearImages, clearImages]);
    
    const onCreateUploadPass = useCallback((passConfig: any) => {
        // Run the upload pass through context
        const pass = passConfig.config;
        runUploadPassOnce(pass).catch(console.error);
    }, [runUploadPassOnce]);
    
    const onRemoveUploadPass = useCallback(() => {
        // Not needed for now
    }, []);
    
    // Use the render function from context with callbacks
    return <>{renderActionButtons({
        images: props.images,
        maxCount: props.maxCount,
        isMask: props.isMask,
        onPushThumbnail,
        onPushFinalResult,
        onPushError,
        onClearImages,
        onCreateUploadPass,
        onRemoveUploadPass,
        isUploading: uploadState.uploading || props.isUploading || false,
        uploadProgress: props.uploadProgress,
        uploadError: uploadError || uploadState.uploadError,
        abortController: abortControllerRef.current
    })}</>;
};

interface EmptyStateProps {
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ className = "image-preview-empty" }) => {
    const { t } = useTranslation();
    
    return (
        <div className={className}>
            <div className="empty-content">
                <div style={{ marginTop: 8, color: 'var(--sdppp-host-text-color-secondary)' }}>
                    {t('image.upload.no_images')}
                </div>
            </div>
        </div>
    );
};