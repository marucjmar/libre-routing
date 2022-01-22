import { LngLatLike, Map, MapMouseEvent } from 'maplibre-gl';
import {
  featureCollection,
  FeatureCollection,
  Point,
  point,
} from '@turf/helpers';

import { LibreRouting } from '../../libre-routing';
import { LibreRoutingConsts } from '../../consts';
import { throttle } from '../../utils/concurency';
import { Dispatcher } from '../../utils/dispatcher';
import type { LibreRoutingPlugin } from '..';

type MousePluginOptions = {
  calculateOnFly: boolean;
  routeLayerId: string;
  waypointsLayerId: string;
};

const defaultConfig: MousePluginOptions = {
  calculateOnFly: true,
  routeLayerId: LibreRoutingConsts.RouteLayerId,
  waypointsLayerId: LibreRoutingConsts.WaypointsLayerId,
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
      this.ctx!.recalculateRoute();
    },
    100,
    { leading: true, trailing: true }
  );

  private _dirty = false;

  private set waypointOrigin(value: number | null | undefined) {
    this._waypointOrigin = value;
    this._dirty = !value;
    this.fire('dirty', this._dirty);
  }

  private get waypointOrigin(): number {
    return this._waypointOrigin;
  }

  public get dirty() {
    return this._dirty;
  }

  constructor(options?: MousePluginOptions) {
    this.dispatcher = new Dispatcher();
    this.options = { ...defaultConfig, ...options };
  }

  public onAdd(ctx: LibreRouting) {
    this.ctx = ctx;
    this.map = ctx.map;

    ctx.on('waypoints', (waypoints) => (this.waypoints = waypoints));

    this.map.addSource('point', { type: 'geojson', data: this.point });

    this.map.addLayer({
      id: 'point',
      type: 'circle',
      source: 'point',
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

  public onRemove() {}

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
      e.lngLat.toArray() as LngLatLike,
      this.waypoints.length - 1
    );
  }

  private onMapMove(e: MapMouseEvent) {
    if (this.waypointOrigin != null) {
      this.updateWaypoint(
        e.lngLat.toArray() as LngLatLike,
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

      this.map.setLayoutProperty('point', 'visibility', 'none');

      return;
    }

    if (!features.length || waypoint || !route) {
      if (this.map.getLayoutProperty('point', 'visibility') === 'visible') {
        this.map.setLayoutProperty('point', 'visibility', 'none');

        this.map.getCanvas().style.cursor = '';
      }

      return;
    }

    if (route.properties.selected) {
      if (this.map.getLayoutProperty('point', 'visibility') !== 'visible') {
        this.map.getCanvas().style.cursor = 'pointer';

        this.map.setLayoutProperty('point', 'visibility', 'visible');
      }

      this.point.features[0].geometry.coordinates = e.lngLat.toArray();

      (this.map.getSource('point') as any).setData(this.point);

      return;
    } else {
      this.map.getCanvas().style.cursor = 'pointer';

      this.map.setLayoutProperty('point', 'visibility', 'none');
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

      this.map.setLayoutProperty('point', 'visibility', 'none');

      this.addWaypoint(
        e.lngLat.toArray() as any,
        route.properties.waypoint + 1
      );
    }
  }

  private onMouseup() {
    this.map.dragPan.enable();
    this.map.setLayoutProperty('point', 'visibility', 'none');
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

  private addWaypoint(pos: LngLatLike, waypointId: number) {
    this.ctx.addWaypoint(pos, waypointId);

    if (!this.dirty || this.options.calculateOnFly) {
      this.recalculateHandler();
    }
  }

  private updateWaypoint(pos: LngLatLike, waypointId: number) {
    this.ctx.updateWaypoint(pos, waypointId);

    if (!this.dirty || this.options.calculateOnFly) {
      this.recalculateHandler();
    }
  }
}
