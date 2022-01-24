import type { SelectRouteStrategy, SummaryRoute } from 'libre-routing';

export function selectRouteByStrategy(
  summaryRoutes: SummaryRoute[],
  strategy: SelectRouteStrategy
) {
  if (strategy === 'fastest') {
    const fastest = summaryRoutes.reduce(function (prev, current) {
      return prev.arriveTime.valueOf() < current.arriveTime.valueOf()
        ? prev
        : current;
    });

    return fastest?.id;
  } else if (strategy === 'shortest') {
    const shortest = summaryRoutes.reduce(function (prev, current) {
      return prev.distance < current.distance ? prev : current;
    });

    return shortest?.id;
  }

  return null;
}
