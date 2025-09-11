import { useEffect, useState } from 'react';
import { useWidgetable } from '@sdppp/widgetable-ui';
import { MainStore } from '../../tsx/App.store';
import { t } from '@sdppp/common';

export interface UseTaskExecutorOptions {
    selectedModel: string;
    currentValues: any;
    createTask: (model: string, values: any) => Promise<any>;
    runningTasks: any[];
    beforeCreateTaskHook: (values: any) => any;
}

export function useTaskExecutor({
    selectedModel,
    currentValues,
    createTask,
    runningTasks,
    beforeCreateTaskHook
}: UseTaskExecutorOptions) {
    const [runError, setRunError] = useState<string>('');
    const [lastStartTime, setLastStartTime] = useState<number>(0);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const [currentTask, setCurrentTask] = useState<any>(null);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const { waitAllUploadPasses } = useWidgetable();
    const downloadAndAppendImage = MainStore((state) => state.downloadAndAppendImage);

    // 进度跟踪逻辑
    useEffect(() => {
        if (!lastStartTime) {
            return;
        }
        const interval = setInterval(() => {
            if (lastStartTime > 0 && runningTasks.length > 0) {
                setProgressMessage(t('task.running_duration', { 
                    duration: ((Date.now() - lastStartTime) / 1000).toFixed(2), 
                    message: runningTasks[0].progressMessage 
                }));
            }
        }, 100);

        return () => {
            clearInterval(interval);
            setProgressMessage('');
        }
    }, [lastStartTime, runningTasks]);

    // 任务执行逻辑
    const handleRun = async () => {
        // must call waitAllUploadPasses, otherwise the image component may not finished uploading
        // waitAllUploadPasses一定要调，否则图片组件的上传可能还未完成
        setRunError('');
        setProgressMessage(t('task.waiting_upload'));
        setIsRunning(true);
        await waitAllUploadPasses();

        setProgressMessage(t('task.creating_task'));
        
        // 在创建任务前调用 hook 来修改 currentValues
        const finalValues = beforeCreateTaskHook ? beforeCreateTaskHook(currentValues) : currentValues;
        
        try {
            const task = await createTask(selectedModel, finalValues);
            setCurrentTask(task);
            setLastStartTime(Date.now());
            if (task) {
                try {
                    const result = await task.promise;
                    Promise.all(result.map((output: any) => downloadAndAppendImage({
                        url: output.url,
                        source: 'remote'
                    })))
                    
                } catch (error: any) {
                    setProgressMessage('');
                    setRunError(error.message || error.toString());
                } finally {
                    // 任务完成后从 Photoshop 面板移除
                    if (task && task.taskId) {
                        try {
                            const { sdpppSDK } = await import('../../sdk/sdppp-ps-sdk');
                            await sdpppSDK.plugins.photoshop.taskRemove({
                                taskId: task.taskId
                            });
                        } catch (error) {
                            console.warn('Failed to remove task from Photoshop panel:', error);
                        }
                    }
                    setLastStartTime(0);
                    setCurrentTask(null);
                    setIsRunning(false);
                }
            }
        } catch (error: any) {
            setProgressMessage('');
            setRunError(error.message || error.toString());
            setIsRunning(false);
        } finally {
            if (!currentTask) {
                setProgressMessage('');
                setIsRunning(false);
            }
        }
    };

    // 任务中断逻辑
    const handleCancel = async () => {
        if (currentTask && currentTask.cancelable) {
            try {
                await currentTask.cancel();
                setProgressMessage(t('task.cancelled'));
                setRunError('');
            } catch (error: any) {
                setRunError(t('task.cancel_failed', { error: error.message || error.toString() }));
            } finally {
                // 取消后从面板移除
                if (currentTask && currentTask.taskId) {
                    try {
                        const { sdpppSDK } = await import('../../sdk/sdppp-ps-sdk');
                        await sdpppSDK.plugins.photoshop.taskRemove({
                            taskId: currentTask.taskId
                        });
                    } catch (error) {
                        console.warn('Failed to remove cancelled task:', error);
                    }
                }
                setLastStartTime(0);
                setCurrentTask(null);
                setIsRunning(false);
            }
        }
    };

    return {
        runError,
        progressMessage,
        handleRun,
        handleCancel,
        isRunning,
        canCancel: currentTask && currentTask.cancelable
    };
} 