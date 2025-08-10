import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ActionButtons, EmptyState } from './lib/common-components';
import { MultipleImagesPreview } from './lib/multiple-images-preview';
import { ImageDetail } from './upload-context';

interface MultiImageProps {
    images: ImageDetail[];
    maxCount: number;
    uiWeightCSS: React.CSSProperties;
}

export const MultiImageComponent: React.FC<MultiImageProps> = ({
    images,
    maxCount,
    uiWeightCSS
}) => {
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);
    const imagesRef = useRef(images);
    imagesRef.current = images;
    
    const displayMax = 2;

    const handlePreviewChange = useCallback((current: number, prev: number) => {
        setPreviewCurrent(current);
    }, []);

    const handleEllipsisClick = useCallback(() => {
        setPreviewCurrent(displayMax);
        setPreviewVisible(true);
    }, [displayMax]);

    const renderPreviewImages = () => {
        if (images.length === 0) {
            return <EmptyState />;
        }

        const displayImages = images.slice(0, displayMax);
        const hasMore = images.length > displayMax;

        return (
            <MultipleImagesPreview
                images={images}
                displayImages={displayImages}
                hasMore={hasMore}
                displayMax={displayMax}
                previewVisible={previewVisible}
                previewCurrent={previewCurrent}
                onPreviewVisibleChange={setPreviewVisible}
                onPreviewCurrentChange={setPreviewCurrent}
                onPreviewChange={handlePreviewChange}
                onEllipsisClick={handleEllipsisClick}
            />
        );
    };

    const renderedImages = useMemo(() => {
        return renderPreviewImages();
    }, [images, previewVisible, previewCurrent]);

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
                imagesRef={imagesRef}
            />
        </div>
    );
};