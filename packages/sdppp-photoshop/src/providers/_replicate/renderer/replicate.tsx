import './replicate.less';
import { Input, Alert, Flex, Select, Spin, Card, Button, AutoComplete } from 'antd';
import { useEffect, useState } from 'react';
import { replicateStore, changeSelectedModel, createTask } from './replicate.store';
import { availableModels, SDPPPReplicate } from '../client';
import { WorkflowEditApiFormat } from '../../../tsx/widgetable';
import Link from 'antd/es/typography/Link';
import { sdpppSDK } from '../../../sdk/sdppp-ps-sdk';
import { WidgetableNode } from '@sdppp/common/schemas/schemas';
import { useWidgetable, WidgetableProvider } from '../../../tsx/widgetable/context';
import { useTaskExecutor } from '../../base/useTaskExecutor';

const { Password } = Input;

export default function ReplicateRenderer({ showingPreview }: { showingPreview: boolean }) {
    const { apiKey, setApiKey } = replicateStore();
    const [error, setError] = useState<string>('');

    return (
        <Flex className="replicate-renderer" vertical gap={8}>
            {!showingPreview ? <Flex gap={8}>
                <Password
                    placeholder="Enter your Replicate API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />
            </Flex> : null}
            {
                !apiKey && <Link onClick={() => sdpppSDK.plugins.photoshop.openExternalLink({ url: "https://replicate.com/account/api-tokens" })}>如何获取APIKey</Link>
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

            <Flex gap={8} vertical>
                {apiKey && <ReplicateRendererModels />}
            </Flex>
        </Flex>
    );
}

function ReplicateRendererModels() {
    const { selectedModel } = replicateStore();
    const [inputValue, setInputValue] = useState<string>(selectedModel || '');
    const client = replicateStore((state) => state.client);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string>('');
    if (!client) {
        return null;
    }

    useEffect(() => {
        setInputValue(selectedModel || '');
    }, [selectedModel]);

    const handleModelChange = async (value: string) => {
        if (value === selectedModel) {
            return;
        }
        if (client) {
            setLoadError('');
            setLoading(true);
            try {
                await changeSelectedModel(value as typeof availableModels[number]);
            } catch (error: any) {
                setLoadError(error.message || error.toString());
            } finally {
                setLoading(false);
                replicateStore.setState({
                    selectedModel: value
                });
            }
        }
    };
    useEffect(() => {
        handleModelChange(selectedModel);
    }, [selectedModel]);

    return (
        // This Provider is used to provide the context for the WorkflowEditApiFormat
        // 这个Provider是必须的，因为WorkflowEditApiFormat需要使用WidgetableProvider
        <WidgetableProvider
            uploader={async (uploadInput) => {
                return await client.uploadImage(uploadInput.type, uploadInput.tokenOrBuffer, 'jpg');
            }}
        >
            <AutoComplete
                options={availableModels.map((model) => ({ label: model, value: model }))}
                onChange={(value) => {
                    setInputValue(value);
                }}
                onBlur={(e) => handleModelChange((e.target as any).value)}
                onSelect={(value) => {
                    if (value) {
                        handleModelChange(value);
                    }
                }}
                placeholder="Select a model"
                value={inputValue}
                className="renderer-model-select"
            />
            {loadError && <Alert message={loadError} type="error" showIcon />}
            {loading && <Flex justify="center" align="center" style={{ width: '100vw', height: '100vw' }}><Spin /></Flex>}
            {selectedModel && !loading && !loadError && <ReplicateRendererForm />}
        </WidgetableProvider>
    )
}

function ReplicateRendererForm() {
    const currentNodes = replicateStore((state) => state.currentNodes);
    const currentValues = replicateStore((state) => state.currentValues);
    const setCurrentValues = replicateStore((state) => state.setCurrentValues);
    const selectedModel = replicateStore((state) => state.selectedModel);
    const runningTasks = replicateStore((state) => state.runningTasks);

    const { runError, progressMessage, handleRun } = useTaskExecutor({
        selectedModel,
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
                modelName={selectedModel}
                nodes={currentNodes}
                values={currentValues}
                errors={{}}
                onWidgetChange={(widgetIndex: number, value: any, fieldInfo: WidgetableNode) => {
                    currentValues[fieldInfo.id] = value;
                    setCurrentValues(currentValues);
                }}
            />
        </>
    )
}