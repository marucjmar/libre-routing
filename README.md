# LibreRouting

A full featured(performance focused) directions plugin for [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) and [Mapbox GL JS](https://github.com/mapbox/mapbox-gl-js).

## Demo

[Demo App](https://marucjmar.github.io/libre-routing/)

## Usage

```js
import { Map } from  'maplibre-gl';
import { LibreRouting, MousePlugin, LayersPlugin, HereProvider} from  'libre-routing';

const map = new Map({...});

const dataProvider = new HereProvider({ apiKey: '1234' });
const routing = new LibreRouting({
  dataProvider,
  plugins: [new  LayersPlugin(), new  MousePlugin()],
});

routing.on('routeCalculated', console.log);
routing.on('routeSelected', console.log);
routing.on('waypoints', console.log);

map.on('load', () => {
  map.addControl(routing);

  routing.addWaypoint([13, 51], 0);
  routing.addWaypoint([14, 51], 0);
  routing.recalculateRoute();
});
```

## Supported data providers

- [x] [Here API](https://www.here.com/)
- [ ] [MapBox API](https://docs.mapbox.com/help/glossary/directions-api/)
- [ ] [Google API](https://developers.google.com/maps/documentation/directions/overview)
- [ ] [OpenStreetMap API](https://wiki.openstreetmap.org/wiki/Routing)

:exclamation: Help grow the library by sharing your providers

## LibreRouting Class

### Config

| Property                             | Default                            | Description                                                                                |
| ------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `dataProvider`(Requred)              | -                                  | The request data provider                                                                  |
| `alternatives`                       | `1`                                | The number of alternatives routes                                                          |
| `skipAlternativesOnMultipleWaypoint` | `true`                             | If `true`, then when there is more than one waypoint, alternative routes will not be shown |
| `firstRouteCenter`                   | `true`                             | When `true` then map fit zoom to route on first route calculation.                         |
| `plugins`                            | `[]`                               | LibreRouting Plugins                                                                       |
| `routeSourceId`                      | `'libre-routing-route-source'`     | Id of the route source on map                                                              |
| `waypointsSourceId`                  | `'libre-routing-waypoints-source'` | Id of the waypoints source on map                                                          |

### Instance Properties

| Property  | Description                                  |
| --------- | -------------------------------------------- |
| `map`     | Return the MapLibre GL or Mapbox GL instance |
| `options` | Return Config                                |

### Instance Methods

| Method                                             | Description                             |
| -------------------------------------------------- | --------------------------------------- |
| `enable()`                                         | Enable library functions                |
| `disable()`                                        | Disable library functions               |
| `addWaypoint(point: [lng, lat], index: number)`    | Add route waypoint on specific index    |
| `updateWaypoint(point: [lng, lat], index: number)` | Update waypoint on specific index       |
| `removeWaypoint(index: number)`                    | Remove route waypoint on specific index |
| `selectRoute(routeId)`                             | Select the alternative route            |
| `on(event, callback)`                              | Subscribe to specific event             |
| `off(event, callback)`                             | Unsubscribe from specific event         |
| `zoomToData(opts)`                                 | Zoom to routes                          |
| `async recalculateRoute(skipCenter = false)`       | Calculate routes between waypoints      |

### Events

| Event             | Description                          | Data                 |
| ----------------- | ------------------------------------ | -------------------- |
| `routeCalculated` | Fire when routes calculated          | Provider data        |
| `routeSelected`   | Fire when alternative route selected | Selected route data  |
| `waypoints`       | Fire when waypoints updated          | Waypoints collection |

## Contribute

[Nx](https://nx.dev/using-nx/nx-cli) CLI Required

First install all depenencies by

```js
npm i
```

### Build library

```js
npm run libre-routing:build
```

### Run playground app

```js
npm run start
```
