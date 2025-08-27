import { useStore } from "zustand";
import { Providers } from "../../providers";
import { MainStore } from "../App.store";
import { Select } from "antd";
import { useEffect, useMemo } from "react";
import { sdpppSDK } from "../../sdk/sdppp-ps-sdk";

export function SDPPPGateway() {
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
            !showingPreview && !forceProvider ? <Select
                className='app-select'
                showSearch={true}
                value={provider}
                onChange={value => MainStore.setState({ provider: value as (keyof typeof Providers) | '' })}
            >
                <Select.Option value="">请选择AI服务</Select.Option>
                {
                    Object.keys(Providers)
                        .map(key => <Select.Option key={key} value={key}>{key}</Select.Option>)
                }
            </Select> : null
        }
        {Renderer && <Renderer showingPreview={showingPreview} />}
    </>
}