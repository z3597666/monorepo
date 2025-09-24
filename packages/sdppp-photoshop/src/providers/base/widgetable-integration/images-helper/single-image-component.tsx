import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Spin, Alert } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from '@sdppp/common/i18n/react';
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
    

    const { callOnValueChange, uploadState } = useImageUpload();
    const { t } = useTranslation();
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);
    const imagesRef = useRef(images);
    imagesRef.current = images;

    // Auto upload logic for images with auto=true
    // If empty, default to auto from Photoshop canvas (image)
    const defaultAutoSource = useMemo(() => JSON.stringify({ __psType: 'image', content: 'canvas' as const }), []);
    const hasAutoImage = images.length > 0 ? !!images[0].auto : true;
    const autoImageSource = images.length > 0 ? (images[0].source || '') : defaultAutoSource;

    // Use auto upload when image has auto=true (or default auto when empty)
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
        // When empty, still render preview with default auto canvas state and show actions
        const displayImage = images[0] || { url: '', source: defaultAutoSource, auto: true } as ImageDetail;
        return (
            <SingleImagePreview
                image={displayImage}
                previewVisible={previewVisible}
                previewCurrent={previewCurrent}
                onPreviewVisibleChange={setPreviewVisible}
                onPreviewCurrentChange={setPreviewCurrent}
                onPreviewChange={handlePreviewChange}
                onImageUpdate={handleImageUpdate}
                actions={
                    <ActionButtons
                        images={images.length > 0 ? images : [displayImage]}
                        maxCount={maxCount}
                        imagesRef={imagesRef}
                        enableRemove={enableRemove}
                    />
                }
            />
        );
    };

    const renderedImages = useMemo(() => {
        return renderPreviewImages();
    }, [images, previewVisible, previewCurrent]);

    const shouldHideActionButtons = false;

    return (
        <div
            className="image-select-container"
            style={{ width: '100%', ...uiWeightCSS }}
        >
            <div className="image-preview-container">
                {renderedImages}
            </div>
            {(uploadState.uploading) && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <Spin 
                        indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />}
                        size="small"
                    />
                    <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--sdppp-host-text-color-secondary)' }}>{t('image.upload.uploading')}</span>
                </div>
            )}
            {uploadState.uploadError && (
                <Alert
                    message={uploadState.uploadError}
                    type="error"
                    showIcon
                    closable
                    style={{ marginTop: 8 }}
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
