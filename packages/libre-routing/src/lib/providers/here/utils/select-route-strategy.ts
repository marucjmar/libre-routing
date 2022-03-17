import type { SummaryRoute } from '../..';
import type { SelectRouteStrategy } from '../here';

export function selectRouteByStrategy(
  summaryRoutes: SummaryRoute[],
  strategy: SelectRouteStrategy
) {
  if (strategy === 'fastest') {
    const fastest = summaryRoutes.reduce(function (prev, current) {
      return prev?.arriveTime.valueOf() < current?.arriveTime.valueOf()
        ? prev
        : current;
    });

    return fastest?.id;
  } else if (strategy === 'shortest') {
    const shortest = summaryRoutes.reduce(function (prev, current) {
      return prev?.distance < current?.distance ? prev : current;
    });

    return shortest?.id;
  } else if (strategy === 'cheapest') {
    const cheapest = summaryRoutes
      .filter((s) => s.cost != null)
      .reduce(function (prev, current) {
        return prev?.cost < current?.cost ? prev : current;
      }, null);

    return cheapest?.id;
  }

  return null;
}
