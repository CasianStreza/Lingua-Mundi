import React, { useState, useEffect } from "react";
import TopBar from "./components/TopBar";
import WorldMap from "./components/Map";
import CountryCard from "./components/CountryCard";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const [wordInput, setWordInput] = useState("hello");
  const [debouncedWord, setDebouncedWord] = useState("hello");
  const [srcLang, setSrcLang] = useState("auto");
  const [detectedLang, setDetectedLang] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [pinnedKeys, setPinnedKeys] = useState(new Set());

  // Debounce input to prevent hammering translation endpoints
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedWord(wordInput.trim());
      setDetectedLang(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [wordInput]);

  // Handle escape key to close card and deselect transient country
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedCountry(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
  };

  const handleOceanClick = () => {
    setSelectedCountry(null);
  };

  const handleTogglePin = () => {
    if (!selectedCountry) return;
    setPinnedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(selectedCountry.key)) {
        next.delete(selectedCountry.key);
      } else {
        next.add(selectedCountry.key);
      }
      return next;
    });
  };

  const handleClearPins = () => {
    setPinnedKeys(new Set());
    setSelectedCountry(null);
  };

  return (
    <div className="app-root">
      <TopBar
        word={wordInput}
        onWordChange={setWordInput}
        srcLang={srcLang}
        onSrcLangChange={(lang) => {
          setSrcLang(lang);
          setDetectedLang(null);
        }}
        detectedLang={detectedLang}
        pinnedCount={pinnedKeys.size}
        onClearPins={handleClearPins}
      />

      <WorldMap
        word={debouncedWord}
        srcLang={srcLang}
        selectedCountry={selectedCountry}
        onSelectCountry={handleSelectCountry}
        onOceanClick={handleOceanClick}
        pinnedKeys={pinnedKeys}
        onTogglePin={handleTogglePin}
      />

      {selectedCountry && (
        <ErrorBoundary>
          <CountryCard
            country={selectedCountry}
            word={debouncedWord}
            srcLang={srcLang}
            isPinned={pinnedKeys.has(selectedCountry.key)}
            onTogglePin={handleTogglePin}
            onClose={() => setSelectedCountry(null)}
            onTranslationDetected={(lang) => {
              if (srcLang === "auto") setDetectedLang(lang);
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
