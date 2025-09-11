import type { UploadPass } from '../../../tsx/widgetable/context';

/**
 * UploadPass 管理器
 * 负责管理上传通道的生命周期
 */
export class UploadPassManager {
    private passes = new Map<string, UploadPass>();
    private activeUploads = new Map<string, Promise<string>>();
    private abortControllers = new Map<string, AbortController>();

    /**
     * 注册上传通道
     */
    registerPass(passId: string, uploadPass: UploadPass): void {
        // 如果已存在，先清理
        if (this.passes.has(passId)) {
            this.unregisterPass(passId);
        }

        this.passes.set(passId, uploadPass);
    }

    /**
     * 取消注册上传通道
     */
    unregisterPass(passId: string): void {
        // 取消正在进行的上传
        if (this.abortControllers.has(passId)) {
            this.abortControllers.get(passId)?.abort();
            this.abortControllers.delete(passId);
        }

        // 清理数据
        this.passes.delete(passId);
        this.activeUploads.delete(passId);
    }

    /**
     * 检查是否有指定的上传通道
     */
    hasPass(passId: string): boolean {
        return this.passes.has(passId);
    }

    /**
     * 获取上传通道
     */
    getPass(passId: string): UploadPass | undefined {
        return this.passes.get(passId);
    }

    /**
     * 执行上传通道
     */
    async executePass(
        passId: string, 
        uploader: (uploadInput: any, signal?: AbortSignal) => Promise<string>
    ): Promise<string> {
        const uploadPass = this.passes.get(passId);
        if (!uploadPass) {
            throw new Error(`Upload pass not found: ${passId}`);
        }

        // 创建取消控制器
        const abortController = new AbortController();
        this.abortControllers.set(passId, abortController);

        try {
            // 获取上传文件
            const uploadInput = await uploadPass.getUploadFile(abortController.signal);
            
            // 执行上传
            const fileURL = await uploader(uploadInput, abortController.signal);
            
            // 调用上传完成回调
            if (uploadPass.onUploaded && !abortController.signal.aborted) {
                await uploadPass.onUploaded(fileURL, abortController.signal);
            }

            return fileURL;
        } catch (error) {
            // 调用错误回调
            if (uploadPass.onUploadError && error instanceof Error && error.name !== 'AbortError') {
                uploadPass.onUploadError(error);
            }
            throw error;
        } finally {
            // 清理
            this.abortControllers.delete(passId);
        }
    }

    /**
     * 取消所有上传
     */
    cancelAllUploads(): void {
        this.abortControllers.forEach(controller => controller.abort());
        this.abortControllers.clear();
        this.activeUploads.clear();
    }

    /**
     * 获取所有注册的通道 ID
     */
    getAllPassIds(): string[] {
        return Array.from(this.passes.keys());
    }

    /**
     * 清理所有通道
     */
    clear(): void {
        this.cancelAllUploads();
        this.passes.clear();
    }
}