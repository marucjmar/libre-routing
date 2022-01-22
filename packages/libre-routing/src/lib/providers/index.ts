import type { BBox } from '@turf/helpers';
import type { GeoJSONSourceSpecification } from 'maplibre-gl';

export interface LibreRoutingDataProvider {
  request: (waypoints: any, opts: any) => Promise<RequestResponse>;
  destroy(): void;
}

export type RequestResponse = {
  rawData: any;
  geojson: GeoJSONSourceSpecification;
  bounds?: BBox;
  summary: { routes: SummaryRoute[] };
};

export type SummaryRoute = {
  id: number;
  totalTime: number;
  distance: number;
  arriveTime: Date;
  departureTime: Date;
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
