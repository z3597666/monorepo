import './polyfill';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { setStorageAdapter, init as initRemoteConfig } from '@sdppp/vite-remote-config-loader'
import './sdk/sdppp-ps-sdk.js'


declare const sdpppSDK: any;

(async () => {
    console.log('init')
    await sdpppSDK.init();
    console.log('inited')
    setStorageAdapter({
        getItem: async (key) => {
            const result = await sdpppSDK.plugins.photoshop.getStorage({ key });
            return result.error ? null : result.value;
        },
        setItem: async (key, value) => {
            await sdpppSDK.plugins.photoshop.setStorage({ key, value });
        },
        removeItem: async (key) => {
            await sdpppSDK.plugins.photoshop.removeStorage({ key });
        }
    })
    await initRemoteConfig();
    const { default: App } = await import('./tsx/App.jsx')

    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <App />
        </StrictMode>,
    )
})().catch(console.error)