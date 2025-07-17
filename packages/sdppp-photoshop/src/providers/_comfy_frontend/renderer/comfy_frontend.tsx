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
    const comfyWebviewConnectStatus = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewConnectStatus);
    const comfyWebviewHTTPCode = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewHTTPCode);
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
            uploader={async (uploadInput) => {
                const { name } = await sdpppSDK.plugins.ComfyCaller.uploadImage(uploadInput);
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

            {comfyWebviewLoadError ? (
                <Alert message={comfyWebviewLoadError} type="error" />
            ) : comfyWebviewLoading ? (
                <Alert message="ComfyUI加载中..." type="info" />
            ) : comfyWebviewConnectStatus === 'timedout' ? (
                comfyWebviewHTTPCode !== 200 ? (
                    <Alert message={`ComfyUI连接失败，HTTP状态码：${translateHTTPCode(comfyWebviewHTTPCode)}`} type="error" />
                ) : <Alert message="连接超时或失败" type="error" />
            ) : comfyWebviewConnectStatus === 'connecting' ? (
                <Alert message="连接中..." type="info" />
            ) :
                (comfyWebviewURL && <ComfyFrontendRendererContent />)
            }
        </WidgetableProvider>
    )
}


function translateHTTPCode(code: number) {
    switch (code) {
        case 200:
            return '';
        case 404:
            return '未找到 (404)';
        case 401:
            return '未授权 (401)';
        case 403:
            return '禁止访问 (403)';
        case 408:
            return '请求超时 (408)';
        case 500:
            return '服务器错误 (500)';
        case 501:
            return '未实现 (501)';
        case 502:
            return '网关错误 (502)';
        case 503:
            return '服务不可用 (503)';
        case 504:
            return '网关超时 (504)';
        default:
            return `未知错误（${code}）`;
    }
}