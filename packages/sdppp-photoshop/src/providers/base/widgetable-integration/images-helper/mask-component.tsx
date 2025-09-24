import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Spin, Alert } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from '@sdppp/common/i18n/react';
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
    const { setImages, callOnValueChange, uploadState } = useImageUpload();
    const { t } = useTranslation();
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);
    const imagesRef = useRef(images);
    imagesRef.current = images;

    // Auto upload logic for images with auto=true (取第一个image的auto)
    // If empty, default to auto from Photoshop canvas (mask)
    const defaultAutoSource = useMemo(() => JSON.stringify({ __psType: 'mask', content: 'canvas' as const }), []);
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
                isMask={true}
                actions={
                    <ActionButtons
                        images={images.length > 0 ? images : [displayImage]}
                        maxCount={maxCount}
                        isMask={true}
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
