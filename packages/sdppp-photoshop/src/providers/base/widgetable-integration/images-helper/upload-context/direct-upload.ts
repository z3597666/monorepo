import { useCallback } from 'react';
import { v4 } from 'uuid';
import { ImageDetail, UploadState } from './types';
import { sdpppSDK } from '@sdppp/common';

/**
 * Unified function for getting images from Photoshop with proper boundary handling
 * This function should be used by all upload implementations to ensure consistency
 */
export const getPhotoshopImage = async (isMask = false, source: 'canvas' | 'curlayer') => {
    sdpppSDK.logger('getPhotoshopImage called', { isMask, source });

    let thumbnail_url: string, file_token: string, imageSource: string, result: any;

    if (isMask) {
        sdpppSDK.logger('Processing mask upload');
        // Mask模式仍使用原有逻辑
        const paramsResult = await sdpppSDK.plugins.photoshop.requestMaskGet({ isMask: true });
        sdpppSDK.logger('requestMaskGet result', paramsResult);
        result = await sdpppSDK.plugins.photoshop.doGetMask((paramsResult as any).getMaskParams);
        sdpppSDK.logger('doGetMask result', result);
        thumbnail_url = result.thumbnail_url;
        file_token = result.file_token;
        imageSource = result.source;
    } else {
        sdpppSDK.logger('Processing image upload with source:', source);
        // 获取WorkBoundary组件维护的boundary信息
        const activeDocumentID = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
        const workBoundaries = sdpppSDK.stores.WebviewStore.getState().workBoundaries;
        const boundary = workBoundaries[activeDocumentID];

        let boundaryParam: "canvas" | "curlayer" | "selection" | {
            leftDistance: number;
            topDistance: number;
            rightDistance: number;
            bottomDistance: number;
            width: number;
            height: number;
        };
        if (!boundary || (boundary.width >= 999999 && boundary.height >= 999999)) {
            boundaryParam = 'canvas';
        } else { 
            // BoundaryRect format is already correct
            boundaryParam = boundary;
        }

        const getImageParams = {
            content: source,
            boundary: boundaryParam,
            imageSize: 2048,
            cropBySelection: 'no'
        };

        result = await sdpppSDK.plugins.photoshop.getImage(getImageParams);
        thumbnail_url = result.thumbnail_url;
        file_token = result.file_token;
        imageSource = result.source;
    }

    return { thumbnail_url, file_token, source: imageSource, result };
};

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
    const uploadFromPhotoshop = useCallback(async (isMask = false, source: 'canvas' | 'curlayer') => {
        sdpppSDK.logger('uploadFromPhotoshop called', { isMask, source });
        // 保存原始images状态，用当前最新状态
        const originalImages = [...originalImagesRef.current];
        sdpppSDK.logger('originalImages', originalImages);

        try {
            setUploadState(prev => ({ ...prev, uploadError: '' }));
            sdpppSDK.logger('upload state reset, starting upload process');
            const { thumbnail_url, file_token, source: imageSource, result } = await getPhotoshopImage(isMask, source);


            // 检查API是否返回了错误
            if (result.error) {
                sdpppSDK.logger('API returned error:', result.error);
                onSetImages(originalImages);
                setUploadState(prev => ({
                    ...prev,
                    uploadError: `获取图片失败: ${result.error}`
                }));
                return;
            }

            if (!thumbnail_url || !imageSource) {
                sdpppSDK.logger('Missing thumbnail_url or imageSource - thumbnail_url:', thumbnail_url, 'imageSource:', imageSource);
                sdpppSDK.logger('Full result object:', result);

                onSetImages(originalImages);
                setUploadState(prev => ({
                    ...prev,
                    uploadError: `无法获取图片内容 - 请检查图层是否有可见内容`
                }));
                return;
            }

            // 为这个上传任务生成唯一ID
            const uploadId = v4();

            // 获取到thumbnail时先显示缩略图，添加uploadId标识
            const thumbnailImages = [{ url: thumbnail_url, source: imageSource, thumbnail: thumbnail_url, uploadId }];
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
                        sdpppSDK.logger('Upload aborted by signal');
                        throw new DOMException('Upload aborted', 'AbortError');
                    }
                    const uploadFile = { type: 'token', tokenOrBuffer: file_token, fileName: `${v4()}.png` };
                    return uploadFile;
                },
                onUploaded: async (url: string, signal?: AbortSignal) => {
                    // Check if already aborted
                    if (signal?.aborted) {
                        sdpppSDK.logger('Upload aborted by signal in onUploaded');
                        return;
                    }

                    // 上传成功后替换对应的缩略图
                    const currentImages = [...originalImagesRef.current];
                    const targetIndex = currentImages.findIndex(img => img.uploadId === uploadId);

                    if (targetIndex !== -1) {
                        // 替换找到的缩略图
                        const finalImage = { url, source: imageSource, thumbnail: thumbnail_url };
                        currentImages[targetIndex] = finalImage;
                        originalImagesRef.current = currentImages;
                        onCallOnValueChange(currentImages);
                    } else {
                        // 如果找不到对应缩略图，降级为追加模式
                        const newImages = [{ url, source: imageSource, thumbnail: thumbnail_url }];
                        handleImagesChange(newImages);
                    }

                    decrementUploadCount();
                    await new Promise(resolve => setTimeout(resolve, 100));
                },
                onUploadError: (error: Error) => {
                    sdpppSDK.logger('Upload error occurred:', error.name, error.message);
                    // 上传失败时恢复到原始状态（但取消时不恢复）
                    if (error.name !== 'AbortError') {
                        sdpppSDK.logger('Restoring original images due to error');
                        onSetImages(originalImages);
                    }
                    decrementUploadCount();
                    setUploadState(prev => ({ ...prev, uploadError: error.name === 'AbortError' ? '' : error.message }));
                }
            });
        } catch (error: any) {
            sdpppSDK.logger('Caught error in uploadFromPhotoshop:', error);
            sdpppSDK.logger('Error details - name:', error.name, 'message:', error.message, 'stack:', error.stack);
            sdpppSDK.logger('Upload params when error occurred - isMask:', isMask, 'source:', source);

            // 获取thumbnail失败时也要恢复原始状态
            onSetImages(originalImages);
            setUploadState(prev => ({
                ...prev,
                uploadError: `上传失败: ${error.message}. 请检查控制台日志获取详细错误信息`
            }));
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
                onUploaded: async (url: string, signal?: AbortSignal) => {
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