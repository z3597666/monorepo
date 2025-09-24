import React, { useCallback, useRef, useMemo } from 'react';
import { Button, Upload, Row, Col, Tooltip, Alert, Spin } from 'antd';
import { DeleteOutlined, UploadOutlined, LoadingOutlined, CheckSquareFilled, BorderOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useImageUpload, ImageDetail } from '../upload-context';
import { useSourceInfo } from './source-render';
import { startAutoThumbnail, stopAutoThumbnail } from '../realtime-thumbnail-store';
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
    // For multi-image: target slot index to operate on
    targetIndex?: number;
    // Control whether to show the inline remove button area
    showInlineRemove?: boolean;
    // In multi-image mode, always perform one-shot uploads
    forceOneShot?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    images,
    maxCount,
    isMask = false,
    imagesRef,
    onClearImages,
    isUploading = false,
    uploadProgress,
    enableRemove,
    targetIndex
    , showInlineRemove = true,
    forceOneShot = false
}) => {
    const { uploadFromPhotoshop, uploadFromPhotoshopViaDialog, uploadFromDisk, uploadState, clearImages, setImages, callOnValueChange, setUploadError } = useImageUpload();
    const { t } = useTranslation();
    const firstSourceInfo = useSourceInfo(images[0]?.source || '');

    // Memoize tooltip titles to prevent PopupContent re-renders
    const tooltipTitles = useMemo(() => ({
        clear: t('image.upload.clear'),
    }), [t]);
    
    // Ensure tooltips don't stick: render to body and ignore overlay pointer events
    const tooltipProps = useMemo(() => ({
        getPopupContainer: () => document.body,
        destroyTooltipOnHide: true,
        mouseLeaveDelay: 0,
        placement: 'right' as const,
        overlayStyle: { pointerEvents: 'none' } as React.CSSProperties,
    }), []);

    const handleImagesChange = useCallback((newImages: ImageDetail[]) => {
        const finalImages = maxCount > 1 
            ? [...imagesRef.current, ...newImages]
            : newImages;
        callOnValueChange(finalImages);
    }, [maxCount, imagesRef, callOnValueChange]);

    // One-shot modifier: use Shift for single fetch
    const isOneShot = useCallback((e?: React.MouseEvent) => forceOneShot || !!(e && e.shiftKey), [forceOneShot]);

    const uploadProps: UploadProps = {
        multiple: false,
        showUploadList: false,
        fileList: [],
        beforeUpload: () => false,
        onChange: async (info) => {
            // Clean previous error before starting a new disk upload
            setUploadError('');
            const fileList = info.fileList || [];
            
            const file = fileList[0];
            if (file?.originFileObj) {
                await uploadFromDisk(file.originFileObj, typeof targetIndex === 'number' ? targetIndex : undefined);
            }
        },
    };

    // Toggle auto mode via action buttons (click). Hold Shift to fetch once.
    const setAutoMode = useCallback((type: 'image' | 'mask', content: 'canvas' | 'curlayer' | 'selection') => {
        const current = images[0];
        const isSameAuto = current?.auto && ((firstSourceInfo.type === 'photoshop_image' && type === 'image' && firstSourceInfo.params?.content === content)
            || (firstSourceInfo.type === 'photoshop_mask' && type === 'mask' && firstSourceInfo.maskParams?.content === content));

        const buildUpdated = (auto: boolean) => {
            const source = JSON.stringify(type === 'image' ? { __psType: 'image', content } : { __psType: 'mask', content });
            if (current) return { ...current, source, auto } as ImageDetail;
            return { url: '', source, auto } as ImageDetail;
        };

        if (maxCount > 1 && typeof targetIndex === 'number' && targetIndex >= 0) {
            const next = [...imagesRef.current];
            // 确保数组足够长
            while (next.length <= targetIndex) {
                next.push({ url: '', source: '', thumbnail: '' } as ImageDetail);
            }
            next[targetIndex] = isSameAuto ? { ...next[targetIndex], auto: false } : buildUpdated(true);
            // 使用callOnValueChange确保状态传播到父组件
            callOnValueChange(next);
        } else {
            if (isSameAuto) {
                if (current) {
                    setImages([{ ...current, auto: false }]);
                }
                return;
            }
            const updated = buildUpdated(true);
            setImages([updated]);
        }
    }, [images, firstSourceInfo, setImages, callOnValueChange, maxCount, targetIndex, imagesRef]);

    const handleCanvasAdd = useCallback(async (e?: React.MouseEvent) => {
        // Clean previous error before starting a new fetch/upload
        setUploadError('');
        if (isMask) {
            // Mask canvas: no dialog; support Shift for one-shot
            if (isOneShot(e)) {
                await uploadFromPhotoshop(true, 'canvas', undefined, targetIndex);
                return;
            }
            if (forceOneShot) {
                await uploadFromPhotoshop(true, 'canvas', undefined, targetIndex);
                return;
            }
            const isActiveAuto = images[0]?.auto && (
                firstSourceInfo.type === 'photoshop_mask' && firstSourceInfo.maskParams?.content === 'canvas'
            );
            if (isActiveAuto) {
                if (images[0]) {
                    if (typeof targetIndex === 'number' && maxCount > 1) {
                        const next = [...imagesRef.current];
                        next[targetIndex] = { ...next[targetIndex], auto: false } as ImageDetail;
                        setImages(next);
                    } else {
                        setImages([{ ...images[0], auto: false }]);
                    }
                }
                stopAutoThumbnail('mask', 'canvas');
                await uploadFromPhotoshop(true, 'canvas', undefined, targetIndex);
            } else {
                setAutoMode('mask', 'canvas');
                startAutoThumbnail('mask', 'canvas');
            }
            return;
        }

        // Image canvas: support Shift for one-shot, Alt for crop negative
        if (isOneShot(e)) {
            await uploadFromPhotoshop(false, 'canvas', undefined, targetIndex);
            return;
        }
        if (forceOneShot) {
            await uploadFromPhotoshop(false, 'canvas', undefined, targetIndex);
            return;
        }
        if (e?.altKey) {
            await uploadFromPhotoshop(false, 'canvas', true, targetIndex);
            return;
        } else {
            const isActiveAuto = images[0]?.auto && (
                firstSourceInfo.type === 'photoshop_image' && firstSourceInfo.params?.content === 'canvas'
            );
            if (isActiveAuto) {
                if (images[0]) {
                    if (typeof targetIndex === 'number' && maxCount > 1) {
                        const next = [...imagesRef.current];
                        next[targetIndex] = { ...next[targetIndex], auto: false } as ImageDetail;
                        setImages(next);
                    } else {
                        setImages([{ ...images[0], auto: false }]);
                    }
                }
                stopAutoThumbnail('image', 'canvas');
                await uploadFromPhotoshop(false, 'canvas', undefined, targetIndex);
            } else {
                setAutoMode('image', 'canvas');
                startAutoThumbnail('image', 'canvas');
            }
        }
    }, [uploadFromPhotoshopViaDialog, uploadFromPhotoshop, isMask, setAutoMode, images, firstSourceInfo, callOnValueChange]);

    const handleCurLayerAdd = useCallback(async (e?: React.MouseEvent) => {
        setUploadError('');
        // Shift-click: fetch once without toggling auto
        if (isOneShot(e)) {
            await uploadFromPhotoshop(isMask, 'curlayer', undefined, targetIndex);
            return;
        }
        if (forceOneShot) {
            await uploadFromPhotoshop(isMask, 'curlayer', undefined, targetIndex);
            return;
        }
        if (e?.altKey) {
            await uploadFromPhotoshop(isMask, 'curlayer', true, targetIndex);
            return;
        } else {
            const isActiveAuto = images[0]?.auto && (
                (isMask && firstSourceInfo.type === 'photoshop_mask' && firstSourceInfo.maskParams?.content === 'curlayer') ||
                (!isMask && firstSourceInfo.type === 'photoshop_image' && firstSourceInfo.params?.content === 'curlayer')
            );
            if (isActiveAuto) {
                if (images[0]) {
                    if (typeof targetIndex === 'number' && maxCount > 1) {
                        const next = [...imagesRef.current];
                        next[targetIndex] = { ...next[targetIndex], auto: false } as ImageDetail;
                        setImages(next);
                    } else {
                        setImages([{ ...images[0], auto: false }]);
                    }
                }
                stopAutoThumbnail(isMask ? 'mask' : 'image', 'curlayer');
                await uploadFromPhotoshop(isMask, 'curlayer', undefined, targetIndex);
            } else {
                setAutoMode(isMask ? 'mask' : 'image', 'curlayer');
                startAutoThumbnail(isMask ? 'mask' : 'image', 'curlayer');
            }
        }
    }, [uploadFromPhotoshopViaDialog, uploadFromPhotoshop, isMask, setAutoMode, images, firstSourceInfo, callOnValueChange]);

    const handleSelectionAdd = useCallback(async (e?: React.MouseEvent) => {
        setUploadError('');
        // Shift-click: fetch once without toggling auto
        if (isOneShot(e)) {
            await uploadFromPhotoshop(isMask, 'selection', undefined, targetIndex);
            return;
        }
        if (forceOneShot) {
            await uploadFromPhotoshop(isMask, 'selection', undefined, targetIndex);
            return;
        }
        if (e?.altKey) {
            await uploadFromPhotoshop(isMask, 'selection', true, targetIndex);
            return;
        } else {
            const isActiveAuto = images[0]?.auto && (
                (isMask && firstSourceInfo.type === 'photoshop_mask' && firstSourceInfo.maskParams?.content === 'selection') ||
                (!isMask && firstSourceInfo.type === 'photoshop_image' && firstSourceInfo.params?.content === 'selection')
            );
            if (isActiveAuto) {
                if (images[0]) {
                    if (typeof targetIndex === 'number' && maxCount > 1) {
                        const next = [...imagesRef.current];
                        next[targetIndex] = { ...next[targetIndex], auto: false } as ImageDetail;
                        setImages(next);
                    } else {
                        setImages([{ ...images[0], auto: false }]);
                    }
                }
                stopAutoThumbnail(isMask ? 'mask' : 'image', 'selection');
                await uploadFromPhotoshop(isMask, 'selection', undefined, targetIndex);
            } else {
                setAutoMode(isMask ? 'mask' : 'image', 'selection');
                startAutoThumbnail(isMask ? 'mask' : 'image', 'selection');
            }
        }
    }, [uploadFromPhotoshopViaDialog, uploadFromPhotoshop, isMask, setAutoMode, images, firstSourceInfo, callOnValueChange]);

    // No separate remove button for masks; Canvas button replaces it
    const shouldShowRemove = showInlineRemove && (isMask ? false : (maxCount > 1 || enableRemove === true));

    // Disable upload buttons when maxCount <= 1 and uploading
    const shouldDisableUpload = maxCount <= 1 && (uploadState.uploading || isUploading);

    const cropHint = t('image.upload.tooltip.alt.crop', { defaultValue: '+Alt crop by selection' });
    const reverseHint = t('image.upload.tooltip.alt.reverse', { defaultValue: '+Alt reversed mask' });
    const shiftOnceHint = t('image.upload.tooltip.shift.once', { defaultValue: 'Shift to fetch once' });
    const renderTooltip = (primary: string, hint: string) => (
        <div>
            <div>{primary}</div>
            <div style={{ marginTop: 2, color: 'var(--sdppp-host-text-color-secondary)' }}>{hint}</div>
            <div style={{ marginTop: 2, color: 'var(--sdppp-host-text-color-secondary)' }}>{shiftOnceHint}</div>
        </div>
    );

    // Active state helpers for icon + type
    // 在多图模式下使用imagesRef.current[targetIndex]，单图模式下使用images[0]
    const targetImage = (maxCount > 1 && typeof targetIndex === 'number')
        ? imagesRef.current[targetIndex]
        : images[0];
    const targetSourceInfo = useSourceInfo(targetImage?.source || '');

    const isActiveCanvas = targetImage?.auto && (
        (isMask && targetSourceInfo.type === 'photoshop_mask' && targetSourceInfo.maskParams?.content === 'canvas') ||
        (!isMask && targetSourceInfo.type === 'photoshop_image' && targetSourceInfo.params?.content === 'canvas')
    );
    const isActiveCurLayer = targetImage?.auto && (
        (isMask && targetSourceInfo.type === 'photoshop_mask' && targetSourceInfo.maskParams?.content === 'curlayer') ||
        (!isMask && targetSourceInfo.type === 'photoshop_image' && targetSourceInfo.params?.content === 'curlayer')
    );
    const isActiveSelection = targetImage?.auto && (
        (isMask && targetSourceInfo.type === 'photoshop_mask' && targetSourceInfo.maskParams?.content === 'selection') ||
        (!isMask && targetSourceInfo.type === 'photoshop_image' && targetSourceInfo.params?.content === 'selection')
    );

    const iconFor = (content: 'canvas' | 'curlayer' | 'selection') => {
        const active = content === 'canvas' ? isActiveCanvas : content === 'curlayer' ? isActiveCurLayer : isActiveSelection;
        return active ? <CheckSquareFilled /> : <BorderOutlined />;
    };

    return (
        <>
            <Row gutter={[4, 6]} className="button-group-row" wrap={false}>
                {isMask ? (
                    <>
                        <Col flex="1">
                            <Tooltip {...tooltipProps} title={renderTooltip(t('image.upload.tooltip.mask.curlayer', { defaultValue: 'Get mask from Photoshop (Current Layer)' }), reverseHint)}>
                                <Button
                                    icon={iconFor('curlayer')}
                                    onClick={handleCurLayerAdd}
                                    disabled={shouldDisableUpload}
                                    type={isActiveCurLayer ? 'primary' : undefined}
                                >
                                    {t('image.upload.from_curlayer', { defaultMessage: 'Current Layer' })}
                                </Button>
                            </Tooltip>
                        </Col>
                        <Col flex="1">
                            <Tooltip {...tooltipProps} title={renderTooltip(t('image.upload.tooltip.mask.selection', { defaultValue: 'Get mask from Photoshop (Selection)' }), reverseHint)}>
                                <Button
                                    icon={iconFor('selection')}
                                    onClick={handleSelectionAdd}
                                    disabled={shouldDisableUpload}
                                    type={isActiveSelection ? 'primary' : undefined}
                                >
                                    {t('image.upload.from_selection', { defaultMessage: 'Selection' })}
                                </Button>
                            </Tooltip>
                        </Col>
                        <Col flex="1">
                            <Button
                                onClick={handleCanvasAdd}
                                disabled={shouldDisableUpload}
                            >
                                {t('image.upload.from_canvas', { defaultMessage: 'Canvas' })}
                            </Button>
                        </Col>
                    </>
                ) : (
                    <>
                        <Col flex="1">
                            <Tooltip {...tooltipProps} title={renderTooltip(t('image.upload.tooltip.image.canvas', { defaultValue: 'Get image from Photoshop (Canvas)' }), cropHint)}>
                                <Button
                                    icon={iconFor('canvas')}
                                    onClick={handleCanvasAdd}
                                    disabled={shouldDisableUpload}
                                    type={isActiveCanvas ? 'primary' : undefined}
                                >
                                    {t('image.upload.from_canvas', { defaultMessage: 'Canvas' })}
                                </Button>
                            </Tooltip>
                        </Col>
                        <Col flex="1">
                            <Tooltip {...tooltipProps} title={renderTooltip(t('image.upload.tooltip.image.curlayer', { defaultValue: 'Get image from Photoshop (Current Layer)' }), cropHint)}>
                                <Button
                                    icon={iconFor('curlayer')}
                                    onClick={handleCurLayerAdd}
                                    disabled={shouldDisableUpload}
                                    type={isActiveCurLayer ? 'primary' : undefined}
                                >
                                    {t('image.upload.from_curlayer', { defaultMessage: 'Current Layer' })}
                                </Button>
                            </Tooltip>
                        </Col>
                        <Col flex="1">
                            <Upload {...uploadProps} disabled={shouldDisableUpload}>
                                <Button icon={<UploadOutlined />} disabled={shouldDisableUpload}>{t('image.upload.from_harddisk', { defaultMessage: 'Hard Disk' })}</Button>
                            </Upload>
                        </Col>
                    </>
                )}
                {shouldShowRemove && (images.length > 0 || uploadState.uploading || isUploading) && (
                    <Col className="remove-col" flex="0 0 auto">
                        <Tooltip {...tooltipProps} title={tooltipTitles.clear}>
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
            {/* Loading and error indicators moved to bottom of parent components */}
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
