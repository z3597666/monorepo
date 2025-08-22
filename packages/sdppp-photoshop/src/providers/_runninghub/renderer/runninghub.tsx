import './runninghub.less';
import { Input, Alert, Flex, Spin, Button, Typography, Select } from 'antd';
import { useEffect, useState } from 'react';
import { runninghubStore, changeSelectedModel, createTask } from './runninghub.store';
import { WorkflowEditApiFormat } from '../../../tsx/widgetable';
import Link from 'antd/es/typography/Link';
import { sdpppSDK } from '../../../sdk/sdppp-ps-sdk';
import { WidgetableNode } from '@sdppp/common/schemas/schemas';
import { useWidgetable, WidgetableProvider } from '../../../tsx/widgetable/context';
import { useTaskExecutor } from '../../base/useTaskExecutor';
import { loadRemoteConfig } from '@sdppp/vite-remote-config-loader';

const { Password } = Input;

export default function RunningHubRenderer({ showingPreview }: { showingPreview: boolean }) {
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
                }}>点此获取RunningHub APIKey</Link>
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
    const { webappId, setWebappId, webappHistory, appName } = runninghubStore();
    const client = runninghubStore((state) => state.client);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string>('');
    const [inputValue, setInputValue] = useState(() => {
        // 如果当前webappId在历史记录中，显示对应的appName，否则显示webappId
        const historyItem = webappHistory.find(item => item.webappId === webappId);
        return historyItem ? historyItem.appName : webappId;
    });

    useEffect(() => {
        if (client && webappId && webappId.trim()) {
            setLoading(true);
            setLoadError('');
            changeSelectedModel(webappId)
                .catch((error: any) => {
                    setLoadError(error.message || error.toString());
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [client, webappId]);

    // 当appName变化时，更新输入框显示
    useEffect(() => {
        if (appName && webappId) {
            setInputValue(appName);
        }
    }, [appName, webappId]);

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
        if (client) {
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
        }
    };

    // 准备Select的选项
    const selectOptions = webappHistory.map(item => ({
        value: item.webappId,
        label: (
            <div>
                <div style={{ fontWeight: 'bold', color: 'var(--sdppp-host-text-color)' }}>{item.appName}</div>
                <div style={{ fontSize: '12px', color: 'var(--sdppp-host-text-color-secondary)', marginTop: '2px' }}>{item.webappId}</div>
            </div>
        ),
        // 用于搜索的纯文本
        searchText: `${item.appName} ${item.webappId}`,
        // 用于显示的文本（选中后显示在输入框中）
        displayText: item.appName
    }));

    return (
        <WidgetableProvider
            uploader={async (uploadInput) => {
                return await client.uploadImage(uploadInput.type, uploadInput.tokenOrBuffer, 'jpg');
            }}
        >
            <Flex gap={8} align='center'>
                <Typography.Text>应用ID:</Typography.Text>
                <Select
                    placeholder="此处粘贴 WebApp ID"
                    value={inputValue || undefined}
                    onChange={(value, option) => {
                        // 如果选择的是历史项目，显示appName
                        const selectedOption = option as any;
                        if (selectedOption && selectedOption.displayText) {
                            setInputValue(selectedOption.displayText);
                            handleWebappIdChange(value);
                        } else {
                            setInputValue(value);
                        }
                    }}
                    onSearch={(value) => setInputValue(value)}
                    onBlur={() => {
                        // 失焦时尝试设置webappId
                        if (inputValue && inputValue.trim()) {
                            handleWebappIdChange(inputValue);
                        }
                    }}
                    onInputKeyDown={(e) => {
                        // 按回车时尝试设置webappId
                        if (e.key === 'Enter' && inputValue && inputValue.trim()) {
                            handleWebappIdChange(inputValue);
                        }
                    }}
                    options={selectOptions}
                    showSearch
                    allowClear
                    filterOption={(input, option) => {
                        if (!option) return false;
                        const searchText = (option as any).searchText || '';
                        return searchText.toLowerCase().includes(input.toLowerCase());
                    }}
                    notFoundContent={
                        inputValue && inputValue.trim() ? (
                            <div style={{ padding: '8px 12px', color: 'var(--sdppp-host-text-color-secondary)' }}>
                                按回车打开应用： {inputValue}
                            </div>
                        ) : null
                    }
                    className="renderer-model-select"
                    style={{ flex: 1 }}
                />
            </Flex>
            {loadError && <Alert message={loadError} type="error" showIcon />}
            {loading && <Flex justify="center" align="center" style={{ width: '100%', height: '200px' }}><Spin /></Flex>}
            {webappId && !loading && !loadError && <RunningHubRendererForm />}
        </WidgetableProvider>
    )
}

function RunningHubRendererForm() {
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
            <Button type="primary" onClick={handleRun}>执行</Button>
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
    const { accountStatus } = runninghubStore();

    if (!accountStatus) {
        return null;
    }

    return (
        <Flex justify='space-between' gap={16} style={{ color: 'var(--sdppp-host-text-color-secondary)', fontSize: '12px' }}>
            <div>
                <span>RH币:</span>
                <span>{accountStatus.remainCoins}</span>
            </div>
            <div>
                <span>当前任务数:</span>
                <span>{accountStatus.currentTaskCounts}</span>
            </div>
        </Flex>
    );
}