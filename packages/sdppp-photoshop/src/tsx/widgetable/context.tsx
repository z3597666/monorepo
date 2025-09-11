import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createStore } from 'zustand';
import { UploadPassManager } from '../../providers/base/upload-passes/UploadPassManager';
import { UploadPassResolver } from '../../providers/base/upload-passes/UploadPassResolver';

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
    
    // 新的抽象：是否维持上传通道（替代 auto）
    maintainUploadPass?: boolean;
    uploadPassId?: string;  // 上传通道标识
}

// Push options for image upload
export interface PushOptions {
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
    name?: string;
    widget?: any;
    value?: any;
    onValueChange?: (value: any) => void;
    
    // UI state
    isUploading?: boolean;
    onUploadStart?: () => void;
    onUploadComplete?: () => void;
    onUploadError?: (error: Error) => void;
    
    // Cancel control
    abortController?: AbortController;
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
    
    // New: intelligent upload pass management
    onImageStateChange: (images: ImageDetail[]) => void;
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

// Provider组件
export function WidgetableProvider({ 
    children, 
    uploader, 
    renderActionButtons,
    renderImageMetadata
}: WidgetableProviderProps) {
    // 创建上传通道管理器
    const uploadPassManager = useMemo(() => new UploadPassManager(), []);
    
    // 智能图片状态管理
    const onImageStateChange = useCallback((images: ImageDetail[]) => {
        images.forEach(image => {
            const passId = image.uploadPassId || UploadPassResolver.generateUploadPassId(image.source);
            
            if (image.maintainUploadPass && UploadPassResolver.canCreateUploadPass(image.source)) {
                // 需要维持上传通道且源支持
                if (!uploadPassManager.hasPass(passId)) {
                    try {
                        const uploadPass = UploadPassResolver.createUploadPassFromSource(
                            image.source,
                            (updatedImage) => {
                                // 这里需要回调来更新图片状态
                                // 具体的更新逻辑需要由使用方提供
                                console.log('Image updated:', updatedImage);
                            },
                            image
                        );
                        uploadPassManager.registerPass(passId, uploadPass);
                        
                        // 自动执行上传通道
                        uploadPassManager.executePass(passId, uploader).catch(error => {
                            console.error('Upload pass execution failed:', error);
                        });
                    } catch (error) {
                        console.error('Failed to create upload pass:', error);
                    }
                }
            } else if (!image.maintainUploadPass && uploadPassManager.hasPass(passId)) {
                // 不需要维持上传通道，移除现有通道
                uploadPassManager.unregisterPass(passId);
            }
        });
    }, [uploadPassManager, uploader]);

    const value: WidgetableContextType = {
        renderActionButtons: renderActionButtons || (() => null),
        renderImageMetadata: renderImageMetadata || (() => null),
        onImageStateChange,
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