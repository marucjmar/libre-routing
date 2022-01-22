import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Map } from 'maplibre-gl';
import {
  LibreRouting,
  MousePlugin,
  LayersPlugin,
  HereProvider,
} from 'libre-routing';
import { environment } from '../environments/environment';

@Component({
  selector: 'libre-routing-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('mapContainer') mapContainer?: ElementRef;

  ngAfterViewInit() {
    const map = new Map({
      container: this.mapContainer!.nativeElement,
      center: [13, 51],
      zoom: 4,
      style: `https://assets.vector.hereapi.com/styles/berlin/base/mapbox/tilezen?apikey=${environment.hereApiKey}`,
    });

    const dataProvider = new HereProvider({ apiKey: environment.hereApiKey });
    const routing = new LibreRouting({
      dataProvider,
      plugins: [new LayersPlugin(), new MousePlugin()],
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
  }
}
