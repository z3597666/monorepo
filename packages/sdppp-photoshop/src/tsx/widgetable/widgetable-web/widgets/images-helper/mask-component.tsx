import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ActionButtons, EmptyState } from './lib/common-components';
import { SingleImagePreview } from './lib/single-image-preview';
import { useWidgetable } from '../../../context';
import type { ImageDetail } from '../../../context';

interface MaskProps {
    images: ImageDetail[];
    maxCount: number;
    uiWeightCSS: React.CSSProperties;
    onImagesChange?: (images: ImageDetail[]) => void;
}

export const MaskComponent: React.FC<MaskProps> = ({
    images,
    maxCount,
    uiWeightCSS,
    onImagesChange
}) => {
    const { onImageStateChange } = useWidgetable();
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);
    const imagesRef = useRef(images);
    imagesRef.current = images;

    // Notify widgetable context when images change for automatic upload pass management
    useEffect(() => {
        onImageStateChange(images);
    }, [images, onImageStateChange]);

    const handlePreviewChange = useCallback((current: number) => {
        setPreviewCurrent(current);
    }, []);

    const handleImageUpdate = useCallback((updatedImage: ImageDetail) => {
        const newImages = [updatedImage];
        onImagesChange?.(newImages);
        onImageStateChange(newImages);
    }, [onImagesChange, onImageStateChange]);

    const renderPreviewImages = () => {
        if (images.length === 0) {
            return <EmptyState />;
        }

        return (
            <SingleImagePreview
                image={images[0]}
                previewVisible={previewVisible}
                previewCurrent={previewCurrent}
                onPreviewVisibleChange={setPreviewVisible}
                onPreviewCurrentChange={setPreviewCurrent}
                onPreviewChange={handlePreviewChange}
                onImageUpdate={handleImageUpdate}
            />
        );
    };

    const renderedImages = useMemo(() => {
        return renderPreviewImages();
    }, [images, previewVisible, previewCurrent]);

    const shouldHideActionButtons = images.length > 0 && images[0].maintainUploadPass;

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
                    isMask={true}
                    imagesRef={imagesRef}
                    onImagesChange={onImagesChange}
                />
            )}
        </div>
    );
};