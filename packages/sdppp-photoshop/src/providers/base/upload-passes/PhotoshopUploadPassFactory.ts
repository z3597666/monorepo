import { v4 as uuidv4 } from 'uuid';
import { sdpppSDK } from '../../../sdk/sdppp-ps-sdk';
import type { UploadPass, ImageDetail } from '../../../tsx/widgetable/context';
import type { PhotoshopParams, PhotoshopMaskParams } from '../types';

/**
 * Photoshop 上传通道工厂
 * 负责创建 Photoshop 特定的上传通道
 */
export class PhotoshopUploadPassFactory {
    /**
     * 创建图片上传通道
     */
    static createImageUploadPass(
        params: PhotoshopParams,
        onImageUpdate?: (updatedImage: ImageDetail) => void,
        currentImage?: ImageDetail
    ): UploadPass {
        return {
            getUploadFile: async (signal?: AbortSignal) => {
                // 检查是否已取消
                if (signal?.aborted) {
                    throw new DOMException('Upload aborted', 'AbortError');
                }

                // 调用 Photoshop SDK 获取图片
                const result = await sdpppSDK.plugins.photoshop.doGetImage({
                    content: params.content || 'canvas',
                    boundary: params.boundary || 'canvas',
                    imageSize: params.imageSize || 1024,
                    imageQuality: params.imageQuality || 1,
                    cropBySelection: params.cropBySelection || 'no'
                });

                // 再次检查是否已取消
                if (signal?.aborted) {
                    throw new DOMException('Upload aborted', 'AbortError');
                }

                // 如果有图片更新回调，先更新缩略图
                if (onImageUpdate && currentImage && result.thumbnail_url) {
                    const updatedImage: ImageDetail = {
                        ...currentImage,
                        thumbnail: result.thumbnail_url,
                        // 保持其他属性不变
                    };
                    onImageUpdate(updatedImage);
                }

                return { 
                    type: 'token' as const, 
                    tokenOrBuffer: result.file_token || '', 
                    fileName: `${uuidv4()}.png` 
                };
            },

            onUploaded: async (fileURL: string, signal?: AbortSignal) => {
                // 检查是否已取消
                if (signal?.aborted) {
                    return;
                }

                // 更新图片的最终 URL
                if (onImageUpdate && currentImage) {
                    const updatedImage: ImageDetail = {
                        ...currentImage,
                        url: fileURL,
                        // 保持 maintainUploadPass 和其他属性
                    };
                    onImageUpdate(updatedImage);
                }
            },

            onUploadError: (error: Error) => {
                // 错误处理 - 可以在这里添加日志或其他处理
                if (error.name !== 'AbortError') {
                    console.error('Photoshop image upload failed:', error);
                }
            }
        };
    }

    /**
     * 创建蒙版上传通道
     */
    static createMaskUploadPass(
        params: PhotoshopMaskParams,
        onImageUpdate?: (updatedImage: ImageDetail) => void,
        currentImage?: ImageDetail
    ): UploadPass {
        return {
            getUploadFile: async (signal?: AbortSignal) => {
                // 检查是否已取消
                if (signal?.aborted) {
                    throw new DOMException('Upload aborted', 'AbortError');
                }

                // 调用 Photoshop SDK 获取蒙版
                const result = await sdpppSDK.plugins.photoshop.doGetMask({
                    content: params.content as 'canvas' | 'curlayer' | 'selection' || 'curlayer',
                    reverse: params.reverse || false,
                    imageSize: params.imageSize || 1024
                });

                // 再次检查是否已取消
                if (signal?.aborted) {
                    throw new DOMException('Upload aborted', 'AbortError');
                }

                // 如果有图片更新回调，先更新缩略图
                if (onImageUpdate && currentImage && result.thumbnail_url) {
                    const updatedImage: ImageDetail = {
                        ...currentImage,
                        thumbnail: result.thumbnail_url,
                    };
                    onImageUpdate(updatedImage);
                }

                return { 
                    type: 'token' as const, 
                    tokenOrBuffer: result.file_token || '', 
                    fileName: `${uuidv4()}.png` 
                };
            },

            onUploaded: async (fileURL: string, signal?: AbortSignal) => {
                // 检查是否已取消
                if (signal?.aborted) {
                    return;
                }

                // 更新图片的最终 URL
                if (onImageUpdate && currentImage) {
                    const updatedImage: ImageDetail = {
                        ...currentImage,
                        url: fileURL,
                    };
                    onImageUpdate(updatedImage);
                }
            },

            onUploadError: (error: Error) => {
                // 错误处理
                if (error.name !== 'AbortError') {
                    console.error('Photoshop mask upload failed:', error);
                }
            }
        };
    }
}