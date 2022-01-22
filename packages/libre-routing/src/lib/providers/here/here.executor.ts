import { decode } from '@liberty-rider/flexpolyline';
import * as simplify from 'simplify-js';
import bbox from '@turf/bbox';
import { featureCollection, lineString } from '@turf/helpers';

import { RequestResponse } from '..';
import { Requester } from '../../utils/requester';
import { UnauthorizedError } from '../errors/unauthorized';
import { SummaryRoute } from 'libre-routing';

const requester = new Requester();

export const executor = {
  async request(opts): Promise<RequestResponse> {
    try {
      const data = await requester.request(opts.url);

      const features = data.routes
        .map((route, index) => serializeRoute(route, index))
        .reduce((acc, c) => [...acc, ...c], []);

      const FC = featureCollection(features);

      return {
        bounds: bbox(FC),
        rawData: data,
        summary: {
          routes: data.routes.map(summaryRoutes),
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
  },
};

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

  return {
    totalTime,
    distance,
    arriveTime: new Date(
      route.sections[route.sections.length - 1].arrival.time
    ),
    departureTime: new Date(route.sections[0].departure.time),
    id: routeIndex,
  };
};

const serializeRoute = (route, routeIndex) => {
  return route.sections.map((section, index) => {
    const decoded = decode(section.polyline);
    const polyline = decoded.polyline.map(([x, y]) => ({ x, y }));
    const simplified = simplify(polyline, 0.0001, true);
    const points = simplified.map((p) => [+p.y.toFixed(6), +p.x.toFixed(6)]);

    return lineString(points, {
      waypoint: index,
      routeIndex: routeIndex,
      selected: routeIndex === 0,
    });
  });
};

export type HereProviderWorker = typeof executor;
