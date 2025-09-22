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
    customUploadFromPhotoshop?: (isMask?: boolean, source: 'canvas' | 'curlayer') => Promise<void>;
    customUploadFromDisk?: (file: File) => Promise<void>;
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
    customUploadFromPhotoshop,
    customUploadFromDisk,
    onClearImages,
    isUploading = false,
    uploadProgress,
    enableRemove
}) => {
    const { uploadFromPhotoshop, uploadFromDisk, uploadState, clearImages, setImages, callOnValueChange } = useImageUpload();
    const { t } = useTranslation();
    

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
                
                if (customUploadFromDisk) {
                    // 如果有自定义上传函数，让它处理批量预览
                    const uploadPromises = validFiles.map(file => 
                        customUploadFromDisk(file.originFileObj!)
                    );
                    await Promise.all(uploadPromises);
                } else {
                    // 使用默认上传逻辑
                    const uploadPromises = validFiles.map(file => 
                        uploadFromDisk(file.originFileObj!)
                    );
                    await Promise.all(uploadPromises);
                }
            } else {
                // 单文件模式：只上传第一个文件
                const file = fileList[0];
                if (file?.originFileObj) {
                    if (customUploadFromDisk) {
                        await customUploadFromDisk(file.originFileObj);
                    } else {
                        await uploadFromDisk(file.originFileObj);
                    }
                }
            }
        },
    };

    const handleCanvasAdd = useCallback(async () => {
        // console.log('Canvas button clicked', { isMask, customUploadFromPhotoshop: !!customUploadFromPhotoshop });
        if (customUploadFromPhotoshop) {
            await customUploadFromPhotoshop(isMask, 'canvas');
        } else {
            await uploadFromPhotoshop(isMask, 'canvas');
        }
    }, [uploadFromPhotoshop, customUploadFromPhotoshop, isMask]);

    const handleCurLayerAdd = useCallback(async () => {
        console.log('Current Layer button clicked', { isMask, customUploadFromPhotoshop: !!customUploadFromPhotoshop });
        if (customUploadFromPhotoshop) {
            await customUploadFromPhotoshop(isMask, 'curlayer');
        } else {
            await uploadFromPhotoshop(isMask, 'curlayer');
        }
    }, [uploadFromPhotoshop, customUploadFromPhotoshop, isMask]);

    const shouldShowRemove = maxCount > 1 || enableRemove === true;

    // Disable upload buttons when maxCount <= 1 and uploading
    const shouldDisableUpload = maxCount <= 1 && (uploadState.uploading || isUploading);

    return (
        <>
            <Row gutter={[4, 8]} className="button-group-row" wrap={false}>
                <Col flex="1">
                    <Button
                        style={{ width: '100%' }}
                        icon={<PlusOutlined />}
                        onClick={handleCanvasAdd}
                        disabled={shouldDisableUpload}
                    >
                        {t('image.upload.from_canvas', { defaultMessage: 'Canvas' })}
                    </Button>
                </Col>
                <Col flex="1">
                    <Button
                        style={{ width: '100%' }}
                        icon={<PlusOutlined />}
                        onClick={handleCurLayerAdd}
                        disabled={shouldDisableUpload}
                    >
                        {t('image.upload.from_curlayer', { defaultMessage: 'Current Layer' })}
                    </Button>
                </Col>
                <Col flex="1">
                    <Upload style={{ width: '100%' }} {...uploadProps} disabled={shouldDisableUpload}>
                        <Button style={{ width: '100%' }} icon={<UploadOutlined />} disabled={shouldDisableUpload}>{t('image.upload.from_harddisk', { defaultMessage: 'Hard Disk' })}</Button>
                    </Upload>
                </Col>
                {shouldShowRemove && (images.length > 0 || uploadState.uploading || isUploading) && (
                    <Col flex="0 0 auto">
                        <Tooltip title={t('image.upload.clear')}>
                            <Button
                                shape="default"
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                    if (onClearImages) {
                                        onClearImages();
                                    }
                                    clearImages();
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