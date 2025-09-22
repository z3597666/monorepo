import { useStore } from "zustand";
import { Providers, PROVIDER_METADATA } from "../../providers";
import { MainStore } from "../App.store";
import { Select } from "antd";
import { useEffect, useMemo } from "react";
import { sdpppSDK, useTranslation } from '@sdppp/common';
import { ProviderCardSelector } from "../components/ProviderCardSelector";

export function SDPPPGateway() {
    const { t } = useTranslation()
    const provider = MainStore(state => state.provider)
    const sdpppX = useStore(sdpppSDK.stores.PhotoshopStore, state => state.sdpppX)

    const Renderer = useMemo(() => {
        // Backward compatibility: map old 'Google' key to 'CustomAPI'
        const key = provider === 'Google' ? 'CustomAPI' : provider
        return key && Providers[key as keyof typeof Providers] ? Providers[key as keyof typeof Providers].Renderer : null
    }, [provider])
    const forceProvider = sdpppX?.["settings.forceProvider"]
    const showingPreview = MainStore(state => state.showingPreview)
    useEffect(()=> {
        if (forceProvider && forceProvider !== provider) {
            const mapped = forceProvider === 'Google' ? 'CustomAPI' : forceProvider
            MainStore.setState({ provider: mapped as (keyof typeof Providers) | '' })
        }
    }, [forceProvider])
    // Normalize persisted old key
    useEffect(()=> {
        if (provider === 'Google') {
            MainStore.setState({ provider: 'CustomAPI' })
        }
    }, [])
    
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
                        <Select.Option value="">{t('gateway.select_ai_service', 'Select AI Service')}</Select.Option>
                        {
                            Object.keys(Providers).map(key => (
                                <Select.Option key={key} value={key}>{PROVIDER_METADATA[key].name}</Select.Option>
                            ))
                        }
                    </Select>
                )
            ) : null
        }
        {Renderer && <Renderer showingPreview={showingPreview} />}
    </>
}
