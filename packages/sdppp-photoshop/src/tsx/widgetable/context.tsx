import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createStore } from 'zustand';
import { Button, Upload, Row, Col, Tooltip, Alert, Spin, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, LoadingOutlined, ThunderboltFilled, ThunderboltOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useTranslation } from '@sdppp/common/i18n/react';
import { sdpppSDK } from '../../sdk/sdppp-ps-sdk';

const uploadImageInputSchama = z.object({
    type: z.literal('buffer').or(z.literal('token')),
    tokenOrBuffer: z.any(),
    fileName: z.string()
});
export type UploadPassInput = z.infer<typeof uploadImageInputSchama>

// 定义hook函数的类型
export type UploadPass = {
    getUploadFile: (signal?: AbortSignal) => Promise<UploadPassInput>,
    onUploaded?: (fileURL: string, signal?: AbortSignal) => Promise<void>,
    onUploadError?: (error: any) => void,
};

// Image detail interface
export interface ImageDetail {
    url: string;
    source: string;
    thumbnail?: string;
    auto?: boolean;
    uploadId?: string;
}

// Push options for image upload
export interface PushOptions {
    auto?: boolean;  // Whether to auto upload
    replaceAll?: boolean;  // Whether to replace all images
    appendMode?: boolean;   // Whether to append to existing images
}

// Upload pass config
export interface UploadPassConfig {
    type: 'image' | 'mask';
    source: string;
    config: any; // PhotoshopParams | PhotoshopMaskParams
}

// ActionButton render function parameters
export interface RenderActionButtonsParams {
    // Basic state
    images: ImageDetail[];
    maxCount: number;
    isMask?: boolean;
    
    // Image state callbacks
    onPushThumbnail: (thumbnail: string, source: string, options?: PushOptions) => void;
    onPushFinalResult: (url: string, source: string, options?: PushOptions) => void;
    onPushError: (error: string) => void;
    onClearImages: () => void;
    
    // Upload pass control - supports complex auto upload logic
    onCreateUploadPass: (passConfig: UploadPassConfig) => void;
    onRemoveUploadPass: (passConfig: UploadPassConfig) => void;
    
    // UI state
    isUploading: boolean;
    uploadProgress?: { completed: number; total: number };
    uploadError?: string;
    
    // Cancel control
    abortController: AbortController;
}

// ActionButton render function type
export type RenderActionButtonsFunction = (params: RenderActionButtonsParams) => React.ReactNode;

// ImageMetadata render function parameters
export interface RenderImageMetadataParams {
    // Image data
    image: ImageDetail;
    
    // Image update callback
    onImageUpdate?: (updatedImage: ImageDetail) => void;
    
    // Display mode
    displayMode?: 'single' | 'multiple';
    
    // UI state
    isUploading?: boolean;
}

// ImageMetadata render function type
export type RenderImageMetadataFunction = (params: RenderImageMetadataParams) => React.ReactNode;

// Photoshop parameters interfaces (from source-render.tsx)
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

// Hook to parse source information (from source-render.tsx)
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

// 定义Context的类型
interface WidgetableContextType {
    runUploadPassOnce: (pass: UploadPass) => Promise<string>;
    addUploadPass: (pass: UploadPass) => string;
    removeUploadPass: (pass: UploadPass) => void;
    cancelAllUploads: () => void;

    waitAllUploadPasses: () => Promise<void>;
    
    // New: unified ActionButton render function
    renderActionButtons: RenderActionButtonsFunction;
    
    // New: unified ImageMetadata render function
    renderImageMetadata: RenderImageMetadataFunction;
}

// 创建Context
const WidgetableContext = createContext<WidgetableContextType | undefined>(undefined);

// Provider组件的Props类型
interface WidgetableProviderProps {
    children: ReactNode;
    uploader: (uploadInput: UploadPassInput, signal?: AbortSignal) => Promise<string>;
    renderActionButtons?: RenderActionButtonsFunction;
    renderImageMetadata?: RenderImageMetadataFunction;
}

const uploadPassesStore = createStore<{
    uploadPasses: UploadPass[],
    runningUploadPasses: {
        [id: string]: Promise<string>
    },
    abortControllers: {
        [id: string]: AbortController
    }
}>(() => ({
    uploadPasses: [],
    runningUploadPasses: {},
    abortControllers: {},
}))

// Default renderActionButtons implementation
const defaultRenderActionButtons: RenderActionButtonsFunction = ({
    images, maxCount, isMask, onPushThumbnail, onPushFinalResult, 
    onPushError, onClearImages, onCreateUploadPass,
    isUploading, uploadProgress, uploadError
}) => {
    const { t } = useTranslation();
    
    const handlePSImageAdd = async () => {
        try {
            // First step: request user selection and get thumbnail
            if (isMask) {
                const { getMaskParams, thumbnail_url, source } = await sdpppSDK.plugins.photoshop.requestMaskGet({ isMask: true });
                if (!getMaskParams || !thumbnail_url || !source) {
                    throw new Error('用户取消操作');
                }
                
                // Push thumbnail immediately
                onPushThumbnail(thumbnail_url, source);
                
                // Second step: create upload pass for actual file upload
                const uploadPass: UploadPass = {
                    getUploadFile: async (signal?: AbortSignal) => {
                        if (signal?.aborted) {
                            throw new DOMException('Upload aborted', 'AbortError');
                        }
                        const { file_token } = await sdpppSDK.plugins.photoshop.doGetMask(getMaskParams);
                        return { type: 'token', tokenOrBuffer: file_token, fileName: `${uuidv4()}.png` };
                    },
                    onUploaded: async (fileURL: string, signal?: AbortSignal) => {
                        if (!signal?.aborted) {
                            onPushFinalResult(fileURL, source);
                        }
                    },
                    onUploadError: (error: Error) => {
                        if (error.name !== 'AbortError') {
                            onPushError(error.message);
                        }
                    }
                };
                
                onCreateUploadPass({
                    type: 'mask',
                    source,
                    config: uploadPass
                });
            } else {
                const { getImageParams, thumbnail_url, source } = await sdpppSDK.plugins.photoshop.requestImageGet({});
                if (!getImageParams || !thumbnail_url || !source) {
                    throw new Error('用户取消操作');
                }
                
                // Push thumbnail immediately
                onPushThumbnail(thumbnail_url, source);
                
                // Second step: create upload pass for actual file upload
                const uploadPass: UploadPass = {
                    getUploadFile: async (signal?: AbortSignal) => {
                        if (signal?.aborted) {
                            throw new DOMException('Upload aborted', 'AbortError');
                        }
                        const { file_token } = await sdpppSDK.plugins.photoshop.doGetImage(getImageParams);
                        return { type: 'token', tokenOrBuffer: file_token, fileName: `${uuidv4()}.png` };
                    },
                    onUploaded: async (fileURL: string, signal?: AbortSignal) => {
                        if (!signal?.aborted) {
                            onPushFinalResult(fileURL, source);
                        }
                    }, 
                    onUploadError: (error: Error) => {
                        if (error.name !== 'AbortError') {
                            onPushError(error.message);
                        }
                    }
                };
                
                onCreateUploadPass({
                    type: 'image',
                    source,
                    config: uploadPass
                });
            }
        } catch (error: any) {
            onPushError(error.message);
        }
    };
    
    const uploadProps: UploadProps = {
        multiple: maxCount > 1,
        showUploadList: false,
        fileList: [],
        beforeUpload: () => false,
        onChange: async (info) => {
            const fileList = info.fileList || [];
            
            for (const file of fileList) {
                if (file.originFileObj) {
                    const isImage = file.originFileObj.type.startsWith('image/');
                    if (!isImage) continue;
                    
                    try {
                        // Push thumbnail immediately
                        const thumbnail = URL.createObjectURL(file.originFileObj);
                        onPushThumbnail(thumbnail, 'disk');
                        
                        // Create upload pass for disk upload
                        const fileObj = file.originFileObj;
                        const uploadPass: UploadPass = {
                            getUploadFile: async (signal?: AbortSignal) => {
                                if (signal?.aborted) {
                                    throw new DOMException('Upload aborted', 'AbortError');
                                }
                                const buffer = await fileObj.arrayBuffer();
                                return { 
                                    type: 'buffer', 
                                    tokenOrBuffer: Buffer.from(buffer), 
                                    fileName: fileObj.name 
                                };
                            },
                            onUploaded: async (fileURL: string, signal?: AbortSignal) => {
                                if (!signal?.aborted) {
                                    onPushFinalResult(fileURL, 'disk');
                                }
                            },
                            onUploadError: (error: Error) => {
                                if (error.name !== 'AbortError') {
                                    onPushError(error.message);
                                }
                            }
                        };
                        
                        onCreateUploadPass({
                            type: 'image',
                            source: 'disk',
                            config: uploadPass
                        });
                    } catch (error: any) {
                        onPushError(error.message);
                    }
                }
            }
        },
    };
    
    return (
        <>
            <Row gutter={[8, 8]} className="button-group-row">
                <Col flex="1 1 0">
                    <Button
                        style={{ width: '100%' }}
                        icon={<PlusOutlined />}
                        onClick={handlePSImageAdd}
                        disabled={isUploading}
                    >
                        {t('image.upload.from_ps')}
                    </Button>
                </Col>
                <Col flex="1 1 0">
                    <Upload style={{ width: '100%' }} {...uploadProps}>
                        <Button 
                            style={{ width: '100%' }} 
                            icon={<UploadOutlined />}
                            disabled={isUploading}
                        >
                            {t('image.upload.from_disk')}
                        </Button>
                    </Upload>
                </Col>
                {(images.length > 0 || isUploading) && (
                    <Col flex="0 0 auto">
                        <Tooltip title={t('image.upload.clear')}>
                            <Button
                                icon={<DeleteOutlined />}
                                onClick={onClearImages}
                            />
                        </Tooltip>
                    </Col>
                )}
            </Row>
            {isUploading && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <Spin 
                        indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />}
                        size="small"
                    />
                    <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--sdppp-host-text-color-secondary)' }}>
                        {t('image.upload.uploading')}
                        {uploadProgress && uploadProgress.total > 1 && ` (${uploadProgress.completed}/${uploadProgress.total})`}
                    </span>
                </div>
            )}
            {uploadError && (
                <Alert
                    message={uploadError}
                    type="error"
                    showIcon
                    closable
                    style={{ marginTop: 8 }}
                />
            )}
        </>
    );
};

// Default renderImageMetadata implementation
const defaultRenderImageMetadata: RenderImageMetadataFunction = ({
    image, onImageUpdate, displayMode = 'single'
}) => {
    const { t } = useTranslation();
    const sourceInfo = useSourceInfo(image.source);

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
                auto: checked
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
                            checked={image.auto || false}
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

// Provider组件
export function WidgetableProvider({ children, uploader, renderActionButtons = defaultRenderActionButtons, renderImageMetadata = defaultRenderImageMetadata }: WidgetableProviderProps) {
    const value: WidgetableContextType = {
        renderActionButtons,
        renderImageMetadata,
        runUploadPassOnce: async (pass: UploadPass) => {
            if (!uploader) {
                throw new Error('Uploader not set, please call setUploader first');
            }
            const runID = uuidv4();
            const abortController = new AbortController();
            
            const promise = new Promise<string>(async (resolve, reject) => {
                try {
                    const uploadInput = await pass.getUploadFile(abortController.signal);
                    const fileURL = await uploader(uploadInput, abortController.signal);
                    if (pass.onUploaded && !abortController.signal.aborted) {
                        await pass.onUploaded(fileURL, abortController.signal);
                    }
                    resolve(fileURL);
                } catch (error) {
                    if (error instanceof Error && error.name === 'AbortError') {
                        reject(error);
                    } else {
                        pass.onUploadError?.(error);
                        reject(error);
                    }
                } finally {
                    uploadPassesStore.setState((state) => {
                        delete state.runningUploadPasses[runID];
                        delete state.abortControllers[runID];
                        return state;
                    });
                }
            });
            
            uploadPassesStore.setState((state) => {
                state.runningUploadPasses[runID] = promise;
                state.abortControllers[runID] = abortController;
                return state;
            });

            return await promise;
        },
        addUploadPass: (pass: UploadPass) => {
            const passId = uuidv4();
            uploadPassesStore.setState((state) => {
                state.uploadPasses.push(pass);
                return state;
            });
            return passId;
        },
        removeUploadPass: (pass: UploadPass) => {
            uploadPassesStore.setState((state) => {
                state.uploadPasses = state.uploadPasses.filter(p => p !== pass);
                return state;
            });
        },
        cancelAllUploads: () => {
            const state = uploadPassesStore.getState();
            // Cancel all running uploads
            Object.values(state.abortControllers).forEach(controller => {
                controller.abort();
            });
            // Clear all queued uploads
            uploadPassesStore.setState((state) => {
                state.uploadPasses = [];
                state.runningUploadPasses = {};
                state.abortControllers = {};
                return state;
            });
        },
        waitAllUploadPasses: async () => {
            if (!uploader) {
                throw new Error('Uploader not set, please call setUploader first');
            }
            const promisesFromUploadPasses = uploadPassesStore.getState().uploadPasses.map(async pass => {
                try {
                    const uploadInput = await pass.getUploadFile();
                    const fileURL = await uploader(uploadInput);
                    if (pass.onUploaded) {
                        await pass.onUploaded(fileURL);
                    }
                    return fileURL;
                } catch (error) {
                    pass.onUploadError?.(error);
                    throw error
                }
            });
            const promisesFromRunningUploadPasses = Object.values(uploadPassesStore.getState().runningUploadPasses);
            await Promise.all([...promisesFromUploadPasses, ...promisesFromRunningUploadPasses]);
        },
    };

    return (
        <WidgetableContext.Provider value={value}>
            {children}
        </WidgetableContext.Provider>
    );
}

// 自定义Hook：使用Context
export function useWidgetable() {
    const context = useContext(WidgetableContext);
    if (context === undefined) {
        throw new Error('useWidgetable must be used within a WidgetableProvider');
    }
    return context;
}
