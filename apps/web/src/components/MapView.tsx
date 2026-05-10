'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { Poi } from '@geo-audio/shared';
import { geoCirclePolygon } from '@/lib/geo';
import styles from './MapView.module.scss';

/**
 * Snygg vector-tile-style från OpenFreeMap – gratis, ingen API-nyckel.
 * Stilar att välja mellan: 'liberty', 'positron', 'bright', 'dark'.
 *
 * För ännu finare kartor: skaffa nyckel hos MapTiler och sätt
 * NEXT_PUBLIC_MAP_STYLE_URL till t.ex.
 *   https://api.maptiler.com/maps/streets-v2/style.json?key=XXX
 */
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

const DEFAULT_STYLE: string =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || OPENFREEMAP_STYLE;

interface MapViewProps {
  userCoords: [number, number] | null;
  pois: Poi[];
  activePoiId: string | null;
}

export function MapView({ userCoords, pois, activePoiId }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const poiMarkersRef = useRef<Map<string, Marker>>(new Map());

  // Init map – körs en gång.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_STYLE,
      center: userCoords ?? [18.0686, 59.3293], // Default: Stockholm
      zoom: 15,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Logga laddningsfel så vi ser om tiles eller stil failar.
    map.on('error', (e) => {
      console.error('[MapLibre]', e?.error?.message ?? e);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Uppdatera user-marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = styles.userMarker ?? '';
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(userCoords)
        .addTo(map);
      map.flyTo({ center: userCoords, zoom: 16 });
    } else {
      userMarkerRef.current.setLngLat(userCoords);
    }
  }, [userCoords]);

  // Synka POI-markers + triggerradier som GeoJSON-cirklar.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const renderRadii = () => {
      const features = pois.map((poi) => ({
        type: 'Feature' as const,
        properties: {
          id: poi.id,
          active: poi.id === activePoiId,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [geoCirclePolygon(poi.coordinates, poi.triggerRadiusMeters)],
        },
      }));
      const data = { type: 'FeatureCollection' as const, features };

      const existing = map.getSource('poi-radii') as
        | maplibregl.GeoJSONSource
        | undefined;
      if (existing) {
        existing.setData(data);
      } else {
        map.addSource('poi-radii', { type: 'geojson', data });
        map.addLayer({
          id: 'poi-radii-fill',
          type: 'fill',
          source: 'poi-radii',
          paint: {
            'fill-color': ['case', ['get', 'active'], '#ff8a00', '#ffb547'],
            'fill-opacity': 0.18,
          },
        });
        map.addLayer({
          id: 'poi-radii-outline',
          type: 'line',
          source: 'poi-radii',
          paint: {
            'line-color': ['case', ['get', 'active'], '#ff8a00', '#ffb547'],
            'line-width': 2,
            'line-opacity': 0.8,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      renderRadii();
    } else {
      map.once('load', renderRadii);
    }

    const seen = new Set<string>();
    for (const poi of pois) {
      seen.add(poi.id);
      let marker = poiMarkersRef.current.get(poi.id);
      if (!marker) {
        const el = document.createElement('div');
        el.className = styles.poiMarker ?? '';
        el.setAttribute('data-active', String(poi.id === activePoiId));
        marker = new maplibregl.Marker({ element: el })
          .setLngLat(poi.coordinates)
          .setPopup(new maplibregl.Popup({ offset: 16 }).setText(poi.name))
          .addTo(map);
        poiMarkersRef.current.set(poi.id, marker);
      } else {
        marker.setLngLat(poi.coordinates);
        marker
          .getElement()
          .setAttribute('data-active', String(poi.id === activePoiId));
      }
    }

    // Ta bort markers för POI:er som inte längre finns.
    for (const [id, marker] of poiMarkersRef.current.entries()) {
      if (!seen.has(id)) {
        marker.remove();
        poiMarkersRef.current.delete(id);
      }
    }
  }, [pois, activePoiId]);

  return <div ref={containerRef} className={styles.map} />;
}
