import { Alert, Button, Flex, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { sdpppSDK } from '../../../sdk/sdppp-ps-sdk';
import { WidgetableProvider } from '../../../tsx/widgetable/context';
import './comfy_frontend.less';
import { ComfyFrontendRendererContent } from './components';
import { WorkflowListProvider } from './comfy_frontend';
import { ComfyCloudRecommendBanner } from './cloud_recommend';
import { useI18n } from '@sdppp/common';

const log = sdpppSDK.logger.extend("comfy-frontend")

declare const SDPPP_VERSION: string;

export function ComfyFrontendRenderer() {
    const { t } = useI18n()
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
                        {t('comfy.connect')}
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
    const { t } = useI18n()
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
        statusText = t('comfy.load_failed', { code: translateHTTPCode(comfyHTTPCode) })
        statusTextType = 'error'
    } else if (comfyWebviewLoadError) {
        statusText = comfyWebviewLoadError
        statusTextType = 'error'
    } else if (comfyWebviewLoading) {
        statusText = t('comfy.loading')
        statusTextType = 'info'
    } else if (comfyWebviewConnectStatus === 'connecting') {
        statusText = t('comfy.channel_connecting')
        statusTextType = 'info'
    } else if (comfyWSState === 'reconnecting') {
        statusText = t('comfy.server_reconnecting')
        statusTextType = 'warning'
    } else {
        showRenderer = true
    }
    if (comfyHTTPCode === 200 && (!comfyWebviewVersion || comfyWebviewVersion !== SDPPP_VERSION)) {
        statusText = t('comfy.version_mismatch', { comfyVersion: comfyWebviewVersion, pluginVersion: SDPPP_VERSION })
        statusTextType = statusTextType == 'error' ? 'error' : 'warning'
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
            uploader={async (uploadInput, signal) => {
                // Check if already aborted
                if (signal?.aborted) {
                    throw new DOMException('Upload aborted', 'AbortError');
                }
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
    const { t } = useI18n()

    switch (code) {
        case 200:
            return '';
        case 404:
            return t('http.404');
        case 401:
            return t('http.401');
        case 403:
            return t('http.403');
        case 408:
            return t('http.408');
        case 500:
            return t('http.500');
        case 501:
            return t('http.501');
        case 502:
            return t('http.502');
        case 503:
            return t('http.503');
        case 504:
            return t('http.504');
        default:
            return t('http.unknown', { code });
    }
}
