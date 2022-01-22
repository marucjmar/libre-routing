export const routeLayer = (id, sourceId) => {
  return {
    id,
    type: 'line',
    source: sourceId,
    minzoom: 1,
    maxzoom: 17,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
      'line-sort-key': ['case', ['==', ['get', 'routeIndex'], 0], 1, 0],
    },
    paint: {
      'line-color': [
        'case',
        ['==', ['get', 'routeIndex'], 0],
        '#e207ff',
        '#33C9EB',
      ],
      'line-width': 4,
    },
  };
};

export const waypointsLayer = (id, sourceId) => {
  return {
    id,
    source: sourceId,
    type: 'circle',
    layout: {
      visibility: 'visible',
    },
    paint: {
      'circle-radius': 3.4,
      'circle-color': '#fff',
      'circle-stroke-width': 4,
      'circle-stroke-color': '#e207ff',
    },
  };
};
