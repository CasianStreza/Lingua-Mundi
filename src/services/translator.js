// Translation service with in-memory caching and fallback

const cache = new Map();

export async function googleTranslate(text, sl, tl) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=rm" +
    `&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const data = await r.json();
  let out = "",
    roman = "";
  for (const seg of data[0] || []) {
    if (seg[0]) out += seg[0];
    else if (seg[2]) roman += seg[2];
  }
  if (!out) throw new Error("Empty result");
  return {
    text: out,
    roman,
    detected: typeof data[2] === "string" ? data[2] : null,
  };
}

export async function myMemoryTranslate(text, sl, tl) {
  const from = sl === "auto" ? "Autodetect" : sl;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${tl}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const data = await r.json();
  const t = data?.responseData?.translatedText;
  if (data.responseStatus !== 200 || !t || /INVALID|MYMEMORY WARNING/i.test(t)) {
    throw new Error("Unavailable");
  }
  return { text: t, roman: "", detected: null };
}

export function translate(text, sl = "auto", tl) {
  if (!text || !tl) return Promise.resolve(null);
  const key = `${sl}|${tl}|${text.trim()}`;
  if (cache.has(key)) return cache.get(key);

  const p = googleTranslate(text.trim(), sl, tl)
    .catch(() => myMemoryTranslate(text.trim(), sl, tl))
    .then((res) => {
      if (res.roman && res.roman.toLowerCase() === res.text.toLowerCase()) {
        res.roman = "";
      }
      return res;
    });

  cache.set(key, p);
  p.catch(() => cache.delete(key));
  return p;
}


