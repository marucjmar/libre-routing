import { decode } from '@liberty-rider/flexpolyline';
import * as simplify from 'simplify-js';
import bbox from '@turf/bbox';
import { featureCollection, lineString } from '@turf/helpers';

import { RequestResponse, SummaryRoute } from '..';
import { Requester } from '../../utils/requester';
import { UnauthorizedError } from '../errors/unauthorized';
import { selectRouteByStrategy } from './utils/select-route-strategy';

export class HereExecutor {
  private readonly requester = new Requester();

  async request(opts): Promise<RequestResponse> {
    try {
      const data = await this.requester.request(opts.url);
      const routesSummary: SummaryRoute[] = data.routes.map(summaryRoutes);
      const selectedRouteId = selectRouteByStrategy(
        routesSummary,
        opts.selectRouteStrategy
      );

      const features = data.routes
        .map((route, index) => serializeRoute(route, index, selectedRouteId))
        .reduce((acc, c) => [...acc, ...c], []);

      const FC = featureCollection(features);

      return {
        bounds: bbox(FC),
        rawData: data,
        summary: {
          routes: routesSummary,
          selectedRouteId,
        },
        geojson: {
          type: 'geojson',
          data: FC,
        },
      };
    } catch (error: any) {
      if (error instanceof Response) {
        const response: Response = error;
        const body = await response.json();

        if (response.status === 401) {
          throw new UnauthorizedError(body);
        }
      }

      throw error;
    }
  }

  hasPendingRequests() {
    return this.requester.hasPendingRequests;
  }
}

const summaryRoutes = (route, routeIndex): SummaryRoute => {
  const totalTime = route.sections
    .map(
      (s) =>
        new Date(s.arrival.time).valueOf() -
        new Date(s.departure.time).valueOf()
    )
    .reduce((a, b) => a + b, 0);

  const distance = route.sections
    .map((s) => s.summary.length)
    .reduce((a, b) => a + b, 0);

  const cost = route.sections.reduce((acc, section) => {
    (section.tolls || []).forEach((toll) =>
      (toll.fares || []).forEach((fare) => (acc += fare.price.value))
    );

    return acc;
  }, 0);

  return {
    totalTime,
    distance,
    cost,
    arriveTime: new Date(
      route.sections[route.sections.length - 1].arrival.time
    ),
    departureTime: new Date(route.sections[0].departure.time),
    id: routeIndex,
  };
};

const serializeRoute = (route, routeIndex, selectedRouteId) => {
  return route.sections.map((section, index) => {
    const decoded = decode(section.polyline);
    const polyline = decoded.polyline.map(([x, y]) => ({ x, y }));
    const simplified = simplify(polyline, 0.0001, true);
    const points = simplified.map((p) => [+p.y.toFixed(6), +p.x.toFixed(6)]);

    return lineString(points, {
      waypoint: index,
      routeIndex: routeIndex,
      selected: selectedRouteId === routeIndex,
    });
  });
};
