import React, { useMemo } from 'react';

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

    const displayText = useMemo(() => {
        if (sourceInfo.type === 'disk') {
            return '来源：磁盘';
        }

        if (sourceInfo.type === 'remote') {
            return '来源：远端';
        }

        if (sourceInfo.type === 'unknown') {
            return '来源：未知';
        }

        if (sourceInfo.type === 'photoshop_image') {
            const params = sourceInfo.params;
            const contentMap: Record<string, string> = {
                'canvas': '内容：整个画布',
                'curlayer': '内容：当前图层',
                'selection': '内容：选区'
            };
            const boundaryMap: Record<string, string> = {
                'canvas': '范围：整个画布',
                'curlayer': '范围：当前图层',
                'selection': '范围：选区'
            };

            const boundaryText = params?.boundary ? boundaryMap[params.boundary] || params.boundary : '';
            const contentText = params?.content ? contentMap[params.content] || params.content : '';

            // 添加额外的信息如果存在
            const extras = [];
            if (params?.imageSize) extras.push(`${params.imageSize}px`);
            if (params?.imageQuality && params.imageQuality !== 1) extras.push(`质量${Math.round(params.imageQuality * 100)}%`);
            if (params?.cropBySelection && params.cropBySelection !== 'no') {
                const cropMap: Record<string, string> = {
                    'positive': '正向裁剪',
                    'negative': '反向裁剪' 
                };
                extras.push(cropMap[params.cropBySelection] || params.cropBySelection);
            }

            const baseText = `来源：PS图片\n${contentText}\n${boundaryText}`;
            return extras.length > 0 ? `${baseText}\n(${extras.join(', ')})` : baseText;
        }

        if (sourceInfo.type === 'photoshop_mask') {
            const maskParams = sourceInfo.maskParams;
            const contentMap: Record<string, string> = {
                'canvas': '遮罩：整个画布',
                'curlayer': '遮罩：当前图层',
                'selection': '遮罩：选区'
            };

            const contentText = maskParams?.content ? contentMap[maskParams.content] || maskParams.content : '';

            // 添加额外的信息如果存在
            const extras = [];
            if (maskParams?.imageSize) extras.push(`${maskParams.imageSize}px`);
            if (maskParams?.reverse !== undefined) extras.push(maskParams.reverse ? '反转' : '');

            const baseText = `来源：PS遮罩\n${contentText}`;
            return extras.length > 0 ? `${baseText}\n(${extras.join(', ')})` : baseText;
        }

        return source;
    }, [sourceInfo, source]);

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