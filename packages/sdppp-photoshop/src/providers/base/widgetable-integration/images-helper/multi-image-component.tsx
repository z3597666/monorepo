import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ActionButtons, EmptyState } from './lib/common-components';
import { SingleImagePreview } from './lib/single-image-preview';
import { ImageDetail, useImageUpload, useAutoImageUpload } from './upload-context';
import { Spin, Alert, Row, Col, Button, Upload, Tooltip } from 'antd';
import { LoadingOutlined, UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from '@sdppp/common/i18n/react';

interface MultiImageProps {
    images: ImageDetail[];
    maxCount: number;
    uiWeightCSS: React.CSSProperties;
    enableRemove?: boolean;
}

export const MultiImageComponent: React.FC<MultiImageProps> = ({ images, maxCount, uiWeightCSS, enableRemove = false }) => {
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);
    const [slotCount, setSlotCount] = useState<number>(() => Math.max(1, Math.min(maxCount, images.length || 1)));
    const imagesRef = useRef(images);
    imagesRef.current = images;
    const { uploadState, callOnValueChange, uploadFromPhotoshop, uploadFromDisk } = useImageUpload();
    const { t } = useTranslation();
    const [hoveredRemoveIndex, setHoveredRemoveIndex] = useState<number | null>(null);

    // Keep slot count in sync with external images length while preserving user-increased slots
    React.useEffect(() => {
        setSlotCount(prev => Math.max(1, Math.min(maxCount, Math.max(prev, images.length || 1))));
    }, [images, maxCount]);

    const handlePreviewChange = useCallback((current: number) => {
        setPreviewCurrent(current);
    }, []);

    const removeAtIndex = useCallback((index: number) => {
        const current = [...imagesRef.current];
        if (index >= 0 && index < slotCount) {
            // Remove actual image if exists
            if (index < current.length) {
                current.splice(index, 1);
                callOnValueChange(current);
            }
            // Always reduce slot count but keep at least one
            setSlotCount(prev => Math.max(1, prev - 1));
        }
    }, [callOnValueChange, slotCount]);

    const addOnce = useCallback(async (source: 'canvas' | 'curlayer') => {
        await uploadFromPhotoshop(false, source);
    }, [uploadFromPhotoshop]);

    const SlotItem: React.FC<{ img: ImageDetail | undefined; index: number }> = ({ img, index }) => {
        const hasAuto = !!(img && img.auto);
        const source = hasAuto ? (img?.source || '') : '';
        useAutoImageUpload(source, hasAuto, index);

        return (
            <Col key={index} span={24}>
                {img ? (
                    <SingleImagePreview
                        image={img}
                        previewVisible={previewVisible && previewCurrent === index}
                        previewCurrent={0}
                        onPreviewVisibleChange={setPreviewVisible}
                        onPreviewCurrentChange={() => setPreviewCurrent(index)}
                        onPreviewChange={() => {}}
                        actions={
                            <ActionButtons
                                images={[img]}
                                maxCount={maxCount}
                                imagesRef={imagesRef}
                                enableRemove={false}
                                onClearImages={() => removeAtIndex(index)}
                                targetIndex={index}
                                showInlineRemove={false}
                            />
                        }
                    />
                ) : (
                    <SingleImagePreview
                        image={{ url: '', source: '', thumbnail: '' } as any}
                        previewVisible={false}
                        previewCurrent={0}
                        onPreviewVisibleChange={() => {}}
                        onPreviewCurrentChange={() => {}}
                        onPreviewChange={() => {}}
                        actions={
                            <ActionButtons
                                images={[]}
                                maxCount={maxCount}
                                imagesRef={imagesRef}
                                enableRemove={false}
                                targetIndex={index}
                                showInlineRemove={false}
                            />
                        }
                    />
                )}
            </Col>
        );
    };

    const SlotsView = () => {
        const slots = Math.min(maxCount, Math.max(1, slotCount));
        const slotImages = Array.from({ length: slots }, (_, i) => images[i]);
        return (
            <Row gutter={[8, 12]} className="image-preview-row">
                {slotImages.map((img, index) => (
                    <SlotItem key={index} img={img} index={index} />
                ))}
            </Row>
        );
    };

    const LegacyAddView = () => (
        <Row gutter={[8, 8]} className="button-group-row" wrap={false}>
            <Col flex="1">
                <Button onClick={() => addOnce('canvas')}>
                    {t('image.upload.from_canvas')}
                </Button>
            </Col>
            <Col flex="1">
                <Button onClick={() => addOnce('curlayer')}>
                    {t('image.upload.from_curlayer')}
                </Button>
            </Col>
            <Col flex="1">
                <Upload
                    multiple={false}
                    showUploadList={false}
                    fileList={[]}
                    beforeUpload={() => false}
                    onChange={async (info) => {
                        const file = info.fileList?.[0]?.originFileObj;
                        if (file) await uploadFromDisk(file);
                    }}
                >
                    <Button icon={<UploadOutlined />}> 
                        {t('image.upload.from_harddisk')}
                    </Button>
                </Upload>
            </Col>
        </Row>
    );

    return (
        <div className="image-select-container" style={{ width: '100%', ...uiWeightCSS }}>
            <div className="image-preview-container">
                <SlotsView />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => setSlotCount(prev => Math.min(maxCount, prev + 1))}
                    disabled={slotCount >= maxCount}
                    size="small"
                >
                    {t('image.upload.add_image', { defaultValue: 'Add Image' })}
                </Button>
                {Array.from({ length: slotCount }, (_, i) => (
                    <Tooltip key={i} title={t('image.upload.remove_n', { defaultValue: `Remove ${i + 1}` })}>
                        <Button
                            danger
                            shape="circle"
                            onClick={() => removeAtIndex(i)}
                            disabled={slotCount <= 1}
                            size="small"
                            onMouseEnter={() => setHoveredRemoveIndex(i)}
                            onMouseLeave={() => setHoveredRemoveIndex(prev => (prev === i ? null : prev))}
                        >
                            {hoveredRemoveIndex === i ? 'X' : (i + 1)}
                        </Button>
                    </Tooltip>
                ))}
            </div>
            {uploadState.uploading && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} size="small" />
                    <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--sdppp-host-text-color-secondary)' }}>{t('image.upload.uploading')}</span>
                </div>
            )}
            {uploadState.uploadError && (
                <Alert message={uploadState.uploadError} type="error" showIcon closable style={{ marginTop: 8 }} />
            )}
        </div>
    );
};
