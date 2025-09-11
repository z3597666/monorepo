import './replicate.less';
import { Input, Alert, Flex, Button, Tooltip } from 'antd';
import { useState, useEffect } from 'react';
import { replicateStore, changeSelectedModel, createTask } from './replicate.store';
import { WorkflowEditApiFormat } from '@sdppp/widgetable-ui';
import Link from 'antd/es/typography/Link';
import { sdpppSDK } from '../../../sdk/sdppp-ps-sdk';
import { WidgetableNode } from '@sdppp/common/schemas/schemas';
import { WidgetableProvider } from '@sdppp/widgetable-ui';
import { useTaskExecutor } from '../../base/useTaskExecutor';
import { ModelSelector } from '../../base/ModelSelector';
import { useTranslation } from '@sdppp/common';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { createPhotoshopRenderers } from '../../base/RenderersFactory';
import { createBaseWidgetRegistry } from '../../base/widgetable-integration/widgetable-widgets';

const { Password } = Input;

export default function ReplicateRenderer({ showingPreview }: { showingPreview: boolean }) {
    const { t } = useTranslation()
    const { apiKey, setApiKey } = replicateStore();

    return (
        <Flex className="replicate-renderer" vertical gap={8}>
            {!showingPreview ? <Flex gap={8}>
                <Password
                    placeholder={t('replicate.apikey_placeholder')}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />
            </Flex> : null}
            {
                !apiKey && <Link onClick={() => sdpppSDK.plugins.photoshop.openExternalLink({ url: "https://replicate.com/account/api-tokens" })}>{t('replicate.get_apikey')}</Link>
            }


            <Flex gap={8} vertical>
                {apiKey && <ReplicateRendererModels />}
            </Flex>
        </Flex>
    );
}

function ReplicateRendererModels() {
    const { t } = useTranslation();
    const { selectedModel, availableModels, removeModel, addModel } = replicateStore();
    const client = replicateStore((state) => state.client);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string>('');
    
    // Load initial model on mount
    useEffect(() => {
        if (client && selectedModel && !replicateStore.getState().currentNodes.length) {
            setLoadError('');
            setLoading(true);
            changeSelectedModel(selectedModel).catch((error: any) => {
                setLoadError(error.message || error.toString());
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [client, selectedModel]);
    
    if (!client) {
        return null;
    }

    const handleModelChange = async (value: string) => {
        if (value === selectedModel) {
            return;
        }
        if (client) {
            setLoadError('');
            setLoading(true);
            try {
                await changeSelectedModel(value);
                addModel(value);
                replicateStore.setState({
                    selectedModel: value
                });
            } catch (error: any) {
                setLoadError(error.message || error.toString());
            } finally {
                setLoading(false);
            }
        }
    };

    const modelOptions = availableModels.map((model) => ({ 
        label: model, 
        value: model,
        deletable: model !== selectedModel
    }));

    const renderers = createPhotoshopRenderers();
    
    return (
        <WidgetableProvider
            uploader={async (uploadInput, signal) => {
                return await client.uploadImage(uploadInput.type, uploadInput.tokenOrBuffer, 'jpg', signal);
            }}
            widgetRegistry={createBaseWidgetRegistry()}
            renderActionButtons={renderers.renderActionButtons}
            renderImageMetadata={renderers.renderImageMetadata}
        >
            <Flex gap={4} align="center">
                <Tooltip title={t('replicate.help_tooltip', 'Visit Replicate official website')}>
                    <Button
                        type="text"
                        size="small"
                        icon={<QuestionCircleOutlined />}
                        onClick={() => {
                            const banners = loadRemoteConfig('banners');
                            const replicateURL = banners.find((banner: any) => banner.type === 'replicate_tutorial' && banner.locale == language)?.link;
                            sdpppSDK.plugins.photoshop.openExternalLink({ url: replicateURL })
                        }}
                        style={{ color: 'var(--sdppp-host-text-color-secondary)' }}
                    />
                </Tooltip>
                <ModelSelector
                    value={selectedModel}
                    placeholder={t('replicate.model_placeholder')}
                    loading={loading}
                    loadError={loadError}
                    options={modelOptions}
                    onChange={handleModelChange}
                    onDelete={removeModel}
                />
            </Flex>
            {selectedModel && !loading && !loadError && <ReplicateRendererForm />}
        </WidgetableProvider>
    )
}

function ReplicateRendererForm() {
    const { t } = useTranslation()
    const currentNodes = replicateStore((state) => state.currentNodes);
    const currentValues = replicateStore((state) => state.currentValues);
    const setCurrentValues = replicateStore((state) => state.setCurrentValues);
    const selectedModel = replicateStore((state) => state.selectedModel);
    const runningTasks = replicateStore((state) => state.runningTasks);

    const { runError, progressMessage, handleRun, handleCancel, isRunning, canCancel } = useTaskExecutor({
        selectedModel,
        currentValues,
        createTask,
        runningTasks,
        beforeCreateTaskHook: (values) => {
            // Process image fields to extract URLs
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
            <Button type="primary" onClick={handleRun}>{t('replicate.execute')}</Button>
            {progressMessage && (
                <Alert 
                    message={progressMessage} 
                    type="info" 
                    showIcon
                    action={canCancel ? (
                        <Button size="small" type="text" onClick={handleCancel}>
                            {t('common.cancel')}
                        </Button>
                    ) : undefined}
                />
            )}
            {runError && <Alert message={runError} type="error" showIcon />}
            <WorkflowEditApiFormat
                modelName={selectedModel}
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