import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
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

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
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

      map.on('load', () => {
        map.addControl(routing);

        routing.addWaypoint([13, 51], 0);
        routing.addWaypoint([14, 51], 0);

        routing.recalculateRoute();
      });
    });
  }
}
