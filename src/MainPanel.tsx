import React, { PureComponent } from 'react';
import { PanelProps } from '@grafana/data';
import { PanelOptions, Buffer } from 'types';
import { Map, View } from 'ol';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { nanoid } from 'nanoid';
import Select from 'ol/interaction/Select';
import { pointerMove } from 'ol/events/condition';
import { Style, Text, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { processData } from './util/process';
import 'ol/ol.css';

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

    const hoverInteraction = new Select({
      condition: pointerMove,
      style: function(feature) {
        const geometry_type = feature.getGeometry()?.getType();
        if (geometry_type == 'Point') {
          return new Style({
            text: new Text({
              stroke: new Stroke({
                color: 'rgba(255, 255, 255, 0.9)',
                width: 2,
              }),
              fill: new Fill({ color: '#000' }),
              font: '12px/1 sans-serif',
              text: feature.get('time'),
              offsetY: -16,
            }),
            image: new CircleStyle({
              radius: 9,
              fill: new Fill({
                color: 'rgba(255, 255, 255, 0.9)',
              }),
              stroke: new Stroke({
                color: feature.get('color'),
                width: 2,
              }),
            }),
          });
        }
        return new Style({
          stroke: new Stroke({
            color: '#49A8DE',
            width: 2,
          }),
        });
      },
    });
    this.map.addInteraction(hoverInteraction);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.data.series !== this.props.data.series) {
      this.map.removeLayer(this.infoLayer);
      if (this.props.data.series.length == 0) {
        return;
      }

      const { buffer } = this.props.data.series[0].fields[0].values as Buffer;

      this.map.getView().animate({
        center: fromLonLat([buffer[0].longitude, buffer[0].latitude]),
        duration: 1000,
      });

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
