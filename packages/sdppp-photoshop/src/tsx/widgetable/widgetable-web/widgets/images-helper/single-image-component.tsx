import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ActionButtons, EmptyState } from './lib/common-components';
import { SingleImagePreview } from './lib/single-image-preview';
import { ImageDetail, useAutoImageUpload, useImageUpload } from './upload-context';


interface SingleImageProps {
    images: ImageDetail[];
    maxCount: number;
    uiWeightCSS: React.CSSProperties;
    thumbnail?: string;
    onThumbnailChange?: (thumbnail: string) => void;
}

export const SingleImageComponent: React.FC<SingleImageProps> = ({
    images,
    maxCount,
    uiWeightCSS,
    thumbnail: externalThumbnail = '',
    onThumbnailChange
}) => {
    // log(images)
    const { callOnValueChange } = useImageUpload();
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);
    const [internalThumbnail, setInternalThumbnail] = useState<string>('');
    const thumbnail = externalThumbnail || internalThumbnail;
    const imagesRef = useRef(images);
    imagesRef.current = images;

    // Auto upload logic for images with auto=true
    const hasAutoImage = images.length > 0 && images[0].auto;
    const autoImageSource = hasAutoImage ? images[0].source : '';

    // Use auto upload when image has auto=true
    useAutoImageUpload(
        autoImageSource,
        hasAutoImage
    );

    const handlePreviewChange = useCallback((current: number) => {
        setPreviewCurrent(current);
    }, []);

    const handleImageUpdate = useCallback((updatedImage: ImageDetail) => {
        // If we have actual images, update the real image, not the display image
        if (images.length > 0) {
            const realImage = images[0];
            const newRealImage = {
                ...realImage,
                auto: updatedImage.auto
            };
            const newImages = [newRealImage];
            callOnValueChange(newImages);
        } else {
            // Fallback: use the updated image as is
            const newImages = [updatedImage];
            callOnValueChange(newImages);
        }
    }, [callOnValueChange, images]);

    const setThumbnailImage = useCallback((thumbnailUrl: string) => {
        if (onThumbnailChange) {
            onThumbnailChange(thumbnailUrl);
        } else {
            setInternalThumbnail(thumbnailUrl);
        }
    }, [onThumbnailChange]);

    const clearThumbnail = useCallback(() => {
        if (onThumbnailChange) {
            onThumbnailChange('');
        } else {
            setInternalThumbnail('');
        }
    }, [onThumbnailChange]);


    const renderPreviewImages = () => {
        if (images.length === 0 && !thumbnail) {
            return <EmptyState />;
        }

        // Show thumbnail when uploading, otherwise show the actual image
        const displayImage = thumbnail ? {
            url: thumbnail,
            source: 'uploading',
            thumbnail: thumbnail,
            auto: images[0]?.auto || false // Preserve auto state from original image
        } : images[0];

        // 确保在有缩略图或有图片时都显示预览组件
        if (displayImage) {
            return (
                <SingleImagePreview
                    image={displayImage}
                    previewVisible={previewVisible}
                    previewCurrent={previewCurrent}
                    onPreviewVisibleChange={setPreviewVisible}
                    onPreviewCurrentChange={setPreviewCurrent}
                    onPreviewChange={handlePreviewChange}
                    onImageUpdate={handleImageUpdate}
                />
            );
        }

        return <EmptyState />;
    };

    const renderedImages = useMemo(() => {
        return renderPreviewImages();
    }, [images, previewVisible, previewCurrent, thumbnail]);

    const shouldHideActionButtons = images.length > 0 && images[0].auto;

    return (
        <div
            className="image-select-container"
            style={{ width: '100%', ...uiWeightCSS }}
        >
            <div className="image-preview-container">
                {renderedImages}
            </div>
            {!shouldHideActionButtons && (
                <ActionButtons
                    images={images}
                    maxCount={maxCount}
                    imagesRef={imagesRef}
                />
            )}
        </div>
    );
};