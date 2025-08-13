import { Providers } from "../../providers";
import { MainStore } from "../App.store";
import ImagePreview from "../components/ImagePreview";
import { Select } from "antd";
import { useMemo } from "react";

export function SDPPPGateway() {
    const provider = MainStore(state => state.provider)

    const Renderer = useMemo(() => {
        return provider ? Providers[provider].Renderer : null
    }, [provider])
    
    const showingPreview = MainStore(state => state.showingPreview)
    return <>
        {
            !showingPreview ? <Select
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
        {
            showingPreview ? <ImagePreview /> : null
        }
        {Renderer && <Renderer showingPreview={showingPreview} />}
    </>
}