// Setup why-did-you-render in development
import React from 'react'

if (import.meta.env.DEV) {
  // Dynamically import to avoid bundling in production
  // and to work in ESM/Vite without require()
  import('@welldone-software/why-did-you-render').then(({ default: whyDidYouRender }) => {
    try {
      whyDidYouRender(React, {
        trackAllPureComponents: true,
        trackHooks: true,
        logOwnerReasons: true,
      })
      // Optional: mark React on window for easier dev inspection
      // @ts-ignore
      if (typeof window !== 'undefined') window.React = React
      // @ts-ignore
      ;(React as any).whyDidYouRender = true
    } catch (e) {
      console.warn('[wdyr] Failed to init why-did-you-render', e)
    }
  })
}
