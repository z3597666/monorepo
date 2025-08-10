import { Alert, Button, Flex, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { sdpppSDK } from '../../../sdk/sdppp-ps-sdk';
import { WidgetableProvider } from '../../../tsx/widgetable/context';
import './comfy_frontend.less';
import { ComfyFrontendRendererContent } from './components';

declare const SDPPP_VERSION: string;

export function ComfyFrontendRenderer() {
    const comfyURL = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyURL);
    const comfyWebviewLoading = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewLoading);
    const comfyWebviewLoadError = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewLoadError);
    const comfyWebviewConnectStatus = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewConnectStatus);
    const [currentInputURL, setCurrentInputURL] = useState<string>('');
    useEffect(() => {
        if (comfyURL) {
            setCurrentInputURL(comfyURL);
        }
    }, [comfyURL]);

    return (
        // This Provider is used to provide the context for the WorkflowEditApiFormat
        // 这个Provider是必须的，因为WorkflowEditApiFormat需要使用WidgetableProvider
        <WidgetableProvider
            uploader={async (uploadInput) => {
                const { name } = await sdpppSDK.plugins.photoshop.uploadComfyImage({ uploadInput, overwrite: true });
                return name;
            }}
        >
            <Flex gap={8}>
                <Input
                    value={currentInputURL}
                    onChange={(e) => setCurrentInputURL(e.target.value)}
                />
                {!comfyURL || comfyWebviewLoading || comfyWebviewLoadError || currentInputURL !== comfyURL || comfyWebviewConnectStatus === 'timedout' ?
                    <Button type="primary" onClick={() => {
                        sdpppSDK.plugins.photoshop.setComfyWebviewURL({ url: currentInputURL });
                    }}>
                        连接
                    </Button> : null
                }
            </Flex>

            {ComfyFrontendContent()}
        </WidgetableProvider>
    )
}

function ComfyFrontendContent() {
    const comfyURL = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyURL);
    const comfyHTTPCode = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyHTTPCode);
    const comfyWebviewLoading = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewLoading);
    const comfyWebviewLoadError = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewLoadError);
    const comfyWebviewConnectStatus = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewConnectStatus);
    const comfyWebviewVersion = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewVersion);

    if (!comfyURL) return null;

    return (

        comfyWebviewLoadError ? (
            <Alert message={comfyWebviewLoadError} type="error" />
        ) : comfyWebviewLoading ? (
            <Alert message="ComfyUI加载中..." type="info" />
        ) : comfyWebviewConnectStatus === 'timedout' ? (
            comfyHTTPCode !== 200 ? (
                <Alert message={`ComfyUI连接失败，HTTP状态码：${translateHTTPCode(comfyHTTPCode)}`} type="error" />
            ) : <Alert message="连接超时或失败" type="error" />
        ) : comfyWebviewConnectStatus === 'connecting' ? (
            <Alert message="连接中..." type="info" />
        ) :
            <>
                {comfyWebviewVersion && comfyWebviewVersion !== SDPPP_VERSION && <Alert message={`Comfy侧SDPPP版本与插件不匹配，运行可能有问题`} type="warning" />}
                {(comfyURL && <ComfyFrontendRendererContent />)}
            </>
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
