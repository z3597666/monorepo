import { useCallback } from 'react';
import { v4 } from 'uuid';
import { ImageDetail, UploadState } from './types';
import { sdpppSDK } from '@sdppp/common';

/**
 * Unified function for getting images from Photoshop with proper boundary handling
 * This function should be used by all upload implementations to ensure consistency
 */
export const getPhotoshopImage = async (
    isMask = false,
    source: 'canvas' | 'curlayer' | 'selection',
    reverse?: boolean
) => {
    // verbose log removed

    let thumbnail_url: string, file_token: string, imageSource: string, result: any;

    if (isMask) {
        // verbose log removed
        // 使蒙版获取与图片获取一致地尊重 WorkBoundary
        const activeDocumentID = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
        const webviewState: any = sdpppSDK.stores.WebviewStore.getState();
        const workBoundaries = webviewState.workBoundaries;
        const workBoundaryMaxSizes = (webviewState as any).workBoundaryMaxSizes || {};
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
            boundaryParam = boundary;
        }

        const maskParams: any = {
            content: source,
            reverse: !!reverse,
            imageSize: workBoundaryMaxSizes[activeDocumentID] || sdpppSDK.stores.PhotoshopStore.getState().sdpppX['settings.imaging.defaultImagesSizeLimit'],
            // Always include boundary; default to 'canvas' if undefined
            boundary: boundaryParam as any
        };

        result = await sdpppSDK.plugins.photoshop.getMask(maskParams as any);


        thumbnail_url = result.thumbnail_url;
        file_token = result.file_token;
        imageSource = result.source;
    } else {
        // verbose log removed
        // 获取WorkBoundary组件维护的boundary信息
        const activeDocumentID = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
        const webviewState: any = sdpppSDK.stores.WebviewStore.getState();
        const workBoundaries = webviewState.workBoundaries;
        const workBoundaryMaxSizes = (webviewState as any).workBoundaryMaxSizes || {};
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
            imageSize: workBoundaryMaxSizes[activeDocumentID] || sdpppSDK.stores.PhotoshopStore.getState().sdpppX['settings.imaging.defaultImagesSizeLimit'],
            // For image fetch, interpret reverse=true as cropBySelection negative (Shift behavior)
            cropBySelection: reverse ? 'negative' : 'no'
        };

        result = await sdpppSDK.plugins.photoshop.getImage(getImageParams);

        // Debug log for getImage result
        sdpppSDK.logger('getImage result:', {
            thumbnail_url: result.thumbnail_url,
            file_token: result.file_token,
            source: result.source,
            error: result.error,
            fullResult: result
        });

        thumbnail_url = result.thumbnail_url;
        file_token = result.file_token;
        imageSource = result.source;
    }

    return { thumbnail_url, file_token, source: imageSource, result };
};

/**
 * Open Photoshop dialog (selectImage/selectMask) first, then fetch via getImage/getMask
 */
export const getPhotoshopImageViaDialog = async (
    isMask = false,
    source: 'canvas' | 'curlayer' | 'selection' = 'canvas'
) => {
    let thumbnail_url: string, file_token: string, imageSource: string, result: any;

    if (isMask) {
        const selection = source === 'selection'
            ? await sdpppSDK.plugins.photoshop.selectSelectionMask({})
            : await sdpppSDK.plugins.photoshop.selectLayerMask({});
        if (!selection || (selection as any).cancelled) {
            throw new Error('canceled');
        }
        const getMaskParams = (selection as any).getMaskParams || {};
        const maskResult = await sdpppSDK.plugins.photoshop.getMask(getMaskParams);
        thumbnail_url = maskResult.thumbnail_url;
        file_token = maskResult.file_token;
        imageSource = (selection as any).source;
        result = maskResult;
    } else {
        const selection = source === 'canvas'
            ? await sdpppSDK.plugins.photoshop.selectCanvasImage({})
            : await sdpppSDK.plugins.photoshop.selectLayerImage({});
        if (!selection || (selection as any).cancelled) {
            throw new Error('canceled');
        }
        const getImageParams = (selection as any).getImageParams || {};
        const imageResult = await sdpppSDK.plugins.photoshop.getImage(getImageParams);
        thumbnail_url = imageResult.thumbnail_url;
        file_token = imageResult.file_token;
        imageSource = (selection as any).source;
        result = imageResult;
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
    const uploadFromPhotoshopViaDialog = useCallback(async (isMask = false, source: 'canvas' | 'curlayer' | 'selection' = 'canvas', targetIndex?: number) => {
        const originalImages = [...originalImagesRef.current];
        try {
            setUploadState(prev => ({ ...prev, uploadError: '' }));

            const { thumbnail_url, file_token, source: imageSource, result } = await getPhotoshopImageViaDialog(isMask, source);

            if (result?.error) {
                sdpppSDK.logger('Dialog API returned error:', result.error);
                onSetImages(originalImages);
                setUploadState(prev => ({ ...prev, uploadError: `获取图片失败: ${result.error}` }));
                return;
            }

            if (!thumbnail_url || !imageSource) {
                onSetImages(originalImages);
                setUploadState(prev => ({ ...prev, uploadError: `无法获取图片内容 - 请检查图层是否有可见内容` }));
                return;
            }

            const uploadId = v4();

            const markSourceType = (source: string | undefined, type: 'image' | 'mask') => {
                try {
                    const parsed = source ? JSON.parse(source) : {};
                    return JSON.stringify({ ...parsed, __psType: type });
                } catch {
                    return JSON.stringify({ __psType: type, raw: source || '' });
                }
            };
            const displaySource = isMask ? markSourceType(imageSource, 'mask') : markSourceType(imageSource, 'image');
            const thumbnailImages = [{
                url: thumbnail_url,
                source: displaySource,
                thumbnail: thumbnail_url,
                uploadId,
                isUploading: true
            }];

            setUploadState(prev => ({
                ...prev,
                currentThumbnail: thumbnail_url,
                currentThumbnails: {
                    ...(prev.currentThumbnails || {}),
                    [uploadId]: thumbnail_url
                }
            }));

            let nextImages: ImageDetail[];
            if (typeof targetIndex === 'number' && maxCount > 1) {
                nextImages = [...originalImages];
                while (nextImages.length <= targetIndex) nextImages.push({ url: '', source: '', thumbnail: '' } as any);
                nextImages[targetIndex] = thumbnailImages[0];
                sdpppSDK.logger('Thumbnail stage targeting', { targetIndex, nextImagesLength: nextImages.length });
            } else {
                nextImages = maxCount > 1 ? [...originalImages, ...thumbnailImages] : thumbnailImages;
            }
            onSetImages(nextImages);
            originalImagesRef.current = nextImages;

            await runUploadPassOnce({
                getUploadFile: async (signal?: AbortSignal) => {
                    incrementUploadCount();
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }
                    return { type: 'token', tokenOrBuffer: file_token, fileName: `${v4()}.png` };
                },
                onUploaded: async (url: string, signal?: AbortSignal) => {
                    if (signal?.aborted) {
                        return;
                    }
                    const currentImages = [...originalImagesRef.current];
                    const targetIndex = currentImages.findIndex(img => img.uploadId === uploadId);
                    if (targetIndex !== -1) {
                        currentImages[targetIndex] = {
                            url,
                            source: displaySource,
                            // 对于 mask，使用最终 URL 作为缩略图，避免黑色缩略图影响预览
                            thumbnail: isMask ? url : thumbnail_url,
                            isUploading: false
                        };
                        originalImagesRef.current = currentImages;
                        onCallOnValueChange(currentImages);
                        if (isMask) {
                            setUploadState(prev => ({
                                ...prev,
                                currentThumbnail: url,
                                currentThumbnails: {
                                    ...(prev.currentThumbnails || {}),
                                    [uploadId]: url
                                }
                            }));
                        }
                    } else {
                        const newImages = [{ url, source: displaySource, thumbnail: isMask ? url : thumbnail_url, isUploading: false }];
                        handleImagesChange(newImages);
                        if (isMask) {
                            setUploadState(prev => ({ ...prev, currentThumbnail: url }));
                        }
                    }
                    decrementUploadCount();
                    await new Promise(resolve => setTimeout(resolve, 100));
                },
                onUploadError: (error: Error) => {
                    if (error.name !== 'AbortError') {
                        onSetImages(originalImages);
                    }
                    decrementUploadCount();
                    setUploadState(prev => ({ ...prev, uploadError: error.name === 'AbortError' ? '' : error.message }));
                }
            });
        } catch (error: any) {
            if (error?.message === 'canceled') {
                // silently ignore cancel
                return;
            }
            onSetImages(originalImages);
            setUploadState(prev => ({ ...prev, uploading: false, uploadError: error.message }));
        }
    }, [runUploadPassOnce, onSetImages, handleImagesChange, maxCount]);
    const uploadFromPhotoshop = useCallback(async (isMask = false, source: 'canvas' | 'curlayer' | 'selection', reverse?: boolean, targetIndex?: number) => {
        // verbose log removed
        // 保存原始images状态，用当前最新状态
        const originalImages = [...originalImagesRef.current];
        // verbose log removed

        try {
            setUploadState(prev => ({ ...prev, uploadError: '' }));

            // verbose log removed
            const { thumbnail_url, file_token, source: imageSource, result } = await getPhotoshopImage(isMask, source, reverse);


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

            // 获取到thumbnail时先显示缩略图，添加uploadId标识和上传状态
            // 对于mask，source应该显示为mask相关的信息，而不是JSON字符串
            const markSourceType = (source: string | undefined, type: 'image' | 'mask') => {
                try {
                    const parsed = source ? JSON.parse(source) : {};
                    return JSON.stringify({ ...parsed, __psType: type });
                } catch {
                    return JSON.stringify({ __psType: type, raw: source || '' });
                }
            };
            const displaySource = isMask ? markSourceType(imageSource, 'mask') : markSourceType(imageSource, 'image');
            const thumbnailImages = [{
                url: thumbnail_url,
                source: displaySource,
                thumbnail: thumbnail_url,
                uploadId,
                isUploading: true
            }];

            // 更新本地上传状态中的缩略图，仅使用本地记录供预览展示
            setUploadState(prev => ({
                ...prev,
                currentThumbnail: thumbnail_url,
                currentThumbnails: {
                    ...(prev.currentThumbnails || {}),
                    [uploadId]: thumbnail_url
                }
            }));

            // 对于单图片场景，也要先显示缩略图，然后在上传完成后替换
            // 这样用户就能看到缩略图显示的阶段
            let nextImages: ImageDetail[];
            if (typeof targetIndex === 'number' && maxCount > 1) {
                nextImages = [...originalImages];
                while (nextImages.length <= targetIndex) nextImages.push({ url: '', source: '', thumbnail: '' } as any);
                nextImages[targetIndex] = thumbnailImages[0];
            } else {
                nextImages = maxCount > 1 ? [...originalImages, ...thumbnailImages] : thumbnailImages;
            }

            // (removed verbose debug log)

            onSetImages(nextImages);
            // 立即更新 originalImagesRef 以确保后续操作基于正确的状态
            originalImagesRef.current = nextImages;

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
                    const idx = typeof targetIndex === 'number' ? targetIndex : currentImages.findIndex(img => img.uploadId === uploadId);
                    // (removed verbose debug log)

                    if (idx !== -1) {
                        const finalImage = {
                            url,
                            source: isMask ? markSourceType(imageSource, 'mask') : markSourceType(imageSource, 'image'),
                            thumbnail: thumbnail_url,
                            isUploading: false
                        };
                        currentImages[idx] = finalImage;
                        originalImagesRef.current = currentImages;

                        // (removed verbose debug log)

                        onCallOnValueChange(currentImages);
                    } else {
                        // 如果找不到对应缩略图，降级为追加模式
                        const newImages = [{ url, source: isMask ? markSourceType(imageSource, 'mask') : markSourceType(imageSource, 'image'), thumbnail: thumbnail_url, isUploading: false }];
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

    const uploadFromDisk = useCallback(async (file: File, targetIndex?: number) => {
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
        const thumbnailImages = [{ url: thumbnailURL, source: 'disk', thumbnail: thumbnailURL, uploadId, isUploading: true }];

        // 本地上传（磁盘）也同步记录本地缩略图用于预览
        setUploadState(prev => ({ ...prev, currentThumbnail: thumbnailURL }));

        setUploadState(prev => ({ ...prev, uploadError: '' }));
        // 先显示缩略图，支持多图片
        let nextImages: ImageDetail[];
        if (typeof targetIndex === 'number' && maxCount > 1) {
            nextImages = [...originalImages];
            while (nextImages.length <= targetIndex) nextImages.push({ url: '', source: '', thumbnail: '' } as any);
            nextImages[targetIndex] = thumbnailImages[0];
        } else {
            nextImages = maxCount > 1 ? [...originalImages, ...thumbnailImages] : thumbnailImages;
        }
        onSetImages(nextImages);
        // 立即更新 originalImagesRef 以确保后续操作基于正确的状态
        originalImagesRef.current = nextImages;

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
                    const idx = typeof targetIndex === 'number' ? targetIndex : currentImages.findIndex(img => img.uploadId === uploadId);
                    
                    if (idx !== -1) {
                        // 保持原始缩略图，只更新URL和移除上传状态
                        currentImages[idx] = { url, source: 'disk', thumbnail: thumbnailURL, isUploading: false };
                        originalImagesRef.current = currentImages;
                        onCallOnValueChange(currentImages);
                    } else {
                        // 如果找不到对应缩略图，降级为追加模式
                        const newImages = [{ url, source: 'disk', thumbnail: thumbnailURL, isUploading: false }];
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
        uploadFromPhotoshopViaDialog,
        uploadFromDisk
    };
};
