import React, { useMemo } from 'react';
import { Button, Image, Row, Col, Tooltip, Segmented, Switch } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from '@sdppp/common/i18n/react';
import { useSourceInfo } from './source-render';
import { checkerboardDataUrl } from '../constants';
import { useImageUpload } from '../upload-context';
import { sdpppSDK } from '@sdppp/common';
import { useRealtimeThumbnail } from '../realtime-thumbnail-store';

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
    actions?: React.ReactNode;
    removable?: boolean;
    onRemove?: () => void;
}

export const SingleImagePreview: React.FC<SingleImagePreviewProps> = ({
    image,
    previewVisible,
    previewCurrent,
    onPreviewVisibleChange,
    onPreviewCurrentChange,
    onPreviewChange,
    onImageUpdate,
    isMask = false,
    actions,
    removable = false,
    onRemove
}) => {

    const { t } = useTranslation();
    const { uploadState } = useImageUpload();

    // Memoize tooltip titles to prevent PopupContent re-renders
    // Auto toggle removed; action buttons now control auto mode

    const sourceInfo = useSourceInfo(image.source);
    const isPSSource = sourceInfo.type === 'photoshop_image' || sourceInfo.type === 'photoshop_mask';

    // Inline preview prefers per-image current thumbnail (upload state),
    // then image.thumbnail, then image.url. Keyed by uploadId or url.
    const perImageThumb = (image.uploadId && uploadState.currentThumbnails?.[image.uploadId])
        || (image.url && uploadState.currentThumbnails?.[image.url])
        || '';
    const autoContent = (sourceInfo.type === 'photoshop_image' && sourceInfo.params?.content) || (sourceInfo.type === 'photoshop_mask' && sourceInfo.maskParams?.content) || undefined;
    const realtimeThumb = image.auto && autoContent ? useRealtimeThumbnail(
        sourceInfo.type === 'photoshop_mask' ? 'mask' : 'image',
        autoContent as any
    ) : '';
    const inlineSrc = realtimeThumb || perImageThumb || image.thumbnail || image.url || '';
    // Consider uploading when explicit flag is set or auto flow is active
    const isUploading = !!image.isUploading || (image.auto ? uploadState.uploading : false);


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
            <Row gutter={[8, 4]} className="image-preview-row single-image" wrap={false}>
                <Col flex="0 0 auto" className="image-info-col" style={{ width: 'auto' }}>
                    <div className="image-info-panel">
                        <div className="info-actions">
                            {actions}
                        </div>
                    </div>
                </Col>
                <Col flex="1 1 auto" className="preview-image-col">
                    <div
                        className={`preview-image-wrapper single ${isMask ? 'mask' : ''}`}
                        onClick={() => {
                            if (isUploading) return;
                            onPreviewCurrentChange(0);
                            onPreviewVisibleChange(true);
                        }}
                        style={{ cursor: isUploading ? 'not-allowed' : 'pointer', position: 'relative' }}
                    >
                        {removable && (
                            <Button
                                shape="circle"
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove && onRemove();
                                }}
                                style={{
                                    position: 'absolute',
                                    top: 6,
                                    right: 6,
                                    zIndex: 3,
                                    backgroundColor: 'rgba(0,0,0,0.45)',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.3)'
                                }}
                            />
                        )}
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
                                            backgroundColor: '#fff'
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
                                        ...(isMask ? {
                                            backgroundColor: '#fff'
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
