import React, { useCallback } from 'react';
import { useWidgetable } from '../../../../context';
import type { ImageDetail } from '../../../../context';
import { useTranslation } from '@sdppp/common/i18n/react';

interface ActionButtonsProps {
    images: ImageDetail[];
    maxCount: number;
    isMask?: boolean;
    imagesRef: React.MutableRefObject<ImageDetail[]>;
    onClearImages?: () => void;
    isUploading?: boolean;
    uploadProgress?: { completed: number; total: number };
    onImagesChange?: (images: ImageDetail[]) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = (props) => {
    const { renderActionButtons, runUploadPassOnce, onImageStateChange } = useWidgetable();
    const [uploadError, setUploadError] = React.useState<string>('');
    const abortControllerRef = React.useRef<AbortController>(new AbortController());
    
    // Callbacks to bridge between renderActionButtons and new widgetable system
    const onPushThumbnail = useCallback((thumbnail: string, source: string) => {
        const tempImage: ImageDetail = {
            url: thumbnail,
            source: source,
            thumbnail: thumbnail
        };
        
        let newImages: ImageDetail[];
        if (props.maxCount > 1) {
            newImages = [...props.imagesRef.current, tempImage];
        } else {
            newImages = [tempImage];
        }
        
        props.onImagesChange?.(newImages);
        onImageStateChange(newImages);
    }, [props.maxCount, props.imagesRef, props.onImagesChange, onImageStateChange]);
    
    const onPushFinalResult = useCallback((url: string, source: string) => {
        // Update the image with final URL
        const finalImage: ImageDetail = {
            url: url,
            source: source
        };
        
        let newImages: ImageDetail[];
        if (props.maxCount > 1) {
            // Replace the last thumbnail with final image
            newImages = [...props.imagesRef.current];
            if (newImages.length > 0) {
                newImages[newImages.length - 1] = finalImage;
            }
        } else {
            newImages = [finalImage];
        }
        
        props.onImagesChange?.(newImages);
        onImageStateChange(newImages);
    }, [props.maxCount, props.imagesRef, props.onImagesChange, onImageStateChange]);
    
    const onPushError = useCallback((error: string) => {
        setUploadError(error);
    }, []);
    
    const onClearImages = useCallback(() => {
        if (props.onClearImages) {
            props.onClearImages();
        }
        const emptyImages: ImageDetail[] = [];
        props.onImagesChange?.(emptyImages);
        onImageStateChange(emptyImages);
        setUploadError('');
    }, [props.onClearImages, props.onImagesChange, onImageStateChange]);
    
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
        name: 'images', // Add a name for the ActionButton
        isUploading: props.isUploading || false,
        onUploadStart: () => {},
        onUploadComplete: () => {},
        onUploadError: (error: Error) => setUploadError(error.message),
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