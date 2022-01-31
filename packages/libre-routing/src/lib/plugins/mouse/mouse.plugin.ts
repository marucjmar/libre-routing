import { Map, MapMouseEvent } from 'maplibre-gl';
import {
  featureCollection,
  FeatureCollection,
  Point,
  point,
} from '@turf/helpers';

import { LibreRoutingConsts } from '../../consts';
import { throttle } from '../../utils/concurency';
import { Dispatcher } from '../../utils/dispatcher';

import type { LibreRoutingPlugin } from '..';
import type { LngLatPosition, LibreRouting } from '../../libre-routing';

type MousePluginOptions = {
  calculateOnFly: boolean;
  routeLayerId: string;
  waypointsLayerId: string;
  pointLayerId: string;
};

const defaultConfig: MousePluginOptions = {
  calculateOnFly: true,
  routeLayerId: LibreRoutingConsts.RouteLayerId,
  waypointsLayerId: LibreRoutingConsts.WaypointsLayerId,
  pointLayerId: 'route-point',
};

const resolveOptions = (
  ctx: LibreRouting,
  options: MousePluginOptions
): MousePluginOptions => {
  return {
    ...options,
    routeLayerId: ctx.getUniqueName(options.routeLayerId),
    waypointsLayerId: ctx.getUniqueName(options.waypointsLayerId),
    pointLayerId: ctx.getUniqueName(options.pointLayerId),
  };
};

export class MousePlugin implements LibreRoutingPlugin {
  private mapMoveHandler = throttle(this.onMapMove.bind(this), 50, {
    leading: true,
    trailing: true,
  });
  private mapClickHandler = this.onMapClick.bind(this);
  private mousedownHandler = this.onMousedown.bind(this);
  private mouseupHandler = this.onMouseup.bind(this);
  private point: FeatureCollection<Point> = featureCollection([point([0, 0])]);
  private waypoints = [];

  private _waypointOrigin;

  private options: MousePluginOptions;
  private ctx!: LibreRouting;
  private map!: Map;
  private dispatcher: Dispatcher;
  private recalculateHandler = throttle(
    () => {
      this.ctx.recalculateRoute().catch(() => null);
    },
    100,
    { leading: true, trailing: true }
  );

  private _dirty = false;

  private set waypointOrigin(value: number | null | undefined) {
    this._waypointOrigin = value;
    this._dirty = !!value?.toString();
    this.fire('dirty', this._dirty);
  }

  private get waypointOrigin(): number {
    return this._waypointOrigin;
  }

  public get dirty() {
    return this._dirty;
  }

  constructor(options?: Partial<MousePluginOptions>) {
    this.dispatcher = new Dispatcher();
    this.options = { ...defaultConfig, ...options };
  }

  public onAdd(ctx: LibreRouting) {
    this.ctx = ctx;
    this.map = ctx.map;
    this.options = resolveOptions(ctx, this.options);

    ctx.on('waypoints', (waypoints) => (this.waypoints = waypoints));

    this.map.addSource(this.options.pointLayerId, {
      type: 'geojson',
      data: this.point,
    });

    this.map.addLayer({
      id: this.options.pointLayerId,
      type: 'circle',
      source: this.options.pointLayerId,
      layout: {
        visibility: 'visible',
      },
      paint: {
        'circle-radius': 3.4,
        'circle-color': '#fff',
        'circle-stroke-width': 4,
        'circle-stroke-color': '#e207ff',
      },
    });

    this.map.on('mousedown', this.mousedownHandler);
    this.map.on('mouseup', this.mouseupHandler);
    this.map.on('click', this.mapClickHandler);
    this.map.on('mousemove', this.mapMoveHandler);
  }

  public onRemove() {
    this.map.off('mousedown', this.mousedownHandler);
    this.map.off('mouseup', this.mouseupHandler);
    this.map.off('click', this.mapClickHandler);
    this.map.off('mousemove', this.mapMoveHandler);
  }

  private onMapClick(e: MapMouseEvent) {
    const features = this.map.queryRenderedFeatures(e.point, {
      layers: [this.options.routeLayerId],
    }) as any;

    const route = features.find(
      (f) => f.source === this.ctx.options.routeSourceId
    );

    if (route && !route.properties.selected) {
      this.ctx.selectRoute(route.properties.routeIndex);

      return;
    }

    if (this.waypoints.length >= 2) return;

    this.addWaypoint(
      e.lngLat.toArray() as LngLatPosition,
      this.waypoints.length - 1
    );
  }

  private onMapMove(e: MapMouseEvent) {
    if (this.waypointOrigin != null) {
      this.updateWaypoint(
        e.lngLat.toArray() as LngLatPosition,
        this.waypointOrigin
      );

      return;
    }

    const features = this.map.queryRenderedFeatures(e.point, {
      layers: [this.options.routeLayerId, this.options.waypointsLayerId],
    });

    const waypoint = features.find(
      ({ source }) => source === this.ctx.options.waypointsSourceId
    );
    const route = features.find(
      ({ source }) => source === this.ctx.options.routeSourceId
    );

    if (waypoint) {
      this.map.getCanvas().style.cursor = 'pointer';

      this.map.setLayoutProperty(
        this.options.pointLayerId,
        'visibility',
        'none'
      );

      return;
    }

    if (!features.length || waypoint || !route) {
      if (
        this.map.getLayoutProperty(this.options.pointLayerId, 'visibility') ===
        'visible'
      ) {
        this.map.setLayoutProperty(
          this.options.pointLayerId,
          'visibility',
          'none'
        );

        this.map.getCanvas().style.cursor = '';
      }

      return;
    }

    if (route.properties.selected) {
      if (
        this.map.getLayoutProperty(this.options.pointLayerId, 'visibility') !==
        'visible'
      ) {
        this.map.getCanvas().style.cursor = 'pointer';

        this.map.setLayoutProperty(
          this.options.pointLayerId,
          'visibility',
          'visible'
        );
      }

      this.point.features[0].geometry.coordinates = e.lngLat.toArray();

      (this.map.getSource(this.options.pointLayerId) as any).setData(
        this.point
      );

      return;
    } else {
      this.map.getCanvas().style.cursor = 'pointer';

      this.map.setLayoutProperty(
        this.options.pointLayerId,
        'visibility',
        'none'
      );
    }
  }

  private onMousedown(e: MapMouseEvent) {
    const features = this.map.queryRenderedFeatures(e.point, {
      layers: [this.options.routeLayerId, this.options.waypointsLayerId],
    }) as any;

    if (!features.length) return;

    const waypoint = features.find(
      (f) => f.source === this.ctx.options.waypointsSourceId
    );

    if (waypoint) {
      this.map.dragPan.disable();

      this.waypointOrigin = waypoint.properties.id;

      return;
    }

    const route = features.find(
      (f) => f.source === this.ctx.options.routeSourceId
    );

    if (route && route.properties.selected) {
      this.map.dragPan.disable();
      this.waypointOrigin = route.properties.waypoint + 1;

      this.map.setLayoutProperty(
        this.options.pointLayerId,
        'visibility',
        'none'
      );

      this.addWaypoint(
        e.lngLat.toArray() as any,
        route.properties.waypoint + 1
      );
    }
  }

  private onMouseup(e) {
    this.map.dragPan.enable();
    this.map.setLayoutProperty(this.options.pointLayerId, 'visibility', 'none');

    if (this.waypointOrigin != null) {
      this.updateWaypoint(
        e.lngLat.toArray() as LngLatPosition,
        this.waypointOrigin
      );

      if (!this.options.calculateOnFly) {
        this.recalculateHandler();
      }
    }

    this.waypointOrigin = null;
  }

  private fire(event, data) {
    this.dispatcher.fire(event, data);
  }

  public on(event, callback) {
    this.dispatcher.on(event, callback);
  }

  public off(event, callback) {
    this.dispatcher.off(event, callback);
  }

  private addWaypoint(pos: LngLatPosition, waypointId: number) {
    this.ctx.addWaypoint(pos, waypointId);

    if (!this.dirty || this.options.calculateOnFly) {
      this.recalculateHandler();
    }
  }

  private updateWaypoint(pos: LngLatPosition, waypointId: number) {
    const updateResult = this.ctx.updateWaypoint(pos, waypointId);

    if (updateResult && (!this.dirty || this.options.calculateOnFly)) {
      this.recalculateHandler();
    }

    return updateResult;
  }
}
