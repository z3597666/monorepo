import { WidgetableImagesWidget } from '@sdppp/common/schemas/schemas';
import { WidgetRenderer } from '@sdppp/widgetable-ui';
import React, { useMemo } from 'react';
import { SyncSelector } from '../components/SyncSelector';
import { SelectionPreview } from '../components/SelectionPreview';

interface SelectionPreviewConfig {
  description?: string;
  placeholder?: string;
}

const coerceString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const normalizeToken = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return undefined;
};

const extractMatchFromCandidate = (candidate: any): SelectionPreviewConfig | null => {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const potentialSources = [
    candidate,
    typeof candidate.params === 'object' ? candidate.params : null,
    typeof candidate.options === 'object' ? candidate.options : null,
  ].filter(Boolean) as Record<string, any>[];

  for (const source of potentialSources) {
    const content = normalizeToken(
      source.content ?? source.sourceContent ?? source.photoshopContent ?? source.psContent
    );
    const boundary = normalizeToken(
      source.boundary ?? source.boundaryType ?? source.workBoundary ?? source.selectionBoundary
    );
    const crop = normalizeToken(
      source.cropBySelection ??
      source.cropbyselection ??
      source['crop-by-selection'] ??
      source.crop_by_selection ??
      source.cropSelection
    );

    const isNewDefault =
      content === 'canvas' && boundary === 'selection' && crop === 'positive';
    const isLegacyDefault =
      content === 'canvas' && boundary === 'canvas' && crop === 'negative';

    if (isNewDefault || isLegacyDefault) {
      return {
        description: coerceString(
          candidate.selectionPreviewDescription ??
          source.selectionPreviewDescription ??
          candidate.description
        ),
        placeholder: coerceString(
          candidate.selectionPreviewPlaceholder ??
          source.selectionPreviewPlaceholder ??
          candidate.placeholder
        ),
      };
    }
  }

  return null;
};

const findSelectionPreviewConfig = (
  root: any,
  visited: WeakSet<object> = new WeakSet()
): SelectionPreviewConfig | null => {
  if (!root || typeof root !== 'object') {
    return null;
  }
  if (visited.has(root)) {
    return null;
  }
  visited.add(root);

  const directMatch = extractMatchFromCandidate(root);
  if (directMatch) {
    return directMatch;
  }

  if (root.params && typeof root.params === 'object') {
    const paramsMatch =
      extractMatchFromCandidate(root.params) ?? findSelectionPreviewConfig(root.params, visited);
    if (paramsMatch) {
      return {
        description:
          paramsMatch.description ??
          coerceString(root.selectionPreviewDescription ?? root.description),
        placeholder:
          paramsMatch.placeholder ??
          coerceString(root.selectionPreviewPlaceholder ?? root.placeholder),
      };
    }
  }

  const entries = Array.isArray(root) ? root : Object.values(root);
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const match = findSelectionPreviewConfig(entry, visited);
    if (match) {
      return match;
    }
  }

  return null;
};

const deriveSelectionPreviewConfig = (
  widget: WidgetableImagesWidget,
  extraOptions: any,
  widgetableId: string
): SelectionPreviewConfig | null => {
  const widgetOptions: any = widget.options || {};
  if (widgetOptions?.selectionPreview) {
    return {
      description: coerceString(widgetOptions.selectionPreviewDescription),
      placeholder: coerceString(widgetOptions.selectionPreviewPlaceholder),
    };
  }

  const roots: any[] = [];

  if (extraOptions && typeof extraOptions === 'object') {
    if (widgetableId && extraOptions[widgetableId]) {
      roots.push(extraOptions[widgetableId]);
    }
    if (extraOptions.selectionPreviewConfig) {
      roots.push(extraOptions.selectionPreviewConfig);
    }
    if (extraOptions.selectionPreview) {
      roots.push(extraOptions.selectionPreview);
    }
    roots.push(extraOptions);
  }

  const visited = new WeakSet<object>();
  for (const root of roots) {
    const match = findSelectionPreviewConfig(root, visited);
    if (match) {
      return match;
    }
  }

  return null;
};

// 创建一个真正的React组件来处理hooks
const ImagesWidgetComponent: React.FC<{
  widgetableId: string;
  widget: WidgetableImagesWidget;
  value: string[];
  onValueChange: (value: string[]) => void;
  extraOptions?: any;
}> = ({ widgetableId, widget, value, onValueChange, extraOptions }) => {
  const selectionPreviewConfig = useMemo(
    () => deriveSelectionPreviewConfig(widget, extraOptions, widgetableId),
    [widget, extraOptions, widgetableId]
  );

  const shouldUseClassicSelector = useMemo(() => {
    const widgetOptions: any = widget.options || {};
    if (widgetOptions?.selectionPreview === false || widgetOptions?.useSyncSelector === true) {
      return true;
    }

    const globalOptions = (extraOptions && typeof extraOptions === 'object') ? extraOptions : {};
    const directFlag =
      globalOptions?.selectionPreview === false || globalOptions?.useSyncSelector === true;
    if (directFlag) return true;

    const scoped = widgetableId && typeof globalOptions?.[widgetableId] === 'object'
      ? globalOptions[widgetableId]
      : null;
    if (scoped && (scoped.selectionPreview === false || scoped.useSyncSelector === true)) {
      return true;
    }

    return false;
  }, [widget.options, extraOptions, widgetableId]);

  if (shouldUseClassicSelector) {
    return (
      <SyncSelector
        widgetableId={widgetableId}
        value={value}
        onValueChange={onValueChange}
        maxCount={widget.options?.maxCount || 1}
        extraOptions={extraOptions}
        isMask={false}
      />
    );
  }

  return (
    <SelectionPreview
      widgetableId={widgetableId}
      widget={widget}
      value={value}
      onValueChange={onValueChange}
      description={selectionPreviewConfig?.description}
      placeholder={selectionPreviewConfig?.placeholder}
    />
  );
};

export const imagesWidgetRenderer: WidgetRenderer = ({
  fieldInfo,
  widget,
  widgetIndex,
  value,
  onValueChange,
  extraOptions,
}) => {
  const imageWidget = widget as WidgetableImagesWidget;

  return (
    <ImagesWidgetComponent
      widgetableId={fieldInfo.id}
      widget={imageWidget}
      value={value}
      onValueChange={onValueChange}
      extraOptions={extraOptions}
    />
  );
};
