import React, { useMemo } from 'react';
import { Button, Image, Row, Col, Tooltip, Segmented, Switch } from 'antd';
import { useTranslation } from '@sdppp/common/i18n/react';
import { SourceRender, useSourceInfo } from './source-render';
import { checkerboardDataUrl } from '../constants';
import { useImageUpload } from '../upload-context';
import { sdpppSDK } from '@sdppp/common';

interface ImageDetail {
    url: string;
    source: string;
    thumbnail?: string;
    auto?: boolean;
    isUploading?: boolean;
}

interface SingleImagePreviewProps {
    image: ImageDetail;
    previewVisible: boolean;
    previewCurrent: number;
    onPreviewVisibleChange: (visible: boolean) => void;
    onPreviewCurrentChange: (current: number) => void;
    onPreviewChange: (current: number, prev: number) => void;
    onImageUpdate?: (updatedImage: ImageDetail) => void;
    isMask?: boolean;
}

export const SingleImagePreview: React.FC<SingleImagePreviewProps> = ({
    image,
    previewVisible,
    previewCurrent,
    onPreviewVisibleChange,
    onPreviewCurrentChange,
    onPreviewChange,
    onImageUpdate,
    isMask = false
}) => {

    const { t } = useTranslation();
    const { uploadState } = useImageUpload();
    const log = useMemo(() => sdpppSDK.logger.extend('SinglePreview'), []);

    // Memoize tooltip titles to prevent PopupContent re-renders
    const tooltipTitles = useMemo(() => ({
        autoRefetch: t('image.auto_refetch'),
    }), [t]);
    const handleAutoToggle = (checked: boolean) => {
        if (onImageUpdate) {
            onImageUpdate({
                ...image,
                auto: checked
            });
        }
    };

    const sourceInfo = useSourceInfo(image.source);
    const isPSSource = sourceInfo.type === 'photoshop_image' || sourceInfo.type === 'photoshop_mask';

    // Inline preview prefers per-image current thumbnail (upload state),
    // then image.thumbnail, then image.url. Keyed by uploadId or url.
    const perImageThumb = (image.uploadId && uploadState.currentThumbnails?.[image.uploadId])
        || (image.url && uploadState.currentThumbnails?.[image.url])
        || '';
    const inlineSrc = perImageThumb || image.thumbnail || image.url || '';
    // Consider uploading when explicit flag is set or auto flow is active
    const isUploading = !!image.isUploading || (image.auto ? uploadState.uploading : false);

    // Debug current inline/final sources
    log('render', {
        url: image.url,
        thumbnail: image.thumbnail,
        auto: image.auto,
        uploading: uploadState.uploading
    });

    return (
        <Image.PreviewGroup
            preview={{
                visible: previewVisible,
                onVisibleChange: (visible) => {
                    onPreviewVisibleChange(visible);
                },
                current: previewCurrent,
                onChange: onPreviewChange,
            }}
            // Big preview uses data url first, then data thumbnail; never local state thumbnail
            items={[{
                src: image.thumbnail || image.url || ''
            }]}
        >
            <Row gutter={[8, 8]} className="image-preview-row single-image">
                <Col span={8} className="image-info-col">
                    <div className="image-info-panel">
                        <div className="info-details">
                            <SourceRender
                                source={image.source}
                            />
                        </div>
                        {isPSSource && (
                            <div className="info-actions">
                                <Tooltip title={tooltipTitles.autoRefetch}>
                                    <Switch
                                        style={{ width: '100%' }}
                                        checked={image.auto || false}
                                        onChange={handleAutoToggle}
                                        checkedChildren={t('image.auto_toggle')}
                                        unCheckedChildren={t('image.auto_toggle')}
                                    />
                                </Tooltip>
                            </div>
                        )}
                    </div>
                </Col>
                <Col span={16} className="preview-image-col">
                    <div
                        className={`preview-image-wrapper single ${isMask ? 'mask' : ''}`}
                        onClick={() => {
                            if (isUploading) return;
                            onPreviewCurrentChange(0);
                            onPreviewVisibleChange(true);
                        }}
                        style={{ cursor: isUploading ? 'not-allowed' : 'pointer', position: 'relative' }}
                    >
                        {isUploading && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '6px',
                                    zIndex: 1
                                }}
                            />
                        )}
                        {(inlineSrc) ? (
                                <Image
                                    src={inlineSrc}
                                    alt="preview-0"
                                    className="preview-image"
                                    width="100%"
                                    height="100%"
                                    style={{
                                        objectFit: 'contain',
                                        ...(isMask ? {
                                            backgroundColor: '#000'
                                        } : {
                                            backgroundImage: `url("${checkerboardDataUrl}")`,
                                            backgroundSize: '192px 192px',
                                            backgroundRepeat: 'repeat'
                                        }),
                                        opacity: isUploading ? 0.6 : 1
                                    }}
                                    preview={false}
                                />
                            
                        ) : (
                            <div
                                    className="preview-image"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        minHeight: '120px',
                                        ...(isMask ? {
                                            backgroundColor: '#000'
                                        } : {
                                            backgroundImage: `url("${checkerboardDataUrl}")`,
                                            backgroundSize: '192px 192px',
                                            backgroundRepeat: 'repeat'
                                        }),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px dashed #d9d9d9',
                                        borderRadius: '6px'
                                    }}
                                />
                            )}
                    </div>
                </Col>
            </Row>
        </Image.PreviewGroup>
    );
};
