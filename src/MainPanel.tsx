import React, { PureComponent } from 'react';
import { PanelProps /* , Vector as VectorData */ } from '@grafana/data';
import { PanelOptions, Buffer } from 'types';
import { Map, View } from 'ol';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { nanoid } from 'nanoid';
import { processData } from './util/process';
import 'ol/ol.css';
import './css/main.css';

interface Props extends PanelProps<PanelOptions> {}
interface State {}

export class MainPanel extends PureComponent<Props, State> {
  id = 'id' + nanoid();
  map: Map;
  infoLayer: VectorLayer;

  componentDidMount() {
    const { zoom_level, center_lon, center_lat } = this.props.options;

    const carto = new TileLayer({
      source: new XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }),
    });

    let clon = center_lon,
      clat = center_lat;

    if (this.props.data.series.length > 0) {
      const { buffer } = this.props.data.series[0].fields[0].values as Buffer;
      clon = buffer[0].longitude;
      clat = buffer[0].latitude;
    }

    this.map = new Map({
      interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
        new DragPan({
          condition: function(event) {
            return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
          },
        }),
        new MouseWheelZoom({
          condition: platformModifierKeyOnly,
        }),
      ]),
      layers: [carto],
      view: new View({
        center: fromLonLat([clon, clat]),
        zoom: zoom_level,
      }),
      target: this.id,
    });

    if (this.props.data.series.length > 0) {
      const { buffer } = this.props.data.series[0].fields[0].values as Buffer;

      this.infoLayer = processData(buffer);
      this.map.addLayer(this.infoLayer);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.data.series !== this.props.data.series) {
      this.map.removeLayer(this.infoLayer);
      if (this.props.data.series.length == 0) {
        return;
      }

      const { buffer } = this.props.data.series[0].fields[0].values as Buffer;

      if (prevProps.data.series.length == 0) {
        this.map.getView().animate({
          center: fromLonLat([buffer[0].longitude, buffer[0].latitude]),
          duration: 2000,
        });
      }
      this.infoLayer = processData(buffer);
      this.map.addLayer(this.infoLayer);
    }

    if (prevProps.options.zoom_level !== this.props.options.zoom_level) {
      this.map.getView().setZoom(this.props.options.zoom_level);
    }

    if (
      prevProps.options.center_lat !== this.props.options.center_lat ||
      prevProps.options.center_lon !== this.props.options.center_lon
    ) {
      this.map.getView().animate({
        center: fromLonLat([this.props.options.center_lon, this.props.options.center_lat]),
        duration: 2000,
      });
    }
  }

  render() {
    const { width, height } = this.props;

    return <div id={this.id} style={{ width, height }}></div>;
  }
}
