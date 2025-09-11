import React, { useMemo } from 'react';
import { Switch, Tooltip } from 'antd';
import { ThunderboltFilled, ThunderboltOutlined } from '@ant-design/icons';
import { useTranslation } from '@sdppp/common/i18n/react';
import type { 
    RenderImageMetadataFunction, 
    RenderImageMetadataParams
} from '../../../tsx/widgetable/context';
import type { SourceInfo } from '../types';
import { UploadPassResolver } from '../upload-passes/UploadPassResolver';

export const photoshopRenderImageMetadata: RenderImageMetadataFunction = ({
    image, onImageUpdate, displayMode = 'single'
}: RenderImageMetadataParams) => {
    const { t } = useTranslation();
    const sourceInfo = useMemo(() => UploadPassResolver.getSourceInfo(image.source), [image.source]);

    const displayText = useMemo(() => {
        if (sourceInfo.type === 'disk') {
            return `${t('source.source')}：${t('source.disk')}`;
        }

        if (sourceInfo.type === 'remote') {
            return `${t('source.source')}：${t('source.remote')}`;
        }

        if (sourceInfo.type === 'unknown') {
            return `${t('source.source')}：${t('source.unknown')}`;
        }

        if (sourceInfo.type === 'photoshop_image') {
            const params = sourceInfo.params;
            const contentMap: Record<string, string> = {
                'canvas': t('source.canvas'),
                'curlayer': t('source.current_layer'),
                'selection': t('source.selection')
            };
            const boundaryMap: Record<string, string> = {
                'canvas': t('source.canvas'),
                'curlayer': t('source.current_layer'),
                'selection': t('source.selection')
            };

            const boundaryText = params?.boundary ? `${t('source.boundary')}：${boundaryMap[params.boundary] || params.boundary}` : '';
            const contentText = params?.content ? `${t('source.content')}：${contentMap[params.content] || params.content}` : '';

            // 添加额外的信息如果存在
            const extras: string[] = [];
            if (params?.imageSize) extras.push(`${params.imageSize}px`);
            if (params?.imageQuality && params.imageQuality !== 1) extras.push(t('source.quality_percent', { percent: Math.round(params.imageQuality * 100) }));
            if (params?.cropBySelection && params.cropBySelection !== 'no') {
                const cropMap: Record<string, string> = {
                    'positive': t('source.crop.positive'),
                    'negative': t('source.crop.negative')
                };
                extras.push(cropMap[params.cropBySelection] || params.cropBySelection);
            }

            const baseText = `${t('source.source')}：${t('source.ps_image')}\n${contentText}\n${boundaryText}`;
            return extras.length > 0 ? `${baseText}\n(${extras.join(', ')})` : baseText;
        }

        if (sourceInfo.type === 'photoshop_mask') {
            const maskParams = sourceInfo.maskParams;
            const contentMap: Record<string, string> = {
                'canvas': t('source.canvas'),
                'curlayer': t('source.current_layer'),
                'selection': t('source.selection')
            };

            const contentText = maskParams?.content ? `${t('source.mask')}：${contentMap[maskParams.content] || maskParams.content}` : '';

            // 添加额外的信息如果存在
            const extras: string[] = [];
            if (maskParams?.imageSize) extras.push(`${maskParams.imageSize}px`);
            if (maskParams?.reverse !== undefined) extras.push(maskParams.reverse ? t('source.reverse') : '');

            const baseText = `${t('source.source')}：${t('source.ps_mask')}\n${contentText}`;
            return extras.length > 0 ? `${baseText}\n(${extras.join(', ')})` : baseText;
        }

        return image.source;
    }, [sourceInfo, image.source, t]);

    const handleAutoToggle = (checked: boolean) => {
        if (onImageUpdate) {
            const updatedImage = {
                ...image,
                maintainUploadPass: checked,
                uploadPassId: image.uploadPassId || UploadPassResolver.generateUploadPassId(image.source)
            };
            onImageUpdate(updatedImage);
        }
    };

    const isPSSource = sourceInfo.type === 'photoshop_image' || sourceInfo.type === 'photoshop_mask';

    return (
        <div className="image-info-panel">
            <div className="info-details">
                <span style={{
                    fontSize: '10px',
                    color: 'var(--sdppp-host-text-color-secondary)',
                    whiteSpace: 'pre-line'
                }}>
                    {displayText}
                </span>
            </div>
            {isPSSource && displayMode === 'single' && (
                <div className="info-actions">
                    <Tooltip title={t('image.auto_refetch')}>
                        <Switch
                            style={{ width: '100%' }}
                            checked={image.maintainUploadPass || false}
                            onChange={handleAutoToggle}
                            checkedChildren={<ThunderboltFilled />}
                            unCheckedChildren={<ThunderboltOutlined />}
                        />
                    </Tooltip>
                </div>
            )}
        </div>
    );
};