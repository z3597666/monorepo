import React from 'react';
import { Button, Image, Row, Col, Tooltip, Segmented, Switch } from 'antd';
import { ThunderboltFilled, ThunderboltOutlined } from '@ant-design/icons';
import { SourceRender, useSourceInfo } from './source-render';

interface ImageDetail {
    url: string;
    source: string;
    thumbnail?: string;
    auto?: boolean;
}

interface SingleImagePreviewProps {
    image: ImageDetail;
    previewVisible: boolean;
    previewCurrent: number;
    onPreviewVisibleChange: (visible: boolean) => void;
    onPreviewCurrentChange: (current: number) => void;
    onPreviewChange: (current: number, prev: number) => void;
    onImageUpdate?: (updatedImage: ImageDetail) => void;
}

export const SingleImagePreview: React.FC<SingleImagePreviewProps> = ({
    image,
    previewVisible,
    previewCurrent,
    onPreviewVisibleChange,
    onPreviewCurrentChange,
    onPreviewChange,
    onImageUpdate
}) => {
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
            items={[{
                src: image.thumbnail || image.url,
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
                                <Tooltip title="自动重新获取">
                                    <Switch
                                        style={{ width: '100%' }}
                                        checked={image.auto || false}
                                        onChange={handleAutoToggle}
                                        checkedChildren={<ThunderboltFilled />}
                                        unCheckedChildren={<ThunderboltOutlined />}
                                    />
                                </Tooltip>
                            </div>
                        )}
                    </div>
                </Col>
                <Col span={16} className="preview-image-col">
                    <div
                        className="preview-image-wrapper single"
                        onClick={() => {
                            onPreviewCurrentChange(0);
                            onPreviewVisibleChange(true);
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <Image
                            src={image.thumbnail || image.url}
                            alt="preview-0"
                            className="preview-image"
                            width="100%"
                            height="100%"
                            style={{ objectFit: 'contain' }}
                            preview={false}
                        />
                    </div>
                </Col>
            </Row>
        </Image.PreviewGroup>
    );
};