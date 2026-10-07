import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { lookupCountry, CONTINENTS } from "../data/countries";
import { getLangName } from "./TopBar";
import { translate } from "../services/translator";

const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h);
}

function computeCountryGradient(countryName, continentHue) {
  const hash = hashString(countryName);
  // Slight nuanced hue shift around continent base hue (±8°)
  const hueShift = (hash % 17) - 8;
  const h = (continentHue + hueShift + 360) % 360;
  // Vary saturation between 42% and 68%
  const s = 42 + (hash % 27);
  // Vary lightness between 27% and 48% across countries
  const l = 27 + (hash % 22);

  // Gradient stops: lighter top-left, deeper bottom-right
  const gradStart = `hsl(${h}, ${Math.min(s + 6, 85)}%, ${Math.min(l + 7, 56)}%)`;
  const gradEnd = `hsl(${h}, ${Math.max(s - 6, 32)}%, ${Math.max(l - 7, 20)}%)`;
  const hoverColor = `hsl(${h}, ${Math.min(s + 22, 95)}%, ${Math.min(l + 18, 68)}%)`;

  return { gradStart, gradEnd, hoverColor };
}

export default function WorldMap({
  word,
  srcLang,
  selectedCountry,
  onSelectCountry,
  onOceanClick,
  pinnedKeys,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const labelsRef = useRef(null);
  const tooltipRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const transformRef = useRef(d3.zoomIdentity);
  const centroidsRef = useRef(new Map());

  const [worldData, setWorldData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pinTranslations, setPinTranslations] = useState({});

  // Helper to reposition pin DOM elements directly with 0 React re-renders
  const updatePinPositions = useCallback(() => {
    if (!labelsRef.current) return;
    const t = transformRef.current;
    const pinElements = labelsRef.current.querySelectorAll(".pin[data-key]");

    pinElements.forEach((el) => {
      const key = el.dataset.key;
      const c = centroidsRef.current.get(key);
      if (c && !Number.isNaN(c[0])) {
        const x = t.x + t.k * c[0];
        const y = t.y + t.k * c[1];
        el.style.translate = `${x}px ${y - 8}px`;
      }
    });
  }, []);

  // 1. Load world topology once
  useEffect(() => {
    let active = true;
    fetch(WORLD_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load map data");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const features = topojson.feature(
          data,
          data.objects.countries
        ).features.filter((f) => f.geometry);

        const borders = topojson.mesh(
          data,
          data.objects.countries,
          (a, b) => a !== b
        );

        features.forEach((f, i) => {
          f.key = `c-${i}`;
          f.info = lookupCountry(f.properties.name);
          const { gradStart, gradEnd, hoverColor } = computeCountryGradient(
            f.properties.name,
            f.info.continentHue
          );
          f.gradStart = gradStart;
          f.gradEnd = gradEnd;
          f.hoverColor = hoverColor;
        });

        setWorldData({ features, borders });
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // 2. Compute projection & centroids once when worldData loads
  const { path, pathDList, bordersD } = useMemo(() => {
    if (!worldData) return { path: null, pathDList: [], bordersD: null };

    const proj = d3.geoNaturalEarth1();
    const p = d3.geoPath(proj);
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    const top = w < 640 ? 130 : 100;
    proj.fitExtent([[16, top], [w - 16, h - 16]], { type: "Sphere" });

    const cMap = new Map();
    const dList = [];

    worldData.features.forEach((f) => {
      const geom = f.geometry;
      let centroid;
      if (geom && geom.type === "MultiPolygon") {
        let best = null,
          max = -1;
        for (const coords of geom.coordinates) {
          const poly = { type: "Polygon", coordinates: coords };
          const a = p.area(poly);
          if (a > max) {
            max = a;
            best = poly;
          }
        }
        centroid = p.centroid(best);
      } else {
        centroid = p.centroid(f);
      }
      cMap.set(f.key, centroid);
      dList.push({ feature: f, d: p(f) });
    });

    centroidsRef.current = cMap;
    const bD = worldData.borders ? p(worldData.borders) : null;

    return { path: p, pathDList: dList, bordersD: bD };
  }, [worldData]);

  // 3. Setup D3 Zoom with DIRECT DOM manipulation (NO React re-renders on zoom/pan)
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svgEl = d3.select(svgRef.current);
    const gEl = d3.select(gRef.current);

    let rafId = null;

    const zoom = d3
      .zoom()
      .scaleExtent([1, 24])
      .clickDistance(5)
      .on("zoom", (e) => {
        transformRef.current = e.transform;

        // Apply hardware-accelerated transform directly to the SVG group
        gEl.attr("transform", e.transform);

        // Hide tooltip during pan/zoom
        if (tooltipRef.current) {
          tooltipRef.current.hidden = true;
        }

        // Reposition pins via requestAnimationFrame for silky 60+ FPS
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            updatePinPositions();
            rafId = null;
          });
        }
      });

    zoomBehaviorRef.current = zoom;
    svgEl.call(zoom).on("dblclick.zoom", null);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [updatePinPositions]);

  // Compute active pins list
  const activePins = useMemo(() => {
    if (!worldData?.features) return [];
    const list = [];
    const seen = new Set();

    worldData.features.forEach((f) => {
      if (pinnedKeys.has(f.key)) {
        list.push({ feature: f, isSticky: true });
        seen.add(f.key);
      }
    });

    if (selectedCountry && !seen.has(selectedCountry.key)) {
      list.push({ feature: selectedCountry, isSticky: false });
    }

    return list;
  }, [worldData, pinnedKeys, selectedCountry]);

  // Ensure pin positions are aligned whenever pins change
  useEffect(() => {
    updatePinPositions();
  }, [activePins, updatePinPositions]);

  // Translate for active pins
  useEffect(() => {
    if (!word) {
      setPinTranslations({});
      return;
    }

    let active = true;
    activePins.forEach(({ feature }) => {
      const lang = feature.info.langs[0];
      if (!lang) return;

      translate(word, srcLang, lang)
        .then((res) => {
          if (!active) return;
          if (res) {
            setPinTranslations((prev) => ({
              ...prev,
              [feature.key]: res.text,
            }));
          }
        })
        .catch(() => {
          if (!active) return;
          setPinTranslations((prev) => ({
            ...prev,
            [feature.key]: "⚠",
          }));
        });
    });

    return () => {
      active = false;
    };
  }, [activePins, word, srcLang]);

  // Direct DOM Tooltip handlers (0 React re-renders on mousemove)
  const handleCountryMouseMove = (e, feature) => {
    if (!tooltipRef.current) return;
    const tt = tooltipRef.current;
    const lang = feature.info.langs[0];
    const langLabel = lang ? ` · ${getLangName(lang)}` : "";
    const contLabel = feature.info.continentName ? ` (${feature.info.continentName})` : "";

    tt.textContent = `${feature.properties.name}${contLabel}${langLabel}`;
    tt.hidden = false;

    const x = Math.min(e.clientX + 14, window.innerWidth - 240);
    const y = Math.min(e.clientY + 16, window.innerHeight - 50);
    tt.style.transform = `translate(${x}px, ${y}px)`;
  };

  const handleCountryMouseLeave = () => {
    if (tooltipRef.current) {
      tooltipRef.current.hidden = true;
    }
  };

  const handleSvgClick = (e) => {
    if (e.target.tagName !== "path" || !e.target.classList.contains("country")) {
      onOceanClick();
    }
  };

  // Zoom controls buttons
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, 1.7);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, 1 / 1.7);
  };

  const handleZoomReset = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div className="map-container" ref={containerRef}>
      {loading && (
        <div className="loading">
          <div className="spinner" />
          <span>Loading world map…</span>
        </div>
      )}

      {error && (
        <div className="loading error">
          <span>{error}</span>
        </div>
      )}

      <svg
        ref={svgRef}
        id="world-map-svg"
        role="img"
        aria-label="Interactive world map"
        onClick={handleSvgClick}
      >
        <defs>
          <radialGradient id="ocean-grad" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#10264a" />
            <stop offset="100%" stopColor="#070f22" />
          </radialGradient>

          {worldData?.features.map((feature) => (
            <linearGradient
              key={`grad-${feature.key}`}
              id={`grad-${feature.key}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={feature.gradStart} />
              <stop offset="100%" stopColor={feature.gradEnd} />
            </linearGradient>
          ))}
        </defs>

        <g ref={gRef}>
          {/* Ocean Sphere */}
          {path && (
            <path
              className="sphere"
              d={path({ type: "Sphere" })}
              fill="url(#ocean-grad)"
            />
          )}

          {/* Graticule lines */}
          {path && (
            <path
              className="graticule"
              d={path(d3.geoGraticule10())}
            />
          )}

          {/* Countries */}
          {pathDList.map(({ feature, d }) => {
            if (!d) return null;
            const isSelected = selectedCountry?.key === feature.key;
            const isPinned = pinnedKeys.has(feature.key);

            return (
              <path
                key={feature.key}
                d={d}
                className={`country ${isPinned ? "pinned" : ""} ${
                  isSelected ? "selected" : ""
                }`}
                style={{
                  "--c": `url(#grad-${feature.key})`,
                  "--ch": feature.hoverColor,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCountry(feature);
                }}
                onMouseMove={(e) => handleCountryMouseMove(e, feature)}
                onMouseLeave={handleCountryMouseLeave}
              />
            );
          })}

          {/* Borders Mesh */}
          {bordersD && <path className="borders" d={bordersD} />}
        </g>
      </svg>

      {/* Pins overlay */}
      <div id="labels" ref={labelsRef} aria-live="polite">
        {activePins.map(({ feature, isSticky }) => {
          const isSelected = selectedCountry?.key === feature.key;
          const trText = pinTranslations[feature.key];
          const primaryLang = feature.info.langs[0];

          return (
            <div
              key={feature.key}
              data-key={feature.key}
              className={`pin ${isSelected ? "active" : ""} ${
                isSticky ? "sticky" : "transient"
              }`}
              onClick={() => onSelectCountry(feature)}
              role="button"
              tabIndex={0}
            >
              <span className="pin-word" dir="auto">
                {word ? trText || "…" : feature.properties.name}
              </span>
              <span className="pin-lang">
                {feature.properties.name}
                {primaryLang && ` · ${getLangName(primaryLang)}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* High-performance direct DOM tooltip */}
      <div ref={tooltipRef} className="tooltip" hidden />

      {/* Continent Color Legend */}
      <div className="continent-legend" aria-label="Continent colors">
        {Object.values(CONTINENTS).map((cont) => (
          <div key={cont.code} className="legend-item" title={cont.name}>
            <span
              className="legend-dot"
              style={{
                background: `linear-gradient(135deg, hsl(${cont.hue}, 65%, 52%), hsl(${cont.hue}, 50%, 30%))`,
              }}
            />
            <span className="legend-label">{cont.name}</span>
          </div>
        ))}
      </div>

      {/* Zoom Controls */}
      <div className="zoom-controls" role="group" aria-label="Map zoom">
        <button type="button" onClick={handleZoomIn} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={handleZoomOut} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={handleZoomReset} aria-label="Reset view">
          ⟲
        </button>
      </div>
    </div>
  );
}
