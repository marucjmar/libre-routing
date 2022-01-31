import type { SelectRouteStrategy } from './here/here';
import type { GeoJSONSourceSpecification, LngLatBoundsLike } from 'maplibre-gl';
import type { FeatureCollection, Geometry } from '@turf/helpers';

export interface LibreRoutingDataProvider {
  request: (
    waypoints: any,
    opts: { selectRouteStrategy?: SelectRouteStrategy; alternatives: number }
  ) => Promise<LibreRoutingDataResponse>;
  destroy(): void;

  hasPendingRequests(): Promise<boolean>;
}

export type LibreRoutingDataResponse = {
  rawData: any;
  geojson: GeoJSONSourceSpecification & {
    data: FeatureCollection<
      Geometry,
      { routeIndex: number; selected: boolean }
    >;
  };
  bounds?: LngLatBoundsLike;
  summary: { routes: SummaryRoute[]; selectedRouteId?: number | null };
};

export type SummaryRoute = {
  id: number;
  totalTime: number;
  distance: number;
  arriveTime: Date;
  departureTime: Date;
  cost?: number;
};

export type Route = {
  id: string;
  label: string[];
  polyline: string;
  arrivalTime: Date;
  distance: number;
  actions: RouteAction;
};

export type RouteAction = {
  actionType: string;
  message: string;
  pos: { lat: number; lng: number };
};

export * from './here/here';
