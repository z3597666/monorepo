import { Alert, Button, Flex, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { sdpppSDK } from '../../../sdk/sdppp-ps-sdk';
import { WidgetableProvider } from '../../../tsx/widgetable/context';
import './comfy_frontend.less';
import { ComfyFrontendRendererContent } from './components';
import { WorkflowListProvider } from './comfy_frontend';
import { ComfyCloudRecommendBanner } from './cloud_recommend';

const log = sdpppSDK.logger.extend("comfy-frontend")

declare const SDPPP_VERSION: string;

export function ComfyFrontendRenderer() {
    const comfyURL = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyURL);
    const comfyWebviewLoading = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewLoading);
    const comfyWebviewLoadError = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewLoadError);
    const [currentInputURL, setCurrentInputURL] = useState<string>('');
    useEffect(() => {
        if (comfyURL) {
            setCurrentInputURL(comfyURL);
        }
    }, [comfyURL]);

    return (
        <>
            <Flex gap={8}>
                <Input
                    value={currentInputURL}
                    onChange={(e) => setCurrentInputURL(e.target.value)}
                />
                {!comfyURL || comfyWebviewLoading || comfyWebviewLoadError || currentInputURL !== comfyURL ?
                    <Button type="primary" onClick={() => {
                        sdpppSDK.plugins.photoshop.setComfyWebviewURL({ url: currentInputURL });
                    }}>
                        连接
                    </Button> : null
                }
            </Flex>
            {(!comfyURL || comfyWebviewLoading || comfyWebviewLoadError || currentInputURL !== comfyURL) && <ComfyCloudRecommendBanner />}
            <WorkflowListProvider>
                <ComfyFrontendContent />
            </WorkflowListProvider>
        </>
    )
}

export function ComfyConnectStatusText() {
    const comfyWebviewConnectStatus = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewConnectStatus);
    const comfyWebviewLoadError = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewLoadError);
    const comfyWebviewLoading = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewLoading);
    const comfyHTTPCode = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyHTTPCode);
    const comfyWebviewVersion = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewVersion);
    const comfyWSState = useStore(sdpppSDK.stores.ComfyStore, (state) => state.comfyWSState);

    let statusText = ''
    let statusTextType: 'warning' | 'error' | 'info' | 'empty' = 'empty'
    let showRenderer = false

    if (comfyHTTPCode !== 200) {
        statusText = `ComfyUI加载失败，HTTP状态码：${translateHTTPCode(comfyHTTPCode)}`
        statusTextType = 'error'
    } else if (comfyWebviewLoadError) {
        statusText = comfyWebviewLoadError
        statusTextType = 'error'
    } else if (comfyWebviewLoading) {
        statusText = 'ComfyUI加载中...'
        statusTextType = 'info'
    } else if (comfyWebviewConnectStatus === 'connecting') {
        statusText = '通道连接中...'
        statusTextType = 'info'
    } else if (comfyWSState === 'reconnecting') {
        statusText = 'ComfyUI服务器重连中'
        statusTextType = 'warning'
    } else if (!comfyWebviewVersion || comfyWebviewVersion !== SDPPP_VERSION) {
        statusText = `Comfy侧SDPPP版本(${comfyWebviewVersion})与插件(${SDPPP_VERSION})不匹配，运行可能有问题`
        statusTextType = 'warning'
        showRenderer = true
    } else {
        showRenderer = true
    }

    return {
        statusText,
        statusTextType,
        showRenderer
    }
}

export function ComfyFrontendContent() {
    const comfyURL = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyURL);
    const { statusText, statusTextType, showRenderer } = ComfyConnectStatusText();

    if (!comfyURL) return null;

    return (
        // This Provider is used to provide the context for the WorkflowEditApiFormat
        // 这个Provider是必须的，因为WorkflowEditApiFormat需要使用WidgetableProvider
        <WidgetableProvider
            uploader={async (uploadInput) => {
                const { name } = await sdpppSDK.plugins.photoshop.uploadComfyImage({ uploadInput, overwrite: true });
                return name;
            }}
        >
            {statusTextType === 'empty' ? null :
                <Alert message={statusText} type={statusTextType} />}
            {showRenderer && comfyURL && <ComfyFrontendRendererContent />}
        </WidgetableProvider>
    )
}


function translateHTTPCode(code: number) {
    switch (code) {
        case 200:
            return '';
        case 404:
            return 'SDPPP可能未安装或和插件版本不匹配 (404)';
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
