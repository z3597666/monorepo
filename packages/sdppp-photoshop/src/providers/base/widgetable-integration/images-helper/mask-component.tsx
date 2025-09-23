import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ActionButtons, EmptyState } from './lib/common-components';
import { SingleImagePreview } from './lib/single-image-preview';
import { ImageDetail, useAutoImageUpload, useImageUpload } from './upload-context';

interface MaskProps {
    images: ImageDetail[];
    maxCount: number;
    uiWeightCSS: React.CSSProperties;
    enableRemove?: boolean;
}

export const MaskComponent: React.FC<MaskProps> = ({
    images,
    maxCount,
    uiWeightCSS,
    enableRemove = false
}) => {
    const { setImages, callOnValueChange } = useImageUpload();
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);
    const imagesRef = useRef(images);
    imagesRef.current = images;

    // Auto upload logic for images with auto=true (取第一个image的auto)
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
        const newImages = [updatedImage];
        callOnValueChange(newImages);
    }, [callOnValueChange]);

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
                    isMask={true}
                />
            );
    };

    const renderedImages = useMemo(() => {
        return renderPreviewImages();
    }, [images, previewVisible, previewCurrent]);

    // Always show action buttons for mask to ensure trash button is visible
    const shouldHideActionButtons = false;

    return (
        <div
            className="image-select-container"
            style={{ width: '100%', ...uiWeightCSS }}
        >
            <div className="image-preview-container">
                {renderedImages}
            </div>
            <ActionButtons
                images={images}
                maxCount={maxCount}
                isMask={true}
                imagesRef={imagesRef}
                enableRemove={enableRemove}
            />
        </div>
    );
};
