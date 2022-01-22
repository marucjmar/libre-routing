// import { LngLat, LngLatBounds, Map, Popup } from 'maplibre-gl';
// import { LibreRouting } from '../../libre-routing';
// import { BBox, featureCollection, point } from '@turf/helpers';
// import { wrap } from 'comlink';
// import bbox from '@turf/bbox';
// import { debounce } from '../../utils/concurency';
// import { LibreRoutingPlugin } from '..';
// import { LibreRoutingConsts } from '../../consts';

// export interface AnnotationControllerOptions {
//   routeLayerId: string;
// }

// const defaultConfig: AnnotationControllerOptions = {
//   routeLayerId: LibreRoutingConsts.RouteLayerId,
// };

// export class AnnotationController implements LibreRoutingPlugin {
//   private map!: Map;
//   private mapBounds!: LngLatBounds;
//   private point;
//   private bounds?: BBox;
//   private worker: any;
//   private popups: Popup[] = [];
//   private allInBbox = false;
//   private routeHints = [];
//   private currentFeatures: any[] = [];
//   private ctx?: LibreRouting;
//   private options: AnnotationControllerOptions;

//   constructor(options = {}) {
//     this.options = { ...defaultConfig, ...options };
//     const worker = new Worker();

//     this.worker = wrap(worker);
//   }

//   onAdd(ctx: LibreRouting) {
//     const debounced = debounce(() => this.recalculate(), 200, false);
//     this.ctx = ctx;

//     this.ctx.on('routeCalculated', async (data) => {
//       this.allInBbox = false;

//       await this.worker.createChunks(data);

//       this.point.features = [];
//       this.popups.forEach((p) => p.remove());
//       (this.map.getSource('pointx') as any).setData(this.point);

//       debounced();
//     });

//     this.map = ctx.map;

//     this.point = {
//       type: 'FeatureCollection',
//       features: [
//         {
//           type: 'Feature',
//           geometry: {
//             type: 'Point',
//             coordinates: [0, 0],
//           },
//         },
//       ],
//     };

//     this.map.addSource('pointx', {
//       type: 'geojson',
//       data: this.point,
//     });

//     this.map.addLayer({
//       id: 'pointx',
//       type: 'symbol',
//       source: 'pointx',
//       layout: {
//         'text-field': ['get', 'title'],
//       },
//       paint: {},
//     });

//     this.map.on('moveend', async () => {
//       this.recalculate();
//     });
//   }

//   onRemove() {}

//   private async recalculate() {
//     this.mapBounds = this.map.getBounds();

//     if (
//       this.bounds &&
//       this.bounds.length === 4 &&
//       this.mapBounds.contains([this.bounds[0], this.bounds[1]]) &&
//       this.mapBounds.contains([this.bounds[2], this.bounds[3]]) &&
//       this.allInBbox
//     ) {
//       return;
//     }

//     const sw = this.mapBounds.getSouthWest();
//     const ne = this.mapBounds.getNorthEast();

//     const { points, allInBbox } = await this.worker.recalculatePos({
//       bbox: { sw, ne },
//     });

//     if (!points.length) return;

//     const mathedFeatures = points.map((point) => {
//       const xy = this.map.project(point.lngLat);

//       return this.map.queryRenderedFeatures(xy, {
//         layers: [this.options.routeLayerId],
//       })[0] as any;
//     });

//     const matchedIds = mathedFeatures.map((f) => f.properties.routeIndex);
//     const currentFeatures = this.currentFeatures.map(
//       (f) => f.properties.routeIndex
//     );

//     if (
//       matchedIds.toString() === currentFeatures.toString() &&
//       this.bounds &&
//       this.bounds.length === 4 &&
//       this.mapBounds.contains([this.bounds[0], this.bounds[1]]) &&
//       this.mapBounds.contains([this.bounds[2], this.bounds[3]])
//     ) {
//       return;
//     }

//     this.popups.forEach((p) => p.remove());

//     this.currentFeatures = mathedFeatures;
//     this.allInBbox = allInBbox;

//     this.point.features = points.map((element) => point(element.lngLat));

//     this.bounds = bbox(featureCollection(this.point.features));

//     (this.map.getSource('pointx') as any).setData(this.point);
//     this.routeHints = [];

//     points.forEach((point, index) => {
//       if (mathedFeatures[index]) {
//         const popup = new Popup({
//           closeButton: false,
//           anchor: point.anchor,
//           closeOnClick: false,
//           className: 'no-mouse-events',
//         })
//           .setLngLat(point.lngLat)
//           .setHTML('ddd')
//           .addTo(this.map);

//         this.routeHints.push();
//         this.popups.push(popup);
//       }
//     });
//   }
// }
