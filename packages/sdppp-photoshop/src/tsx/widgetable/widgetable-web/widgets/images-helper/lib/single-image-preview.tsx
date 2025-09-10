import React, { useMemo } from 'react';
import { Button, Image, Row, Col, Tooltip, Segmented, Switch } from 'antd';
import { ThunderboltFilled, ThunderboltOutlined } from '@ant-design/icons';
import { useTranslation } from '@sdppp/common/i18n/react';
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

export const SingleImagePreview: React.FC<SingleImagePreviewProps> = (props) => {
    const {
        image,
        previewVisible,
        previewCurrent,
        onPreviewVisibleChange,
        onPreviewCurrentChange,
        onPreviewChange,
        onImageUpdate
    } = props;
    const { t } = useTranslation();
    
    // Check if URL is valid for image display
    const isValidImageUrl = (url: string): boolean => {
        if (!url) return false;
        
        // Check for HTTP/HTTPS URLs
        if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        }
        
        // Check for base64 data URLs
        if (url.startsWith('data:image/')) {
            return true;
        }
        
        // Check for blob URLs
        if (url.startsWith('blob:')) {
            return true;
        }
        
        return false;
    };
    
    // Calculate display URL with priority: valid url > thumbnail > invalid url
    const displayUrl = useMemo(() => {
        const urlIsValid = isValidImageUrl(image.url);
        
        if (urlIsValid) {
            return image.url; // Priority 1: valid URL
        } else if (image.thumbnail) {
            return image.thumbnail; // Priority 2: thumbnail
        } else {
            return image.url; // Priority 3: invalid URL (will show broken image)
        }
    }, [image.url, image.thumbnail]);
    
    const handleAutoToggle = (checked: boolean) => {
        if (onImageUpdate) {
            const updatedImage = {
                ...image,
                auto: checked
            };
            onImageUpdate(updatedImage);
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
                src: displayUrl,
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
                                <Tooltip title={t('image.auto_refetch')}>
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
                            src={displayUrl}
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