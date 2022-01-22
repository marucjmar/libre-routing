import { decode } from '@liberty-rider/flexpolyline';
import * as simplify from 'simplify-js';
import bbox from '@turf/bbox';
import { featureCollection, lineString } from '@turf/helpers';

import { RequestResponse } from '..';
import { Requester } from '../../utils/requester';
import { UnauthorizedError } from '../errors/unauthorized';

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

const serializeRoute = (route, routeIndex) => {
  return route.sections.map((section, index) => {
    const decoded = decode(section.polyline);
    const polyline = decoded.polyline.map(([x, y]) => ({ x, y }));
    const simplified = simplify(polyline, 0.0001, true);
    const points = simplified.map((p) => [+p.y.toFixed(6), +p.x.toFixed(6)]);

    return lineString(points, { waypoint: index, routeIndex: routeIndex });
  });
};

export type HereProviderWorker = typeof executor;
