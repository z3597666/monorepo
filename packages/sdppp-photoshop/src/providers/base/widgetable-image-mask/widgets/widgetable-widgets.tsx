import { WidgetableRegistry } from '@sdppp/widgetable-ui';
import { imagesWidgetRenderer } from './images-widget';
import { masksWidgetRenderer } from './masks-widget';

// Register the new widget renderers
WidgetableRegistry.register('images', imagesWidgetRenderer);
WidgetableRegistry.register('masks', masksWidgetRenderer);

// Re-export for convenience
export { imagesWidgetRenderer, masksWidgetRenderer };