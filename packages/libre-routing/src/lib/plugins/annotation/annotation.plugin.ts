import { LngLatBounds, Map, Popup } from 'maplibre-gl';
import { LibreRouting } from '../../libre-routing';
import { BBox, featureCollection, point } from '@turf/helpers';
import { wrap } from 'comlink';
import bbox from '@turf/bbox';
import { debounce, throttle } from '../../utils/concurency';
import { LibreRoutingPlugin } from '..';
import { LibreRoutingConsts } from '../../consts';
import { AnnotationWorkerApi } from './annotation.worker';
import {
  AnnotationPopupComponent,
  AnnotationPopupComponentI,
} from './popup-component';

export interface AnnotationPluginOptions {
  routeLayerId: string;
  componentFactory(
    id,
    routeData: any,
    ctx: LibreRouting
  ): AnnotationPopupComponentI;
}

const defaultConfig: AnnotationPluginOptions = {
  routeLayerId: LibreRoutingConsts.RouteLayerId,
  componentFactory(routeId, data, ctx) {
    return new AnnotationPopupComponent(routeId, data, ctx);
  },
};

export class AnnotationPlugin implements LibreRoutingPlugin {
  private map!: Map;
  private mapBounds!: LngLatBounds;
  private bounds?: BBox;
  private worker: Worker;
  private popups: Popup[] = [];
  private allInBbox = false;
  private currentFeatures: any[] = [];
  private ctx?: LibreRouting;
  private options: AnnotationPluginOptions;
  private workerApi: AnnotationWorkerApi;
  private data;
  private components: AnnotationPopupComponentI[] = [];

  constructor(options = {}) {
    this.options = { ...defaultConfig, ...options };
    this.worker = new Worker(new URL('./annotation.worker', import.meta.url), {
      type: 'module',
    });

    // @ts-ignore
    this.workerApi = wrap(this.worker);
  }

  onAdd(ctx: LibreRouting) {
    const debounced = debounce(() => this.recalculate(), 200, false);

    this.ctx = ctx;
    this.map = ctx.map;

    this.ctx.on('routeCalculated', async (data) => {
      this.data = data;
      this.destroyView();

      const pendingRequests =
        await ctx.options.dataProvider.hasPendingRequests();

      if (!pendingRequests) {
        await this.workerApi.createChunks(data);

        await this.recalculate(true);
      }
    });

    this.map.on('moveend', async () => {
      debounced();
    });
  }

  onRemove() {
    this.worker.terminate();
  }

  private async recalculate(force = false) {
    this.mapBounds = this.map.getBounds();

    if (
      this.bounds &&
      this.bounds.length === 4 &&
      this.mapBounds.contains([this.bounds[0], this.bounds[1]]) &&
      this.mapBounds.contains([this.bounds[2], this.bounds[3]]) &&
      this.allInBbox &&
      !force
    ) {
      return;
    }

    const sw = this.mapBounds.getSouthWest();
    const ne = this.mapBounds.getNorthEast();

    const { points, allInBbox } = await this.workerApi.recalculatePos({
      bbox: { sw, ne },
      popup: null,
    });

    if (!points.length) return;

    const mathedFeatures = points
      .map((point) => {
        const xy = this.map.project(point.lngLat);

        return this.map.queryRenderedFeatures(xy, {
          layers: [this.options.routeLayerId],
        })[0] as any;
      })
      .filter((d) => !!d);

    const matchedIds = mathedFeatures.map((f) => f.properties.routeIndex);
    const currentFeatures = this.currentFeatures.map(
      (f) => f.properties.routeIndex
    );

    if (
      matchedIds.toString() === currentFeatures.toString() &&
      this.bounds &&
      this.bounds.length === 4 &&
      this.mapBounds.contains([this.bounds[0], this.bounds[1]]) &&
      this.mapBounds.contains([this.bounds[2], this.bounds[3]]) &&
      !force
    ) {
      return;
    }

    this.destroyView();

    this.currentFeatures = mathedFeatures;
    this.allInBbox = allInBbox;

    this.bounds = bbox(featureCollection(points.map((p) => point(p.lngLat))));

    this.components = [];

    points.forEach((point, index) => {
      const component = this.options.componentFactory(
        index,
        this.data,
        this.ctx!
      );

      const popup = new Popup({
        closeButton: false,
        anchor: point.anchor,
        closeOnClick: false,
        className: 'no-mouse-events',
      })
        .setLngLat(point.lngLat)
        .setDOMContent(component.container)
        .on('click', console.log)
        .addTo(this.map);

      const popupElem = popup.getElement();
      (
        popupElem.querySelector('.maplibregl-popup-content') as any
      ).style.padding = '0';

      this.components.push(component);
      this.popups.push(popup);
    });
  }

  private destroyView() {
    this.allInBbox = false;
    this.components.forEach((c) => c.destroy());
    this.popups.forEach((p) => p.remove());

    this.popups = [];
    this.components = [];
  }
}
