import React, { useState, useEffect } from "react";
import { Copy, Check, X, Pin, PinOff } from "lucide-react";
import { getLangName } from "./TopBar";
import { translate } from "../services/translator";

export default function CountryCard({
  country,
  word,
  srcLang,
  isPinned,
  onTogglePin,
  onClose,
  onTranslationDetected,
}) {
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  const { properties, info } = country;
  const countryName = properties.name;
  const langs = info.langs || [];

  useEffect(() => {
    if (!word || langs.length === 0) return;

    let active = true;
    langs.forEach((langCode) => {
      setLoading((prev) => ({ ...prev, [langCode]: true }));

      translate(word, srcLang, langCode)
        .then((res) => {
          if (!active) return;
          if (res) {
            setTranslations((prev) => ({ ...prev, [langCode]: res }));
            if (res.detected && onTranslationDetected) {
              onTranslationDetected(res.detected);
            }
          }
        })
        .catch((err) => {
          if (!active) return;
          setTranslations((prev) => ({
            ...prev,
            [langCode]: { error: true },
          }));
        })
        .finally(() => {
          if (active) {
            setLoading((prev) => ({ ...prev, [langCode]: false }));
          }
        });
    });

    return () => {
      active = false;
    };
  }, [country, word, srcLang]);

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Ignore clipboard write failure
    }
  };

  const getNativeName = (code) => {
    try {
      const n = new Intl.DisplayNames([code], { type: "language" }).of(code);
      return n && n !== code && n !== getLangName(code) ? n : null;
    } catch {
      return null;
    }
  };

  return (
    <aside className="card" role="region" aria-label={`Details for ${countryName}`}>
      <button
        type="button"
        className="card-close"
        onClick={onClose}
        aria-label="Close country details"
      >
        <X size={18} />
      </button>

      <div className="card-head">
        {info.iso ? (
          <img
            className="flag"
            src={`https://flagcdn.com/w160/${info.iso}.png`}
            alt={`Flag of ${countryName}`}
            loading="lazy"
          />
        ) : (
          <div className="flag flag-empty" aria-hidden="true">
            🏳
          </div>
        )}

        <div>
          <h2>{countryName}</h2>
          <p>
            {info.continentName && <span className="continent-badge">{info.continentName}</span>}
            {langs.length > 0
              ? info.unknown
                ? " · Language unavailable (showing English)"
                : ` · ${langs.map((l) => getLangName(l)).join(" · ")}`
              : " · No official language"}
          </p>
        </div>
      </div>

      {langs.length === 0 ? (
        <div className="empty">Nobody officially lives here — try another country!</div>
      ) : !word ? (
        <div className="empty">Type a word in the search bar above to see it translated.</div>
      ) : (
        <div className="source">
          Translating <b>“{word}”</b>
          {srcLang !== "auto" && ` from ${getLangName(srcLang)}`}
        </div>
      )}

      {word && langs.length > 0 && (
        <ul className="translations">
          {langs.map((langCode) => {
            const tr = translations[langCode];
            const isLoading = loading[langCode] && !tr;
            const native = getNativeName(langCode);

            return (
              <li key={langCode}>
                <div className="lang-row">
                  <span>{getLangName(langCode)}</span>
                  {native && <span className="lang-native">{native}</span>}
                </div>

                {isLoading ? (
                  <div className="skeleton" aria-hidden="true" />
                ) : tr?.error ? (
                  <div className="err">Translation unavailable for this language.</div>
                ) : tr ? (
                  <>
                    <div className="tr" dir="auto" lang={langCode}>
                      {tr.text}
                    </div>
                    {tr.roman && <div className="roman">{tr.roman}</div>}
                    <div className="actions">
                      <button
                        type="button"
                        onClick={() => handleCopy(tr.text, langCode)}
                      >
                        {copiedKey === langCode ? (
                          <>
                            <Check size={14} /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="card-foot">
        <button type="button" className="text-btn" onClick={onTogglePin}>
          {isPinned ? (
            <>
              <PinOff size={14} /> Unpin
            </>
          ) : (
            <>
              <Pin size={14} /> Keep pinned
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
