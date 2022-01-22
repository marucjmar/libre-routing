import type { LibreRouting } from '../libre-routing';

export interface LibreRoutingPlugin {
  onAdd(libreRouting: LibreRouting): void;
  onRemove(libreRouting: LibreRouting): void;
}

export * from './mouse/mouse.plugin';
export * from './layers/layers.plugin';
export * from './annotation/annotation.plugin';
