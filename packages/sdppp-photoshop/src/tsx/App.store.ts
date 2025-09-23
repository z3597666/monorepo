import { create } from 'zustand'
import { Providers } from '../providers'
import { createJSONStorage, persist } from 'zustand/middleware'
import { sdpppSDK } from '@sdppp/common'
import { loadRemoteConfig } from '@sdppp/vite-remote-config-loader'

export const MainStore = create<{
    provider: (keyof typeof Providers) | ''
    previewImageList: {
        url: string,
        thumbnail_url: string | undefined,
        nativePath: string | undefined,
        source: string,
        docId?: number,
        boundary?: any,
        width?: number,
        height?: number,
    }[]
    showingPreview: boolean
    previewError: string
    downloadAndAppendImage: (image: { url: string, source: string, docId?: number, boundary?: any }) => Promise<void>
    deletePreviewImages: (nativePaths: string[]) => Promise<void>
    setShowingPreview: (showing: boolean) => void
}>()(persist((set) => ({
    provider: '',
    previewImageList: [
    ],
    downloadAndAppendImage: async ({ url, source, docId, boundary }: { url: string, source: string, docId?: number, boundary?: any }) => {
        const res = await sdpppSDK.plugins.photoshop.downloadImage({ url: url })
        if ('error' in res) {
            set({
                previewError: res.error
            })
            return

        } else {
            set({
                previewError: '',
                previewImageList: [
                    ...MainStore.getState().previewImageList, {
                        url,
                        source,
                        thumbnail_url: res.thumbnail_url,
                        nativePath: res.nativePath,
                        docId,
                        boundary,
                        width: (res as any).width,
                        height: (res as any).height,
                    }
                ]
            })
        }
    },
    deletePreviewImages: async (nativePaths: string[]) => {
        const currentList = MainStore.getState().previewImageList

        await sdpppSDK.plugins.photoshop.deleteDownloadedImage({ nativePaths })

        set({
            previewImageList: currentList.filter(item => item.nativePath && !nativePaths.includes(item.nativePath))
        })
    },
    showingPreview: false,
    previewError: '',
    setPreviewError: (error: string) => set({ previewError: error }),
    setShowingPreview: (showing: boolean) => set({ showingPreview: showing })
}), {
    name: 'main-store',
    storage: createJSONStorage(() => ({
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
    })),
    partialize: (state) => ({
        provider: state.provider,
    }),
}))

let firstPreview = false
MainStore.subscribe((state, prevState) => {
    if (state.previewImageList.length !== prevState.previewImageList.length) {
        if (!state.previewImageList.length) {
            MainStore.setState({ showingPreview: false })
        } else {
            if (!firstPreview) {
                firstPreview = true
                MainStore.setState({ showingPreview: true })
            }
        }
    }
})

// MainStore.setState({ 
//     showingPreview: true,
//     previewImageList: [{
//         url: 'https://sdppp.zombee.tech/img/qr_manga1.jpg',
//         source: 'test',
//     }]
// })
if (process.env.NODE_ENV === 'development') {
    (globalThis as any).MainStore = MainStore
}

function updateBannerData() {
    sdpppSDK.stores.WebviewStore.setState({
        bannerData: loadRemoteConfig('banners')
    })
}

// Temporarily disabled to check if this causes re-rendering
// setTimeout(updateBannerData, 3000)
// setInterval(updateBannerData, 60000)
