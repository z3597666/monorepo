import './runninghub.less';
import { Input, Alert, Flex, Button } from 'antd';
import { useState } from 'react';
import { runninghubStore, changeSelectedModel, createTask } from './runninghub.store';
import { WorkflowEditApiFormat } from '../../../tsx/widgetable';
import Link from 'antd/es/typography/Link';
import { sdpppSDK } from '../../../sdk/sdppp-ps-sdk';
import { WidgetableNode } from '@sdppp/common/schemas/schemas';
import { WidgetableProvider } from '../../../tsx/widgetable/context';
import { useTaskExecutor } from '../../base/useTaskExecutor';
import { loadRemoteConfig } from '@sdppp/vite-remote-config-loader';
import { useI18n } from '@sdppp/common';
import { ModelSelector } from '../../base/ModelSelector';

const log = sdpppSDK.logger.extend('runninghub')

const { Password } = Input;

export default function RunningHubRenderer({ showingPreview }: { showingPreview: boolean }) {
    const { t } = useI18n()
    const { apiKey, setApiKey } = runninghubStore();
    const [error, setError] = useState<string>('');

    return (
        <Flex className="runninghub-renderer" vertical gap={8}>
            {!showingPreview ? <Flex gap={8}>
                <Password
                    placeholder="Enter your RunningHub API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />
            </Flex> : null}
            {
                !apiKey && <Link underline onClick={async () => {
                    const banners = loadRemoteConfig('banners');
                    const runninghubURL = banners.find((banner: any) => banner.type === 'runninghub')?.link;
                    sdpppSDK.plugins.photoshop.openExternalLink({ url: runninghubURL })
                }}>{t('runninghub.get_apikey')}</Link>
            }

            {error && (
                <Alert
                    message="Error"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            {apiKey && <AccountStatus />}

            <Flex gap={8} vertical>
                {apiKey && <RunningHubRendererModels />}
            </Flex>
        </Flex>
    );
}

function RunningHubRendererModels() {
    const { webappId, setWebappId, webappHistory } = runninghubStore();
    const client = runninghubStore((state) => state.client);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string>('');
    const [inputValue, setInputValue] = useState('');

    if (!client) {
        return null;
    }

    const handleWebappIdChange = async (value: string) => {
        // 如果输入的是appName，需要找到对应的webappId
        let actualWebappId = value;
        const historyItem = webappHistory.find(item => item.appName === value);
        if (historyItem) {
            actualWebappId = historyItem.webappId;
        }

        if (actualWebappId === webappId || !actualWebappId.trim()) {
            return;
        }
        
        setLoadError('');
        setLoading(true);
        try {
            await changeSelectedModel(actualWebappId);
            setWebappId(actualWebappId);
        } catch (error: any) {
            setLoadError(error.message || error.toString());
        } finally {
            setLoading(false);
        }
    };

    // 准备Select的选项
    const selectOptions = webappHistory.map(item => ({
        value: item.webappId,
        label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--sdppp-host-text-color)' }}>{item.appName}</span>
                <span style={{ fontSize: '12px', color: 'var(--sdppp-host-text-color-secondary)' }}>{item.webappId}</span>
            </div>
        ),
        // 用于搜索的纯文本
        searchText: `${item.appName} ${item.webappId}`,
        // 用于显示的文本（选中后显示在输入框中）
        displayText: item.appName
    }));

    const { t } = useI18n();
    
    const notFoundContent = inputValue && inputValue.trim() ? (
        <div style={{ padding: '8px 12px', color: 'var(--sdppp-host-text-color-secondary)' }}>
            {t('runninghub.open_app', { appName: inputValue })}
        </div>
    ) : null;

    return (
        <WidgetableProvider
            uploader={async (uploadInput, signal) => {
                return await client.uploadImage(uploadInput.type, uploadInput.tokenOrBuffer, 'jpg', signal);
            }}
        >
            <ModelSelector
                value={webappId}
                placeholder={t('runninghub.webapp_id_placeholder')}
                loading={loading}
                loadError={loadError}
                options={selectOptions}
                onChange={handleWebappIdChange}
                onInputChange={setInputValue}
                notFoundContent={notFoundContent}
            />
            {webappId && !loading && !loadError && <RunningHubRendererForm />}
        </WidgetableProvider>
    )
}

function RunningHubRendererForm() {
    const { t } = useI18n()
    const currentNodes = runninghubStore((state) => state.currentNodes);
    const currentValues = runninghubStore((state) => state.currentValues);
    const setCurrentValues = runninghubStore((state) => state.setCurrentValues);
    const webappId = runninghubStore((state) => state.webappId);
    const runningTasks = runninghubStore((state) => state.runningTasks);
    const appName = runninghubStore((state) => state.appName);

    const { runError, progressMessage, handleRun } = useTaskExecutor({
        selectedModel: webappId,
        currentValues,
        createTask,
        runningTasks,
        beforeCreateTaskHook: (values) => {
            // 处理图片字段，从对象中提取URL
            const processedValues = { ...values };

            currentNodes.forEach((node) => {
                if (node.widgets[0].outputType === 'images') {
                    const fieldValue = processedValues[node.id];
                    if (fieldValue) {
                        if (Array.isArray(fieldValue)) {
                            processedValues[node.id] = fieldValue.map((item: any) =>
                                (typeof item === 'object' && item.url) ? item.url : item
                            );
                        } else if (typeof fieldValue === 'object' && fieldValue.url) {
                            processedValues[node.id] = fieldValue.url;
                        }
                    }
                }
            });

            return processedValues;
        }
    });

    return (
        <>
            <Button type="primary" onClick={handleRun}>{t('runninghub.execute')}</Button>
            {progressMessage && <Alert message={progressMessage} type="info" showIcon />}
            {runError && <Alert message={runError} type="error" showIcon />}
            <WorkflowEditApiFormat
                modelName={webappId}
                nodes={currentNodes}
                values={currentValues}
                errors={{}}
                onWidgetChange={(_widgetIndex: number, value: any, fieldInfo: WidgetableNode) => {
                    currentValues[fieldInfo.id] = value;
                    setCurrentValues(currentValues);
                }}
            />
        </>
    )
}

function AccountStatus() {
    const { t } = useI18n()
    const { accountStatus } = runninghubStore();

    if (!accountStatus) {
        return null;
    }

    return (
        <Flex justify='space-between' gap={16} style={{ color: 'var(--sdppp-host-text-color-secondary)', fontSize: '12px' }}>
            <div>
                <span>{t('runninghub.rh_coins')}</span>
                <span>{accountStatus.remainCoins}</span>
            </div>
            <div>
                <span>{t('runninghub.current_tasks')}</span>
                <span>{accountStatus.currentTaskCounts}</span>
            </div>
        </Flex>
    );
}