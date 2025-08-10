import React, { useCallback, useRef, useMemo } from 'react';
import { Button, Upload, Row, Col, Tooltip, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
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
        multiple: false,
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
            {uploadState.uploadError && (
                <Alert
                    message={uploadState.uploadError}
                    type="error"
                    showIcon
                    closable
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