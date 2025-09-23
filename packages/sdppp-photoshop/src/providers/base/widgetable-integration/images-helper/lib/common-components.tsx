import React, { useCallback, useRef, useMemo } from 'react';
import { Button, Upload, Row, Col, Tooltip, Alert, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useImageUpload, ImageDetail } from '../upload-context';
import { useTranslation } from '@sdppp/common/i18n/react';

interface ActionButtonsProps {
    images: ImageDetail[];
    maxCount: number;
    isMask?: boolean;
    imagesRef: React.MutableRefObject<ImageDetail[]>;
    onClearImages?: () => void;
    isUploading?: boolean;
    uploadProgress?: { completed: number; total: number };
    enableRemove?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    images,
    maxCount,
    isMask = false,
    imagesRef,
    onClearImages,
    isUploading = false,
    uploadProgress,
    enableRemove
}) => {
    const { uploadFromPhotoshop, uploadFromPhotoshopViaDialog, uploadFromDisk, uploadState, clearImages, setImages, callOnValueChange } = useImageUpload();
    const { t } = useTranslation();

    // Memoize tooltip titles to prevent PopupContent re-renders
    const tooltipTitles = useMemo(() => ({
        clear: t('image.upload.clear'),
    }), [t]);
    

    const handleImagesChange = useCallback((newImages: ImageDetail[]) => {
        const finalImages = maxCount > 1 
            ? [...imagesRef.current, ...newImages]
            : newImages;
        callOnValueChange(finalImages);
    }, [maxCount, imagesRef, callOnValueChange]);

    const uploadProps: UploadProps = {
        multiple: maxCount > 1,
        showUploadList: false,
        fileList: [],
        beforeUpload: () => false,
        onChange: async (info) => {
            const fileList = info.fileList || [];
            
            if (maxCount > 1 && fileList.length > 1) {
                // 多文件模式：先同步处理所有文件的缩略图显示
                const validFiles = fileList.filter(file => file.originFileObj);
                
                // 默认上传逻辑
                const uploadPromises = validFiles.map(file => 
                    uploadFromDisk(file.originFileObj!)
                );
                await Promise.all(uploadPromises);
            } else {
                // 单文件模式：只上传第一个文件
                const file = fileList[0];
                if (file?.originFileObj) {
                    await uploadFromDisk(file.originFileObj);
                }
            }
        },
    };

    const handleCanvasAdd = useCallback(async (e?: React.MouseEvent) => {
        if (e?.shiftKey) {
            await uploadFromPhotoshopViaDialog(isMask);
        } else {
            await uploadFromPhotoshop(isMask, 'canvas');
        }
    }, [uploadFromPhotoshop, uploadFromPhotoshopViaDialog, isMask]);

    const handleCurLayerAdd = useCallback(async (e?: React.MouseEvent) => {
        if (e?.shiftKey) {
            await uploadFromPhotoshopViaDialog(isMask);
        } else {
            await uploadFromPhotoshop(isMask, 'curlayer');
        }
    }, [uploadFromPhotoshop, uploadFromPhotoshopViaDialog, isMask]);

    const handleSelectionAdd = useCallback(async (e?: React.MouseEvent) => {
        if (e?.shiftKey) {
            await uploadFromPhotoshopViaDialog(isMask);
        } else {
            await uploadFromPhotoshop(isMask, 'selection');
        }
    }, [uploadFromPhotoshop, uploadFromPhotoshopViaDialog, isMask]);

    // Always show remove for masks
    const shouldShowRemove = isMask ? true : (maxCount > 1 || enableRemove === true);

    // Disable upload buttons when maxCount <= 1 and uploading
    const shouldDisableUpload = maxCount <= 1 && (uploadState.uploading || isUploading);

    const moreOptionsHint = t('image.upload.tooltip.more_options_hint', { defaultValue: '+Shift for more options.' });
    const renderTooltip = (primary: string) => (
        <div>
            <div>{primary}</div>
            <div style={{ marginTop: 2, color: 'var(--sdppp-host-text-color-secondary)' }}>{moreOptionsHint}</div>
        </div>
    );

    return (
        <>
            <Row gutter={[4, 8]} className="button-group-row" wrap={false}>
                {isMask ? (
                    <>
                        <Col flex="1">
                            <Tooltip title={renderTooltip(t('image.upload.tooltip.mask.curlayer', { defaultValue: 'Get mask from Photoshop (Current Layer)' }))}>
                                <Button
                                    style={{ width: '100%' }}
                                    icon={<PlusOutlined />}
                                    onClick={handleCurLayerAdd}
                                    disabled={shouldDisableUpload}
                                >
                                    {t('image.upload.from_curlayer', { defaultMessage: 'Current Layer' })}
                                </Button>
                            </Tooltip>
                        </Col>
                        <Col flex="1">
                            <Tooltip title={renderTooltip(t('image.upload.tooltip.mask.selection', { defaultValue: 'Get mask from Photoshop (Selection)' }))}>
                                <Button
                                    style={{ width: '100%' }}
                                    icon={<PlusOutlined />}
                                    onClick={handleSelectionAdd}
                                    disabled={shouldDisableUpload}
                                >
                                    {t('image.upload.from_selection', { defaultMessage: 'Selection' })}
                                </Button>
                            </Tooltip>
                        </Col>
                    </>
                ) : (
                    <>
                        <Col flex="1">
                            <Tooltip title={renderTooltip(t('image.upload.tooltip.image.canvas', { defaultValue: 'Get image from Photoshop (Canvas)' }))}>
                                <Button
                                    style={{ width: '100%' }}
                                    icon={<PlusOutlined />}
                                    onClick={handleCanvasAdd}
                                    disabled={shouldDisableUpload}
                                >
                                    {t('image.upload.from_canvas', { defaultMessage: 'Canvas' })}
                                </Button>
                            </Tooltip>
                        </Col>
                        <Col flex="1">
                            <Tooltip title={renderTooltip(t('image.upload.tooltip.image.curlayer', { defaultValue: 'Get image from Photoshop (Current Layer)' }))}>
                                <Button
                                    style={{ width: '100%' }}
                                    icon={<PlusOutlined />}
                                    onClick={handleCurLayerAdd}
                                    disabled={shouldDisableUpload}
                                >
                                    {t('image.upload.from_curlayer', { defaultMessage: 'Current Layer' })}
                                </Button>
                            </Tooltip>
                        </Col>
                        <Col flex="1">
                            <Upload style={{ width: '100%' }} {...uploadProps} disabled={shouldDisableUpload}>
                                <Button style={{ width: '100%' }} icon={<UploadOutlined />} disabled={shouldDisableUpload}>{t('image.upload.from_harddisk', { defaultMessage: 'Hard Disk' })}</Button>
                            </Upload>
                        </Col>
                    </>
                )}
                {shouldShowRemove && (isMask ? true : (images.length > 0 || uploadState.uploading || isUploading)) && (
                    <Col flex="0 0 auto">
                        <Tooltip title={tooltipTitles.clear}>
                            <Button
                                shape="default"
                                icon={<DeleteOutlined />}
                                onClick={async () => {
                                    if (isMask) {
                                        await uploadFromPhotoshop(true, 'canvas', true);
                                    } else {
                                        if (onClearImages) {
                                            onClearImages();
                                        }
                                        clearImages();
                                    }
                                }}
                            />
                        </Tooltip>
                    </Col>
                )}
            </Row>
            {(uploadState.uploading || isUploading) && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <Spin 
                        indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />}
                        size="small"
                    />
                    <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--sdppp-host-text-color-secondary)' }}>
                        {t('image.upload.uploading')}
                        {uploadProgress && uploadProgress.total > 1 && ` (${uploadProgress.completed}/${uploadProgress.total})`}
                    </span>
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
        </>
    );
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
