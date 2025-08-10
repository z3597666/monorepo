import './polyfill';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './sdk/sdppp-ps-sdk.js'
import './index.css'

declare const sdpppSDK: any;

(async () => {
    await sdpppSDK.init();
    const { default: App } = await import('./tsx/App.jsx')

    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <App />
        </StrictMode>,
    )
})().catch(console.error)