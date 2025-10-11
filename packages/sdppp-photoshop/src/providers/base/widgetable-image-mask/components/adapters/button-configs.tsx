import React from 'react';
import { useTranslation } from '@sdppp/common/i18n/react';
import type { ButtonConfig } from '@sdppp/ui-library';
import { useEffect, useState } from 'react';

export function useButtonConfigs(isMask: boolean): ButtonConfig[] {
  const { t } = useTranslation();
  const [altActive, setAltActive] = useState(false);

  // Maintain Alt key active state locally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.getModifierState?.('Alt')) setAltActive(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      // If Alt released or modifier no longer active
      if (e.key === 'Alt' || !e.altKey) setAltActive(false);
    };
    const handleBlur = () => setAltActive(false);

    document.body.addEventListener('keydown', handleKeyDown);
    document.body.addEventListener('keyup', handleKeyUp);
    document.body.addEventListener('blur', handleBlur);
    return () => {
      document.body.removeEventListener('keydown', handleKeyDown);
      document.body.removeEventListener('keyup', handleKeyUp);
      document.body.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Helper to render multi-line tooltip using <div> for line breaks
  const renderTooltip = (lines: Array<string | undefined | null>) => (
    <div>
      {lines.filter(Boolean).map((line, idx) => (
        <div key={idx}>{line}</div>
      ))}
    </div>
  );

  // Build tooltip lines first, then render using divs to break lines
  const canvasLines = [t('image.upload.tooltip.image.canvas'), t('image.upload.tooltip.alt.crop')];
  const curlayerLines = isMask
    ? [t('image.upload.tooltip.mask.curlayer'), t('image.upload.tooltip.alt.reverse')]
    : [t('image.upload.tooltip.image.curlayer'), t('image.upload.tooltip.alt.crop')];
  const selectionLines = [t('image.upload.tooltip.mask.selection'), t('image.upload.tooltip.alt.reverse')];

  const canvasSyncTooltip = renderTooltip(canvasLines);
  const curlayerSyncTooltip = renderTooltip(curlayerLines);
  const selectionSyncTooltip = renderTooltip(selectionLines);

  // Build concise desc text when Alt is active
  // Mask: show "(reversed)"; Image: show "(selection)"
  const altDescMask = altActive ? '(reversed)' : undefined;
  const altDescImage = altActive ? '(selection)' : undefined;

  // Mask widget: order = selection -> curlayer -> canvas; canvas has no auto button
  if (isMask) {
    return [
      {
        id: 'selection',
        text: t('image.upload.from_selection', { defaultMessage: 'Selection' }),
        descText: altDescMask,
        supportsAutoSync: true,
        syncButtonTooltip: selectionSyncTooltip,
        autoSyncButtonTooltips: {
          enabled: renderTooltip([t('image.upload.tooltip.autosync.on'), ...selectionLines]),
          disabled: renderTooltip([t('image.upload.tooltip.autosync.off'), ...selectionLines]),
        },
      },
      {
        id: 'curlayer',
        text: t('image.upload.from_curlayer', { defaultMessage: 'Current Layer' }),
        descText: altDescMask,
        supportsAutoSync: true,
        syncButtonTooltip: curlayerSyncTooltip,
        autoSyncButtonTooltips: {
          enabled: renderTooltip([t('image.upload.tooltip.autosync.on'), ...curlayerLines]),
          disabled: renderTooltip([t('image.upload.tooltip.autosync.off'), ...curlayerLines]),
        },
      },
      {
        id: 'canvas',
        text: t('image.upload.from_canvas', { defaultMessage: 'Canvas' }),
        descText: altDescMask,
        supportsAutoSync: false,
        syncButtonTooltip: renderTooltip([t('image.upload.tooltip.mask.canvas')]),
      },
    ];
  }

  // Image widget (non-mask): keep original order
  return [
    {
      id: 'canvas',
      text: t('image.upload.from_canvas', { defaultMessage: 'Canvas' }),
      descText: altDescImage,
      supportsAutoSync: true,
      syncButtonTooltip: canvasSyncTooltip,
      autoSyncButtonTooltips: {
        enabled: renderTooltip([t('image.upload.tooltip.autosync.on'), ...canvasLines]),
        disabled: renderTooltip([t('image.upload.tooltip.autosync.off'), ...canvasLines]),
      },
    },
    {
      id: 'curlayer',
      text: t('image.upload.from_curlayer', { defaultMessage: 'Current Layer' }),
      descText: altDescImage,
      supportsAutoSync: true,
      syncButtonTooltip: curlayerSyncTooltip,
      autoSyncButtonTooltips: {
        enabled: renderTooltip([t('image.upload.tooltip.autosync.on'), ...curlayerLines]),
        disabled: renderTooltip([t('image.upload.tooltip.autosync.off'), ...curlayerLines]),
      },
    },
    {
      id: 'disk',
      text: t('image.upload.from_harddisk'),
      supportsAutoSync: false,
      syncButtonTooltip: '',
    },
  ];
}
