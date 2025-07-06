import React from 'react';
import './comfy_frontend.less';
import { Input, Flex, Button, Alert } from 'antd';
import { useEffect, useState } from 'react';
import { WidgetableProvider } from '../../../tsx/widgetable/context';
import { sdpppSDK } from '../../../sdk/sdppp-ps-sdk';
import { ComfyFrontendRendererContent } from './components';
import { useStore } from 'zustand';
import { v4 } from 'uuid';

export function ComfyFrontendRenderer() {
    const comfyWebviewURL = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewURL);
    const comfyWebviewLoading = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewLoading);
    const comfyWebviewLoadError = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewLoadError);
    const [currentInputURL, setCurrentInputURL] = useState<string>('');
    useEffect(() => {
        if (comfyWebviewURL) {
            setCurrentInputURL(comfyWebviewURL);
        }
    }, [comfyWebviewURL]);

    return (
        // This Provider is used to provide the context for the WorkflowEditApiFormat
        // 这个Provider是必须的，因为WorkflowEditApiFormat需要使用WidgetableProvider
        <WidgetableProvider
            uploader={async (fileBuffer, fileName) => {
                fileName = v4() + '_' + fileName;
                const { name } = await sdpppSDK.plugins.ComfyCaller.uploadImage(fileBuffer, fileName);
                return name;
            }}
        >
            <Flex gap={8}>
                <Input
                    value={currentInputURL}
                    onChange={(e) => setCurrentInputURL(e.target.value)}
                />
                {!comfyWebviewURL || comfyWebviewLoading || comfyWebviewLoadError || currentInputURL !== comfyWebviewURL ?
                    <Button type="primary" onClick={() => {
                        sdpppSDK.stores.PhotoshopActionStore.getState().setComfyWebviewURL(currentInputURL);
                    }}>
                        连接
                    </Button> : null
                }
            </Flex>
            {comfyWebviewLoadError && <Alert message={comfyWebviewLoadError} type="error" />}
            {comfyWebviewURL && !comfyWebviewLoading && !comfyWebviewLoadError && <ComfyFrontendRendererContent />}
        </WidgetableProvider>
    )
}
