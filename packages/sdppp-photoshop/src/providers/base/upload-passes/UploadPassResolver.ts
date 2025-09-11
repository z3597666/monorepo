import { PhotoshopUploadPassFactory } from './PhotoshopUploadPassFactory';
import type { UploadPass, ImageDetail } from '../../../tsx/widgetable/context';
import type { SourceInfo } from '../types';

/**
 * 解析源信息的工具函数
 * 从 source-render.tsx 中提取的逻辑
 */
function parseSourceInfo(source: string): SourceInfo {
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
        return { type: 'disk' };
    }

    if (source === 'remote') {
        return { type: 'remote' };
    }

    // 默认返回
    return { type: 'unknown' };
}

/**
 * UploadPass 解析器
 * 负责根据图片源信息创建对应的上传通道
 */
export class UploadPassResolver {
    /**
     * 根据图片源信息创建 UploadPass
     */
    static createUploadPassFromSource(
        source: string,
        onImageUpdate?: (updatedImage: ImageDetail) => void,
        currentImage?: ImageDetail
    ): UploadPass {
        const sourceInfo = parseSourceInfo(source);

        switch (sourceInfo.type) {
            case 'photoshop_image':
                if (!sourceInfo.params) {
                    throw new Error('Missing Photoshop image parameters');
                }
                return PhotoshopUploadPassFactory.createImageUploadPass(
                    sourceInfo.params,
                    onImageUpdate,
                    currentImage
                );

            case 'photoshop_mask':
                if (!sourceInfo.maskParams) {
                    throw new Error('Missing Photoshop mask parameters');
                }
                return PhotoshopUploadPassFactory.createMaskUploadPass(
                    sourceInfo.maskParams,
                    onImageUpdate,
                    currentImage
                );

            case 'disk':
                // 磁盘文件不支持自动上传通道
                throw new Error('Disk files do not support upload passes');

            case 'remote':
                // 远程文件不支持自动上传通道
                throw new Error('Remote files do not support upload passes');

            case 'unknown':
            default:
                throw new Error(`Unsupported source type for upload pass: ${source}`);
        }
    }

    /**
     * 检查源是否支持上传通道
     */
    static canCreateUploadPass(source: string): boolean {
        const sourceInfo = parseSourceInfo(source);
        return sourceInfo.type === 'photoshop_image' || sourceInfo.type === 'photoshop_mask';
    }

    /**
     * 获取源信息（用于外部组件）
     */
    static getSourceInfo(source: string): SourceInfo {
        return parseSourceInfo(source);
    }

    /**
     * 生成上传通道 ID
     * 基于源信息生成唯一的通道标识
     */
    static generateUploadPassId(source: string): string {
        const sourceInfo = parseSourceInfo(source);

        switch (sourceInfo.type) {
            case 'photoshop_image':
                const params = sourceInfo.params!;
                return `ps-image-${params.content}-${params.boundary}-${params.cropBySelection || 'no'}`;

            case 'photoshop_mask':
                const maskParams = sourceInfo.maskParams!;
                return `ps-mask-${maskParams.content}-${maskParams.reverse ? 'reverse' : 'normal'}-${maskParams.imageSize || 1024}`;

            default:
                // 对于不支持的类型，返回基于 source 的简单 ID
                return `unsupported-${btoa(source).replace(/[/+=]/g, '')}`;
        }
    }
}