import React, { useCallback, useRef, useMemo } from 'react';
import { Button, Upload, Row, Col, Tooltip, Alert, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useImageUpload, ImageDetail } from '../upload-context';

interface ActionButtonsProps {
    images: ImageDetail[];
    maxCount: number;
    isMask?: boolean;
    imagesRef: React.MutableRefObject<ImageDetail[]>;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    images,
    maxCount,
    isMask = false,
    imagesRef
}) => {
    const { uploadFromPhotoshop, uploadFromDisk, uploadState, clearImages, setImages, callOnValueChange } = useImageUpload();

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
            const file = fileList[0];
            if (file?.originFileObj) {
                await uploadFromDisk(file.originFileObj);
            }
        },
    };

    const handlePSImageAdd = useCallback(async () => {
        await uploadFromPhotoshop(isMask);
    }, [uploadFromPhotoshop, isMask]);

    return (
        <>
            <Row gutter={[8, 8]} className="button-group-row">
                <Col flex="1 1 0">
                    <Button
                        style={{ width: '100%' }}
                        icon={<PlusOutlined />}
                        onClick={handlePSImageAdd}
                    >
                        从PS
                    </Button>
                </Col>
                <Col flex="1 1 0">
                    <Upload style={{ width: '100%' }} {...uploadProps}>
                        <Button style={{ width: '100%' }} icon={<UploadOutlined />}>从磁盘</Button>
                    </Upload>
                </Col>
                {images.length > 0 && (
                    <Col flex="0 0 auto">
                        <Tooltip title="清空">
                            <Button
                                icon={<DeleteOutlined />}
                                onClick={clearImages}
                            />
                        </Tooltip>
                    </Col>
                )}
            </Row>
            {uploadState.uploading && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <Spin 
                        indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />}
                        size="small"
                    />
                    <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--sdppp-host-text-color-secondary)' }}>
                        上传中...若图片过大可能会有卡顿
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
    return (
        <div className={className}>
            <div className="empty-content">
                <div style={{ marginTop: 8, color: 'var(--sdppp-host-text-color-secondary)' }}>
                    暂无图片
                </div>
            </div>
        </div>
    );
};