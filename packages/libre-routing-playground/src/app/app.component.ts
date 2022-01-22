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

    map.on('load', () => {
      const routing = new LibreRouting({
        dataProvider: new HereProvider({
          apiKey: environment.hereApiKey,
        }),
        plugins: [new LayersPlugin(), new MousePlugin()],
      });

      map.addControl(routing);
    });
  }
}
