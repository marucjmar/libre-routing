import { FitBoundsOptions, IControl, LngLatLike, Map } from 'maplibre-gl';
import { featureCollection, point } from '@turf/helpers';

import { LibreRoutingDataProvider } from './providers';
import { Dispatcher } from './utils/dispatcher';
import { LibreRoutingPlugin } from './plugins';

type LibreRoutingOptions = {
  dataProvider: LibreRoutingDataProvider;
  alternatives: number;
  skipAlternativesOnMultipleWaypoint: boolean;
  firstRouteCenter: boolean;
  plugins: Array<
    LibreRoutingPlugin | (new (...args: any[]) => LibreRoutingPlugin)
  >;
  routeSourceId: string;
  waypointsSourceId: string;
};

const defaultConfig: LibreRoutingOptions = {
  dataProvider: null as any,
  alternatives: 1,
  skipAlternativesOnMultipleWaypoint: true,
  firstRouteCenter: true,
  plugins: [],
  routeSourceId: 'libre-routing-route-source',
  waypointsSourceId: 'libre-routing-waypoints-source',
};

export class LibreRouting implements IControl {
  private _map!: Map;
  private _options: LibreRoutingOptions;
  private _selectedRouteId?: number;

  public get map() {
    return this._map;
  }

  public get options(): LibreRoutingOptions {
    return this._options;
  }

  public get selectedRouteId(): number | undefined {
    return this._selectedRouteId;
  }

  private dispatcher = new Dispatcher();
  private data: any;

  private _waypoints: any[] = [];

  private set waypoints(value) {
    this._waypoints = value;
    this.dispatcher.fire('waypoints', this._waypoints);
  }

  private get waypoints(): any[] {
    return this._waypoints;
  }

  constructor(options: Partial<LibreRoutingOptions>) {
    this._options = { ...defaultConfig, ...options };
  }

  public onAdd(map: Map) {
    this._map = map;

    this.enable();
    return document.createElement('div');
  }

  public onRemove() {
    this.disable();
  }

  public addWaypoint(point: LngLatLike, index: number, mappedPos?: LngLatLike) {
    const newArr = [...this.waypoints];
    newArr.splice(index, 0, {
      originalPos: point,
      mappedPos,
    });
    this.waypoints = newArr;
    this.updateWaypointsSource();
  }

  public updateWaypoint(
    point: LngLatLike,
    index: number,
    mappedPos?: LngLatLike
  ): boolean {
    if (
      !this.waypoints[index] ||
      (this.waypoints[index].originalPos[0] === point[0] &&
        this.waypoints[index].originalPos[1] === point[1])
    ) {
      return false;
    }

    this.waypoints[index] = { originalPos: point, mappedPos } as any;
    this.updateWaypointsSource();

    return true;
  }

  public removeWaypoint(index: number) {
    const newArr = [...this.waypoints];
    newArr.splice(index, 1);
    this.waypoints = newArr;
    this.updateWaypointsSource();
  }

  public getWaypoint(waypointId: number) {
    return this._waypoints[waypointId];
  }

  public async recalculateRoute(skipCenter = false) {
    if (!this.map || this.waypoints.length < 2) return;

    if (!this.options.dataProvider) {
      throw new Error('No data provider');
    }

    const alternatives =
      this.options.skipAlternativesOnMultipleWaypoint &&
      this.waypoints.length !== 2
        ? 0
        : this.options.alternatives;

    const data = await this.options.dataProvider.request(this.waypoints, {
      alternatives,
    });

    if (!data) return;

    const firstData = !this.data;

    this.data = data;

    this.setSource(this.options.routeSourceId, data.geojson.data);

    this.dispatcher.fire('routeCalculated', this.data);

    if (data.summary.selectedRouteId) {
      this.dispatcher.fire('routeSelected', {
        event: 'routeSelected',
        data: this.data,
        routeId: data.summary.selectedRouteId,
      });
    }

    if (this.waypoints.length === 2 && !skipCenter && firstData) {
      this.zoomToData();
    }

    return data;
  }

  public zoomToData(opts?: FitBoundsOptions) {
    if (this.data.bounds) {
      this.map.fitBounds(this.data.bounds, {
        padding: 40,
        ...opts,
      });
    }
  }

  public on(...args: [string, Function]) {
    this.dispatcher.on(...args);
  }

  public off(...args: [string, Function]) {
    this.dispatcher.off(...args);
  }

  public enable() {
    this.setupMapSources();
    this.initPlugins();
  }

  public disable() {
    this.detachPlugins();
    this.options.dataProvider?.destroy();

    this.map.removeSource(this.options.routeSourceId);
    this.map.removeSource(this.options.waypointsSourceId);
  }

  public selectRoute(routeId: number) {
    const features = this.data.geojson.data.features.map((feature) => {
      return {
        ...feature,
        properties: {
          ...feature.properties,
          selected: feature.properties.routeIndex === routeId,
        },
      };
    });

    this._selectedRouteId = routeId;
    this.data.geojson.data.features = features;

    const newData = {
      ...this.data.geojson.data,
      features,
    };

    this.setSource(this.options.routeSourceId, newData);

    this.dispatcher.fire('routeSelected', {
      event: 'routeSelected',
      data: newData,
      routeId,
    });
  }

  public hideAlternativeRoutes() {
    const features = this.data.geojson.data.features.filter(
      ({ properties }) => properties.selected
    );

    const newData = {
      ...this.data.geojson.data,
      features,
    };

    this.setSource(this.options.routeSourceId, newData);
  }

  public showAllRoutes() {
    const newData = {
      ...this.data.geojson.data,
      features: this.data.geojson.data.features,
    };

    this.setSource(this.options.routeSourceId, newData);
  }

  private updateWaypointsSource() {
    const points = this.waypoints.map((waypoint, id) =>
      point(waypoint.originalPos, { id })
    );
    const data = featureCollection(points);

    this.setSource(this.options.waypointsSourceId, data);
  }

  private initPlugins() {
    this.options.plugins.forEach((plugin) =>
      this.resolvePlugin(plugin).onAdd(this)
    );
  }

  private detachPlugins() {
    this.options.plugins.forEach((plugin) =>
      this.resolvePlugin(plugin).onRemove(this)
    );
  }

  private setupMapSources() {
    this.map.addSource(this.options.routeSourceId, {
      type: 'geojson',
      data: featureCollection([]),
    });

    this.map.addSource(this.options.waypointsSourceId, {
      type: 'geojson',
      data: featureCollection([]),
    });
  }

  private resolvePlugin(
    plugin: LibreRoutingPlugin | (new (...args: any[]) => LibreRoutingPlugin)
  ): LibreRoutingPlugin {
    if (typeof plugin === 'function') {
      return new plugin({});
    }

    return plugin;
  }

  private setSource(sourceId: string, data: any) {
    // @ts-ignore
    this.map.getSource(sourceId).setData(data);
  }
}
