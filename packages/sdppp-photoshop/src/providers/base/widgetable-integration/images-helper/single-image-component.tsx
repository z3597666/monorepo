import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ActionButtons, EmptyState } from './lib/common-components';
import { SingleImagePreview } from './lib/single-image-preview';
import { ImageDetail, useAutoImageUpload, useImageUpload } from './upload-context';


interface SingleImageProps {
    images: ImageDetail[];
    maxCount: number;
    uiWeightCSS: React.CSSProperties;
    enableRemove?: boolean;
}

const SingleImageComponentImpl: React.FC<SingleImageProps> = ({
    images,
    maxCount,
    uiWeightCSS,
    enableRemove = false
}) => {
    

    const { callOnValueChange } = useImageUpload();
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);
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
        const newImages = [updatedImage];
        callOnValueChange(newImages);
    }, [callOnValueChange]);

    // 使用 upload context 提供的方法
    const { } = useImageUpload();

    const renderPreviewImages = () => {
        if (images.length === 0) {
            return <EmptyState />;
        }

        // 确保在有缩略图或有图片时都显示预览组件
        if (images[0]) {
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
        }

        return <EmptyState />;
    };

    const renderedImages = useMemo(() => {
        return renderPreviewImages();
    }, [images, previewVisible, previewCurrent]);

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
                    enableRemove={enableRemove}
                />
            )}
        </div>
    );
};

// Wrap with React.memo to prevent unnecessary re-renders
export const SingleImageComponent = React.memo(SingleImageComponentImpl, (prevProps, nextProps) => {
    // Check if images array actually changed
    if (prevProps.images.length !== nextProps.images.length) {
        return false;
    }

    // Check if image content changed
    for (let i = 0; i < prevProps.images.length; i++) {
        const prevImage = prevProps.images[i];
        const nextImage = nextProps.images[i];

        if (!nextImage ||
            prevImage.url !== nextImage.url ||
            prevImage.isUploading !== nextImage.isUploading ||
            prevImage.auto !== nextImage.auto) {
            return false;
        }
    }

    // Check other props
    if (prevProps.maxCount !== nextProps.maxCount ||
        prevProps.enableRemove !== nextProps.enableRemove) {
        return false;
    }

    // uiWeightCSS is typically stable, but we'll do a shallow check
    if (JSON.stringify(prevProps.uiWeightCSS) !== JSON.stringify(nextProps.uiWeightCSS)) {
        return false;
    }

    return true;
});
