import { wrap } from 'comlink';

import { HereExecutor } from './here.executor';
import type { LibreRoutingDataProvider } from '..';

type Options = {
  worker?: boolean;
  apiKey: string;
  baseUrl?: string;
  spans?: string[];
  return?: string[];
  transportMode?: string;
};

const defaultOptions: Partial<Options> = {
  baseUrl: 'https://router.hereapi.com/v8/routes',
  transportMode: 'car',
  worker: true,
};

export class HereProvider implements LibreRoutingDataProvider {
  private worker?: Worker;
  private executorAPI: HereExecutor;
  private options: Options;

  constructor(options: Options) {
    this.options = { ...defaultOptions, ...options };

    if (this.options.worker === true) {
      this.worker = new Worker(new URL('./here.worker', import.meta.url), {
        type: 'module',
      });

      //@ts-ignore
      this.executorAPI = wrap<HereExecutor>(this.worker);
    } else {
      this.executorAPI = new HereExecutor();
    }
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
    }
  }

  request(waypoints, opts) {
    const url = this.buildUrl(waypoints, opts);

    return this.executorAPI.request({ url, ...opts });
  }

  public async hasPendingRequests() {
    return this.executorAPI.hasPendingRequests();
  }

  public setOption(option: string, value: any) {
    this.options[option] = value;
  }

  private buildUrl(waypoints, opts) {
    const start = [...waypoints[0].originalPos].reverse();
    const end = [...waypoints[waypoints.length - 1].originalPos].reverse();

    const qpObj = {
      origin: start.toString(),
      destination: end.toString(),
      spans: [...(this.options.spans || []), 'names'].toString(),
      transportMode: this.options.transportMode || '',
      return: [
        ...(this.options.return || []),
        'polyline',
        'summary',
      ].toString(),
      alternatives: opts?.alternatives,
      apiKey: this.options.apiKey,
    };

    let qp = new URLSearchParams(qpObj).toString();

    if (waypoints.length > 2) {
      qp += `&${this.serializeWaypoints(waypoints)}`;
    }

    return `${this.options.baseUrl}?${qp}`;
  }

  private serializeWaypoints(waypoints) {
    return waypoints
      .slice(1, waypoints.length - 1)
      .map((w) => `via=${[...w.originalPos].reverse()}`)
      .join('&');
  }
}
