import { sdpppSDK } from '@sdppp/common';

/**
 * Local copy for widgetable-image-mask: get images from Photoshop
 * Mirrors logic from widgetable-integration, with reverse/crop semantics.
 */
export const getPhotoshopImage = async (
  isMask = false,
  source: 'canvas' | 'curlayer' | 'selection',
  reverse?: boolean
) => {
  let thumbnail_url: string, file_token: string, imageSource: string, result: any;

  if (isMask) {
    const activeDocumentID = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
    const webviewState: any = sdpppSDK.stores.WebviewStore.getState();
    const workBoundaries = webviewState.workBoundaries;
    const workBoundaryMaxSizes = (webviewState as any).workBoundaryMaxSizes || {};
    const boundary = workBoundaries[activeDocumentID];

    let boundaryParam: 'canvas' | 'curlayer' | 'selection' | {
      leftDistance: number;
      topDistance: number;
      rightDistance: number;
      bottomDistance: number;
      width: number;
      height: number;
    };
    if (!boundary || (boundary.width >= 999999 && boundary.height >= 999999)) {
      boundaryParam = 'canvas';
    } else {
      boundaryParam = boundary;
    }

    const maskParams: any = {
      content: source,
      reverse: !!reverse,
      imageSize:
        workBoundaryMaxSizes[activeDocumentID] ||
        sdpppSDK.stores.PhotoshopStore.getState().sdpppX['settings.imaging.defaultImagesSizeLimit'],
      boundary: boundaryParam as any,
    };

    result = await sdpppSDK.plugins.photoshop.getMask(maskParams as any);
    thumbnail_url = result.thumbnail_url;
    file_token = result.file_token;
    imageSource = result.source;
  } else {
    const activeDocumentID = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
    const webviewState: any = sdpppSDK.stores.WebviewStore.getState();
    const workBoundaries = webviewState.workBoundaries;
    const workBoundaryMaxSizes = (webviewState as any).workBoundaryMaxSizes || {};
    const boundary = workBoundaries[activeDocumentID];

    let boundaryParam: 'canvas' | 'curlayer' | 'selection' | {
      leftDistance: number;
      topDistance: number;
      rightDistance: number;
      bottomDistance: number;
      width: number;
      height: number;
    };
    if (!boundary || (boundary.width >= 999999 && boundary.height >= 999999)) {
      boundaryParam = 'canvas';
    } else {
      boundaryParam = boundary;
    }

    const getImageParams = {
      content: source,
      boundary: boundaryParam,
      imageSize:
        workBoundaryMaxSizes[activeDocumentID] ||
        sdpppSDK.stores.PhotoshopStore.getState().sdpppX['settings.imaging.defaultImagesSizeLimit'],
      cropBySelection: reverse ? 'negative' : 'no',
    } as const;

    result = await sdpppSDK.plugins.photoshop.getImage(getImageParams);
    thumbnail_url = result.thumbnail_url;
    file_token = result.file_token;
    imageSource = result.source;
  }

  return { thumbnail_url, file_token, source: imageSource, result };
};

