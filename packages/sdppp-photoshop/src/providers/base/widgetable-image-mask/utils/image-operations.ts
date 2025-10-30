import { sdpppSDK } from '@sdppp/common';

export interface BoundaryRect {
  leftDistance: number;
  topDistance: number;
  rightDistance: number;
  bottomDistance: number;
  width: number;
  height: number;
}

export interface GetPhotoshopImageOptions {
  reverse?: boolean;
  boundary?: 'canvas' | 'curlayer' | 'selection' | BoundaryRect;
  cropBySelection?: 'no' | 'negative' | 'positive';
}

/**
 * Get images from Photoshop with proper boundary handling
 */
export const getPhotoshopImage = async (
  isMask = false,
  source: 'canvas' | 'curlayer' | 'selection',
  options: GetPhotoshopImageOptions = {}
) => {
  const {
    reverse = false,
    boundary,
    cropBySelection,
  } = options;

  let thumbnail_url: string, file_token: string, imageSource: string, result: any;

  const resolveBoundary = () => {
    if (boundary && boundary !== 'canvas' && boundary !== 'curlayer' && boundary !== 'selection') {
      return boundary;
    }

    if (boundary === 'canvas' || boundary === 'curlayer' || boundary === 'selection') {
      return boundary;
    }

    const activeDocumentID = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
    const webviewState: any = sdpppSDK.stores.WebviewStore.getState();
    const workBoundaries = webviewState.workBoundaries;
    const workBoundary = workBoundaries?.[activeDocumentID];

    if (!workBoundary || (workBoundary.width >= 999999 && workBoundary.height >= 999999)) {
      return 'canvas';
    }

    return workBoundary;
  };

  const resolveImageSize = () => {
    const activeDocumentID = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
    const webviewState: any = sdpppSDK.stores.WebviewStore.getState();
    const workBoundaryMaxSizes = (webviewState as any).workBoundaryMaxSizes || {};
    return (
      workBoundaryMaxSizes[activeDocumentID] ||
      sdpppSDK.stores.PhotoshopStore.getState().sdpppX['settings.imaging.defaultImagesSizeLimit']
    );
  };

  const boundaryParam = resolveBoundary();

  if (isMask) {
    const maskParams: any = {
      content: source,
      reverse: !!reverse,
      imageSize: resolveImageSize(),
      boundary: boundaryParam as any,
    };
    result = await sdpppSDK.plugins.photoshop.getMask(maskParams as any);
    thumbnail_url = result.thumbnail_url;
    file_token = result.file_token;
    imageSource = result.source;
  } else {
    const getImageParams = {
      content: source,
      boundary: boundaryParam,
      imageSize: resolveImageSize(),
      cropBySelection: cropBySelection ?? (reverse ? 'negative' : 'no'),
    } as const;

    result = await sdpppSDK.plugins.photoshop.getImage(getImageParams);
    thumbnail_url = result.thumbnail_url;
    file_token = result.file_token;
    imageSource = result.source;
  }

  return { thumbnail_url, file_token, source: imageSource, result };
};

/**
 * Create and handle file input for disk uploads
 */
export const createFileInput = (
  onFileSelected: (file: File) => void,
  accept = 'image/*'
): void => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = false;
  input.style.position = 'fixed';
  input.style.left = '-10000px';
  input.style.top = '-10000px';
  document.body.appendChild(input);

  const cleanup = () => {
    try {
      input.value = '';
      document.body.removeChild(input);
    } catch {}
  };

  input.onchange = () => {
    const file = input.files?.[0];
    cleanup();
    if (file) {
      onFileSelected(file);
    }
  };

  input.click();
};

/**
 * Validate if file is an image
 */
export const validateImageFile = (file: File): boolean => {
  return file.type?.startsWith('image/') || false;
};

/**
 * Create blob URL from file
 */
export const createBlobUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Revoke blob URL safely
 */
export const revokeBlobUrl = (url: string): void => {
  if (url?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
};
