import React from "react";
import { Languages, X } from "lucide-react";

export const SOURCE_LANGS = [
  "auto", "en", "es", "fr", "de", "it", "pt", "ru", "zh-CN", "ja", "ko",
  "ar", "hi", "tr", "nl", "pl", "sv", "el", "he", "uk", "ro", "bg", "cs",
  "vi", "th", "id", "fa"
];

const enNames = new Intl.DisplayNames(["en"], { type: "language" });
export const getLangName = (code) => {
  if (!code || code === "auto") return "Auto-detect";
  try {
    return enNames.of(code) || code;
  } catch {
    return code;
  }
};

export default function TopBar({
  word,
  onWordChange,
  srcLang,
  onSrcLangChange,
  detectedLang,
  pinnedCount,
  onClearPins,
}) {
  return (
    <header className="topbar">
      <form
        className="searchbar"
        onSubmit={(e) => e.preventDefault()}
        role="search"
        autoComplete="off"
      >
        <span className="search-icon" aria-hidden="true">
          <Languages size={20} />
        </span>

        <input
          id="word-input"
          type="search"
          value={word}
          onChange={(e) => onWordChange(e.target.value)}
          placeholder="Type a word or phrase…"
          maxLength={200}
          spellCheck="false"
          aria-label="Word to translate"
        />

        <div className="src-wrap">
          <select
            id="src-select"
            value={srcLang}
            onChange={(e) => onSrcLangChange(e.target.value)}
            aria-label="Source language"
          >
            {SOURCE_LANGS.map((code) => (
              <option key={code} value={code}>
                {getLangName(code)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="pill-btn"
          onClick={onClearPins}
          disabled={pinnedCount === 0}
          title="Remove all pinned countries"
        >
          Clear pins
        </button>
      </form>

      <p className="hint">
        {!word ? (
          "Type a word, then click any country"
        ) : srcLang === "auto" && detectedLang ? (
          <>
            Detected <b>{getLangName(detectedLang)}</b> ·{" "}
            {pinnedCount > 0
              ? `${pinnedCount} pinned`
              : "click any country to translate"}
          </>
        ) : pinnedCount > 0 ? (
          `${pinnedCount} countr${pinnedCount === 1 ? "y" : "ies"} pinned`
        ) : (
          "Click any country on the map"
        )}
      </p>
    </header>
  );
}
