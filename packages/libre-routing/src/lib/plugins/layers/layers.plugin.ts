import { LayerSpecification } from 'maplibre-gl';

import { LibreRouting } from '../../libre-routing';
import { LibreRoutingConsts } from '../../consts';
import { mergeDeep } from '../../utils/object';
import { routeLayer, waypointsLayer } from './layers';

import type { LibreRoutingPlugin } from '..';

export interface LayerConfig {
  before?: string;
  style: LayerSpecification | {};
}

export interface LayersPluginOptions {
  layers: LayerConfig[];
}

export class LayersPlugin implements LibreRoutingPlugin {
  private ctx!: LibreRouting;
  private options!: LayersPluginOptions;

  private get map() {
    return this.ctx.map;
  }

  constructor(private _options: Partial<LayersPluginOptions> = {}) {}

  onAdd(ctx: LibreRouting) {
    this.ctx = ctx;
    this.options = mergeDeep(this.defaultConfig(), this._options);

    this.options.layers.forEach((layer) => {
      // @ts-ignore
      this.map.addLayer(layer.style, layer.before);
    });
  }

  onRemove() {
    this.map.removeLayer('route');
    this.map.removeLayer('waypoints');
  }

  private defaultConfig(): LayersPluginOptions {
    return {
      layers: [
        {
          style: routeLayer(
            LibreRoutingConsts.RouteLayerId,
            this.ctx.options.routeSourceId
          ),
        },
        {
          style: waypointsLayer(
            LibreRoutingConsts.WaypointsLayerId,
            this.ctx.options.waypointsSourceId
          ),
        },
      ],
    };
  }
}
