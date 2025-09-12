import { useCallback } from 'react';
import { v4 } from 'uuid';
import { ImageDetail, UploadState } from './types';
import { sdpppSDK } from '../../../../../sdk/sdppp-ps-sdk';

export const useDirectUpload = (
    originalImagesRef: React.MutableRefObject<ImageDetail[]>,
    incrementUploadCount: () => void,
    decrementUploadCount: () => void,
    setUploadState: React.Dispatch<React.SetStateAction<UploadState>>,
    onSetImages: (images: ImageDetail[]) => void,
    onCallOnValueChange: (images: ImageDetail[]) => void,
    runUploadPassOnce: (pass: any) => Promise<void>,
    handleImagesChange: (images: ImageDetail[]) => void,
    maxCount: number
) => {
    const uploadFromPhotoshop = useCallback(async (isMask = false) => {
        // 保存原始images状态，用当前最新状态
        const originalImages = [...originalImagesRef.current];

        try {
            setUploadState(prev => ({ ...prev, uploadError: '' }));
            
            // 先获取参数，然后用参数调用实际的获取方法
            const paramsResult = isMask
                ? await sdpppSDK.plugins.photoshop.requestMaskGet({ isMask: true })
                : await sdpppSDK.plugins.photoshop.requestImageGet({});
            
            // 使用获取到的参数调用实际的获取方法
            const { thumbnail_url, file_token, source } = isMask
                ? await sdpppSDK.plugins.photoshop.doGetMask((paramsResult as any).getMaskParams)
                : await sdpppSDK.plugins.photoshop.doGetImage((paramsResult as any).getImageParams);

            if (!thumbnail_url || !source) {
                return; // 可能是取消 
            }

            // 为这个上传任务生成唯一ID
            const uploadId = v4();
            
            // 获取到thumbnail时先显示缩略图，添加uploadId标识
            const thumbnailImages = [{ url: thumbnail_url, source, thumbnail: thumbnail_url, uploadId }];
            const tempImages = maxCount > 1 
                ? [...originalImages, ...thumbnailImages]
                : thumbnailImages;
            onSetImages(tempImages);
            // 立即更新 originalImagesRef 以确保后续操作基于正确的状态
            originalImagesRef.current = tempImages;

            await runUploadPassOnce({
                getUploadFile: async (signal?: AbortSignal) => {
                    incrementUploadCount();
                    // Check if already aborted
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }
                    return { type: 'token', tokenOrBuffer: file_token, fileName: `${v4()}.png` };
                },
                onUploaded: async (url, signal?: AbortSignal) => {
                    // Check if already aborted
                    if (signal?.aborted) {
                        return;
                    }

                    // 上传成功后替换对应的缩略图
                    const currentImages = [...originalImagesRef.current];
                    const targetIndex = currentImages.findIndex(img => img.uploadId === uploadId);
                    
                    if (targetIndex !== -1) {
                        // 替换找到的缩略图
                        currentImages[targetIndex] = { url, source, thumbnail: thumbnail_url };
                        originalImagesRef.current = currentImages;
                        onCallOnValueChange(currentImages);
                    } else {
                        // 如果找不到对应缩略图，降级为追加模式
                        const newImages = [{ url, source, thumbnail: thumbnail_url }];
                        handleImagesChange(newImages);
                    }
                    
                    decrementUploadCount();
                    await new Promise(resolve => setTimeout(resolve, 100));
                },
                onUploadError: (error: Error) => {
                    // 上传失败时恢复到原始状态（但取消时不恢复）
                    if (error.name !== 'AbortError') {
                        onSetImages(originalImages);
                    }
                    decrementUploadCount();
                    setUploadState(prev => ({ ...prev, uploadError: error.name === 'AbortError' ? '' : error.message }));
                }
            });
        } catch (error: any) {
            // 获取thumbnail失败时也要恢复原始状态
            onSetImages(originalImages);
            setUploadState(prev => ({ ...prev, uploadError: error.message }));
        }
    }, [runUploadPassOnce, onSetImages, handleImagesChange, maxCount]);

    const uploadFromDisk = useCallback(async (file: File) => {
        // 保存原始images状态，用当前最新状态
        const originalImages = [...originalImagesRef.current];

        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            setUploadState(prev => ({ ...prev, uploadError: '只能上传图片文件！' }));
            return;
        }

        // 为这个上传任务生成唯一ID
        const uploadId = v4();
        
        const thumbnailURL = URL.createObjectURL(file);
        const thumbnailImages = [{ url: thumbnailURL, source: 'disk', thumbnail: thumbnailURL, uploadId }];

        setUploadState(prev => ({ ...prev, uploadError: '' }));
        // 先显示缩略图，支持多图片
        const tempImages = maxCount > 1 
            ? [...originalImages, ...thumbnailImages]
            : thumbnailImages;
        onSetImages(tempImages);
        // 立即更新 originalImagesRef 以确保后续操作基于正确的状态
        originalImagesRef.current = tempImages;

        try {
            await runUploadPassOnce({
                getUploadFile: async (signal?: AbortSignal) => {
                    // Check if already aborted
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }
                    const buffer = await file.arrayBuffer();
                    return { type: 'buffer', tokenOrBuffer: Buffer.from(buffer), fileName: file.name };
                },
                onUploaded: async (url, signal?: AbortSignal) => {
                    // Check if already aborted
                    if (signal?.aborted) {
                        return;
                    }

                    // 上传成功后替换对应的缩略图
                    const currentImages = [...originalImagesRef.current];
                    const targetIndex = currentImages.findIndex(img => img.uploadId === uploadId);
                    
                    if (targetIndex !== -1) {
                        // 替换找到的缩略图
                        currentImages[targetIndex] = { url, source: 'disk', thumbnail: thumbnailURL };
                        originalImagesRef.current = currentImages;
                        onCallOnValueChange(currentImages);
                    } else {
                        // 如果找不到对应缩略图，降级为追加模式
                        const newImages = [{ url, source: 'disk', thumbnail: thumbnailURL }];
                        handleImagesChange(newImages);
                    }
                    
                    decrementUploadCount();
                    await new Promise(resolve => setTimeout(resolve, 100));
                },
                onUploadError: (error: Error) => {
                    // 上传失败时恢复到原始状态（但取消时不恢复）
                    if (error.name !== 'AbortError') {
                        onSetImages(originalImages);
                    }
                    decrementUploadCount();
                    setUploadState(prev => ({ ...prev, uploadError: error.name === 'AbortError' ? '' : error.message }));
                }
            });
        } catch (error: any) {
            // 上传失败时恢复到原始状态
            onSetImages(originalImages);
            setUploadState(prev => ({ ...prev, uploading: false, uploadError: error.message }));
        }
    }, [runUploadPassOnce, onSetImages, handleImagesChange, maxCount]);

    return {
        uploadFromPhotoshop,  
        uploadFromDisk
    };
};