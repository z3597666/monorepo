import { useStore } from "zustand";
import { Providers } from "../../providers";
import { MainStore } from "../App.store";
import { Select } from "antd";
import { useEffect, useMemo } from "react";
import { sdpppSDK } from "../../sdk/sdppp-ps-sdk";
import { useTranslation } from '@sdppp/common';
import { ProviderCardSelector } from "../components/ProviderCardSelector";

export function SDPPPGateway() {
    const { t } = useTranslation()
    const provider = MainStore(state => state.provider)
    const sdpppX = useStore(sdpppSDK.stores.PhotoshopStore, state => state.sdpppX)

    const Renderer = useMemo(() => {
        return provider && Providers[provider] ? Providers[provider].Renderer : null
    }, [provider])
    const forceProvider = sdpppX?.["settings.forceProvider"]
    const showingPreview = MainStore(state => state.showingPreview)
    useEffect(()=> {
        if (forceProvider && forceProvider !== provider) {
            MainStore.setState({ provider: forceProvider as (keyof typeof Providers) | '' })
        }
    }, [forceProvider])
    
    return <>
        {
            !showingPreview && !forceProvider ? (
                !provider ? (
                    <ProviderCardSelector
                        selectedProvider={provider}
                        onProviderSelect={(providerId) => MainStore.setState({ provider: providerId as (keyof typeof Providers) | '' })}
                        availableProviders={Object.keys(Providers)}
                    />
                ) : (
                    <Select
                        className='app-select'
                        showSearch={true}
                        value={provider}
                        onChange={value => MainStore.setState({ provider: value as (keyof typeof Providers) | '' })}
                    >
                        <Select.Option value="">{t('gateway.select_ai_service')}</Select.Option>
                        {
                            Object.keys(Providers)
                                .map(key => <Select.Option key={key} value={key}>{key}</Select.Option>)
                        }
                    </Select>
                )
            ) : null
        }
        {Renderer && <Renderer showingPreview={showingPreview} />}
    </>
}