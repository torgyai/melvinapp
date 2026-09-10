'use client';

import maplibregl from 'maplibre-gl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useApp, usePageHeader } from '@/components/platform/AppContext';
import { MyProjectsToggle } from '@/components/platform/Shared';
import { CITY_LATLNG, NL_BOUNDS, NL_PROVINCES_GEOJSON, PROVINCE_LABELS, REFERENCE_PLACES } from '@/data/geo';
import { getStatus } from '@/lib/domain';
import type { Property, StatusKey } from '@/lib/types';
import { HeaderPill } from '@/components/platform/HeaderPill';

type LngLat = [number, number];

const CITY_LABEL_OFFSET: Record<string, { anchor: maplibregl.PositionAnchor; offset: [number, number] }> = {
  Leeuwarden: { anchor: 'right', offset: [-13, 2] },
  Burgum: { anchor: 'left', offset: [13, 2] },
  Dokkum: { anchor: 'bottom-left', offset: [8, -9] },
  'Damwâld': { anchor: 'top-left', offset: [8, 7] },
  Grou: { anchor: 'top', offset: [0, 9] },
  Sneek: { anchor: 'right', offset: [-13, 2] },
};

const STATUS_COLOR: Record<StatusKey, string> = {
  wait: '#9aa6a4',
  progress: 'var(--amber)',
  ready: 'var(--teal-3)',
  done: 'var(--good)',
};

/** Spread the pins of one city on a small circle so they do not overlap. */
function mlPinLngLat(base: LngLat, i: number, n: number): LngLat {
  if (n <= 1) return base;
  const r = 0.011;
  const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
  return [base[0] + Math.cos(angle) * r * 1.55, base[1] + Math.sin(angle) * r];
}

export function MapView() {
  const { visibleProperties } = useApp();
  const router = useRouter();
  usePageHeader('Kaart', 'Panden op de kaart · Nederland');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    mapRef.current?.remove();

    const byCity: Record<string, Property[]> = {};
    visibleProperties.forEach((p) => {
      (byCity[p.city] = byCity[p.city] ?? []).push(p);
    });

    const cs = getComputedStyle(document.documentElement);
    const cssVar = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
    const waterColor = cssVar('--map-water', '#dbe9f0');
    const landColor = cssVar('--map-land', '#eee9da');
    const lineColor = cssVar('--map-land-line', '#b9ae8f');
    const hiFill = cssVar('--teal-3', '#057a77');
    const hiLine = cssVar('--teal-2', '#036361');

    const map = new maplibregl.Map({
      container: el,
      style: {
        version: 8,
        sources: { provinces: { type: 'geojson', data: NL_PROVINCES_GEOJSON } },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': waterColor } },
          {
            id: 'land',
            type: 'fill',
            source: 'provinces',
            paint: {
              'fill-color': ['case', ['==', ['get', 'statnaam'], 'Fryslân'], hiFill, landColor],
              'fill-opacity': ['case', ['==', ['get', 'statnaam'], 'Fryslân'], 0.32, 1],
            },
          },
          {
            id: 'land-line',
            type: 'line',
            source: 'provinces',
            paint: {
              'line-color': ['case', ['==', ['get', 'statnaam'], 'Fryslân'], hiLine, lineColor],
              'line-width': ['case', ['==', ['get', 'statnaam'], 'Fryslân'], 1.8, 1.1],
            },
          },
        ],
      },
      bounds: NL_BOUNDS,
      fitBoundsOptions: { padding: 20 },
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
    });

    const markers: maplibregl.Marker[] = [];
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          'Kaartgegevens: <a href="https://www.pdok.nl" target="_blank" rel="noopener">PDOK</a> / <a href="https://www.cbs.nl" target="_blank" rel="noopener">CBS</a>',
      }),
    );

    const addLabel = (className: string, text: string, lngLat: LngLat, opts?: maplibregl.MarkerOptions) => {
      const wrap = document.createElement('div');
      wrap.className = className;
      wrap.textContent = text;
      markers.push(new maplibregl.Marker({ element: wrap, anchor: 'center', ...opts }).setLngLat(lngLat).addTo(map));
    };

    map.on('load', () => {
      PROVINCE_LABELS.forEach((pv) => {
        addLabel('ml-province-label' + (pv.name === 'Fryslân' ? ' active' : ''), pv.name, [pv.lon, pv.lat]);
      });

      REFERENCE_PLACES.forEach((rp) => {
        addLabel('ml-ref-city-label', rp.name, [rp.lon, rp.lat]);
      });

      Object.keys(byCity).forEach((city) => {
        const base = CITY_LATLNG[city] ?? ([5.6, 52.2] as LngLat);
        const list = byCity[city]!;
        const lo = CITY_LABEL_OFFSET[city] ?? { anchor: 'bottom' as maplibregl.PositionAnchor, offset: [0, -6] as [number, number] };
        addLabel('ml-city-label', city, base, { anchor: lo.anchor, offset: lo.offset });

        list.forEach((p, i) => {
          const st = getStatus(p);
          const pinEl = document.createElement('div');
          pinEl.className = 'ml-pin';
          pinEl.style.background = STATUS_COLOR[st.key] ?? '#9aa6a4';
          pinEl.title = `${p.address}, ${p.city} (${st.label})`;
          pinEl.addEventListener('click', (e) => {
            e.stopPropagation();
            router.push(`/panden/${p.id}`);
          });
          markers.push(
            new maplibregl.Marker({ element: pinEl, anchor: 'center' })
              .setLngLat(mlPinLngLat(base, i, list.length))
              .addTo(map),
          );
        });
      });
    });

    mapRef.current = map;

    return () => {
      markers.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [visibleProperties, router]);

  return (
    <div className="panel">
      <HeaderPill>
        <MyProjectsToggle />
      </HeaderPill>
      <div className="maplibre-frame">
        <div ref={containerRef} className="maplibre-el" />
      </div>
      <div className="dash-legend" style={{ marginTop: 14 }}>
        <span className="dash-legend-item">
          <span className="dash-legend-dot" style={{ background: '#9aa6a4' }} />
          Nog niet gestart
        </span>
        <span className="dash-legend-item">
          <span className="dash-legend-dot" style={{ background: 'var(--amber)' }} />
          In verwerking
        </span>
        <span className="dash-legend-item">
          <span className="dash-legend-dot" style={{ background: 'var(--teal-3)' }} />
          Klaar voor controle
        </span>
        <span className="dash-legend-item">
          <span className="dash-legend-dot" style={{ background: 'var(--good)' }} />
          Afgerond
        </span>
      </div>
      {visibleProperties.length === 0 && <div className="chart-empty">Geen panden toegewezen aan jou.</div>}
    </div>
  );
}
