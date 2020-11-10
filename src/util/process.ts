import { DataFormat } from '../types';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import VectorSource from 'ol/source/Vector';
import { Vector as VectorLayer } from 'ol/layer';
import { Style, Fill, Stroke, Text, Circle as CircleStyle, Icon } from 'ol/style';
import { FeatureLike } from 'ol/Feature';
import GeometryType from 'ol/geom/GeometryType';
import Arrow from '../img/arrow.png';

export const processData = (buffer: DataFormat[]) => {
  buffer.reverse();

  const totalFeatures: Feature[] = [];
  const linestring: number[][] = [];
  buffer.map(item => {
    const feature = new Feature(new Point([item.longitude, item.latitude]).transform('EPSG:4326', 'EPSG:3857'));
    feature.set('passenger', item.num_passenger.toString());
    totalFeatures.push(feature);

    linestring.push([item.longitude, item.latitude]);
  });

  totalFeatures[totalFeatures.length - 1].set('isLastest', 'true');
  const lineFeature = new Feature<LineString>(new LineString(linestring).transform('EPSG:4326', 'EPSG:3857'));

  totalFeatures.push(lineFeature);

  return new VectorLayer({
    source: new VectorSource({
      features: [...totalFeatures],
    }),
    style: function(feature: FeatureLike) {
      const geo_type = feature.getGeometry()?.getType();
      if (geo_type == GeometryType.LINE_STRING) {
        const geometry = feature.getGeometry() as LineString;

        const line_styles = [
          new Style({
            stroke: new Stroke({
              color: '#49A8DE',
              width: 2,
            }),
          }),
        ];

        geometry.forEachSegment(function(start, end) {
          const dx = end[0] - start[0];
          const dy = end[1] - start[1];
          const rotation = Math.atan2(dy, dx);
          const midX = (start[0] + end[0]) / 2;
          const midY = (start[1] + end[1]) / 2;

          line_styles.push(
            new Style({
              geometry: new Point([midX, midY]),
              image: new Icon({
                src: Arrow,
                anchor: [0.75, 0.5],
                rotateWithView: true,
                rotation: -rotation,
              }),
            })
          );
        });
        return line_styles;
      }

      if (geo_type == GeometryType.POINT) {
        const label = feature.get('passenger');
        const isLastest = feature.get('isLastest');
        let color = 'rgba(73,168,222,0.5)';
        if (isLastest) color = '#ef5319';
        return new Style({
          text: new Text({
            stroke: new Stroke({
              color: '#b7b7b7',
              width: 1,
            }),
            font: '12px/1 sans-serif',
            text: label,
          }),
          image: new CircleStyle({
            radius: 9,
            fill: new Fill({
              color: 'rgba(255, 255, 255, 0.9)',
            }),
            stroke: new Stroke({
              color: color,
              width: 2,
            }),
          }),
        });
      }
      return new Style();
    },
    zIndex: 2,
  });
};
