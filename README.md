# 🌍 Lingua Mundi — Interactive World Map Translator

An interactive, responsive world map with live translations across all countries. Type any word or phrase, click any country on the globe, and see it translated into the country's native languages with romanized pronunciations.

Live demo: **[https://casianstreza.github.io/Lingua-Mundi/](https://casianstreza.github.io/Lingua-Mundi/)**

---

## ✨ Features

- **🌐 Interactive World Map**: Smooth Natural Earth projection built with D3 and TopoJSON.
- **🎨 Continent Color Palettes**: Each continent has a distinct color theme (Africa = Warm Amber, Asia = Emerald Green, Europe = Royal Sapphire, North America = Teal, South America = Crimson, Oceania = Purple, Antarctica = Icy Slate).
- **🌈 Unique Country Gradients**: Every country within a continent has its own distinct multi-stop gradient for clear geographic boundaries.
- **⚡ 60+ FPS Performance**: Hardware-accelerated SVG transformations decoupled from React state for buttery smooth panning and zooming.
- **🔍 Auto-Detect & Source Selection**: Auto-detects the typed language or lets you choose from 25+ source languages.
- **📍 Pin & Compare**: Pin multiple countries to compare translations side by side across the globe.
- **📋 Copy & Pronunciation**: Copy native script translations with one click, along with phonetic romanization for non-Latin scripts.

---

## 🛠️ Tech Stack

- **React 19**
- **Vite**
- **D3.js** (`d3-geo`, `d3-zoom`, `d3-selection`)
- **TopoJSON Client**
- **Lucide React**

---

## 🚀 Local Development

```bash
# Clone the repository
git clone https://github.com/CasianStreza/Lingua-Mundi.git

# Navigate into the project
cd Lingua-Mundi

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 📦 Deployment

Automatically deployed to GitHub Pages via GitHub Actions on every push to `main`.
