import React from 'react';
import { Image, Row, Col } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';
import { checkerboardDataUrl } from '../constants';

interface ImageDetail {
    url: string;
    source: string;
    thumbnail?: string;
}

interface MultipleImagesPreviewProps {
    images: ImageDetail[];
    displayImages: ImageDetail[];
    hasMore: boolean;
    displayMax: number;
    previewVisible: boolean;
    previewCurrent: number;
    onPreviewVisibleChange: (visible: boolean) => void;
    onPreviewCurrentChange: (current: number) => void;
    onPreviewChange: (current: number, prev: number) => void;
    onEllipsisClick: () => void;
}

export const MultipleImagesPreview: React.FC<MultipleImagesPreviewProps> = ({
    images,
    displayImages,
    hasMore,
    displayMax,
    previewVisible,
    previewCurrent,
    onPreviewVisibleChange,
    onPreviewCurrentChange,
    onPreviewChange,
    onEllipsisClick
}) => {
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
            items={images.map(image => ({
                src: image.thumbnail || image.url,
            }))}
        >
            <Row gutter={[8, 8]} className="image-preview-row">
                {displayImages.map((image, index) => (
                    <Col
                        key={index}
                        flex="1 1 0"
                        className="preview-image-col"
                    >
                        <div
                            className="preview-image-wrapper"
                            onClick={() => {
                                onPreviewCurrentChange(index);
                                onPreviewVisibleChange(true);
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <Image
                                src={image.thumbnail || image.url}
                                alt={`preview-${index}`}
                                className="preview-image"
                                width="100%"
                                height="100%"
                                style={{
                                    objectFit: 'contain',
                                    backgroundImage: `url("${checkerboardDataUrl}")`,
                                    backgroundSize: '192px 192px',
                                    backgroundRepeat: 'repeat'
                                }}
                                preview={false}
                            />
                        </div>
                    </Col>
                ))}
                {hasMore && (
                    <Col
                        flex="1 1 0"
                        className="preview-image-col"
                    >
                        <div
                            className="preview-image-wrapper ellipsis"
                            onClick={onEllipsisClick}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="ellipsis-content">
                                <EllipsisOutlined />
                                <div className="ellipsis-count">+{images.length - displayMax}</div>
                            </div>
                        </div>
                    </Col>
                )}
            </Row>
        </Image.PreviewGroup>
    );
};