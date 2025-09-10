import React, { useMemo } from 'react';
import { useTranslation } from '@sdppp/common/i18n/react';

interface SourceRenderProps {
    source: string;
}

export interface PhotoshopParams {
    content?: 'canvas' | 'curlayer' | 'selection';
    boundary?: 'canvas' | 'curlayer' | 'selection';
    imageSize?: number;
    imageQuality?: number;
    cropBySelection?: 'no' | 'positive' | 'negative';
}

export interface PhotoshopMaskParams {
    content?: 'canvas' | 'curlayer' | 'selection';
    reverse?: boolean;
    imageSize?: number;
}

interface SourceInfo {
    type: 'remote' | 'disk' | 'photoshop_image' | 'photoshop_mask' | 'unknown';
    params?: PhotoshopParams;
    maskParams?: PhotoshopMaskParams;
}

export function useSourceInfo(source: string): SourceInfo {
    return useMemo(() => {
        // 尝试解析 JSON 格式的 doGetImage 参数
        try {
            const parsed = JSON.parse(source);
            if (parsed && typeof parsed === 'object' && parsed.content && parsed.boundary) {
                return {
                    type: 'photoshop_image',
                    params: {
                        content: parsed.content,
                        boundary: parsed.boundary,
                        imageSize: parsed.imageSize,
                        imageQuality: parsed.imageQuality,
                        cropBySelection: parsed.cropBySelection
                    }
                };
            }
            if (parsed && typeof parsed === 'object' && parsed.content && parsed.reverse !== undefined) { // mask
                return {
                    type: 'photoshop_mask',
                    maskParams: {
                        content: parsed.content,
                        reverse: parsed.reverse,
                        imageSize: parsed.imageSize
                    }
                };
            }
        } catch (e) {
            // JSON 解析失败，继续使用原有逻辑
        }

        // 处理简单的 source 值
        if (source === 'disk') {
            return {
                type: 'disk'
            };
        }

        if (source === 'remote') {
            return {
                type: 'remote'
            };
        }

        // 默认返回
        return {
            type: 'unknown'
        };
    }, [source]);
}

export const SourceRender: React.FC<SourceRenderProps> = ({ source }) => {
    const sourceInfo = useSourceInfo(source);
    const { t } = useTranslation();

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

        return source;
    }, [sourceInfo, source, t]);

    return (
        <span style={{
            fontSize: '10px',
            color: 'var(--sdppp-host-text-color-secondary)',
            whiteSpace: 'pre-line'
        }}>
            {displayText}
        </span>
    );
};