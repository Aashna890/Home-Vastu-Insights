// Vastu Purusha Mandala framework data — Paramasaayika / Shakti Chakra tradition.
// All values are DATA (no analysis results are hardcoded). Areas are computed
// geometrically by vastuEngine.js from the detected plot box and North bearing.

// Concentric ring radii as fractions of the outer (circumscribed) radius R.
// Derived from the standard Brahma / Deva / Manushya / Paishacha Vithi band split.
//   Paishacha (outer, 32 devtas): [manushyaOuter .. R]
//   Manushya  (middle, 8 devtas): [devaOuter .. manushyaOuter]
//   Deva      (inner, 4 devtas):  [brahmaRadius .. devaOuter]
//   Brahma    (centre):          [0 .. brahmaRadius]
export const RING = {
  manushyaOuter: 0.589,
  devaOuter: 0.386,
  brahmaRadius: 0.03,
};

// Acceptable-area tolerance per chakra (Min = Avg*(1-t), Max = Avg*(1+t)).
export const TOLERANCE = {
  dev4: 0.137,
  dev8: 0.125,
  dev32: 0.2147,
  brahma: 0.2,
};

export const BRAHMA = {
  name: "Brahmsthan",
  direction: "Centre",
  offering: "Kesar ka tikka",
  note: "Centre of the plot — keep light, open and clutter-free.",
};

// 4 cardinal Devtas (Deva Vithi). sector = 90° wedge centred on the direction.
export const DEVTAS_4 = [
  { name: "Bhudhar", direction: "N", offering: "Gehu ka Aata", sectorStart: 315, sectorSpan: 90 },
  { name: "Aryama", direction: "E", offering: "Kesar ka tikka", sectorStart: 45, sectorSpan: 90 },
  { name: "Vivaswan", direction: "S", offering: "Lit a Diya", sectorStart: 135, sectorSpan: 90 },
  { name: "Mitra", direction: "W", offering: "Gud / Kheer", sectorStart: 225, sectorSpan: 90 },
];

// 8 diagonal Devtas (Manushya Vithi). 8 sectors of 45°, pairs straddle each diagonal.
export const DEVTAS_8 = [
  { name: "Aapha", direction: "NE", offering: "Ghee", sectorStart: 0, sectorSpan: 45 },
  { name: "Aapaavastha", direction: "NE", offering: "Nariyal", sectorStart: 45, sectorSpan: 45 },
  { name: "Savita", direction: "SE", offering: "Kheer / Peda", sectorStart: 90, sectorSpan: 45 },
  { name: "Savitra", direction: "SE", offering: "Batasha Gheeshakker", sectorStart: 135, sectorSpan: 45 },
  { name: "Indra", direction: "SW", offering: "Pillii Sarso", sectorStart: 180, sectorSpan: 45 },
  { name: "Jaya", direction: "SW", offering: "Kali Sarso", sectorStart: 225, sectorSpan: 45 },
  { name: "Rudra", direction: "NW", offering: "Onion", sectorStart: 270, sectorSpan: 45 },
  { name: "Rajyakshma", direction: "NW", offering: "Supari (Sabut)", sectorStart: 315, sectorSpan: 45 },
];

// 32 perimeter Devtas (Paishacha Vithi). 32 sectors of 11.25°, clockwise from North.
// 4 devtas per 45° direction group: N, NE, E, SE, S, SW, W, NW.
const RAW_32 = [
  ["Shikhi", "N", "Ghee ka Diya"],
  ["Prajanya", "N", "Makhana"],
  ["Jayant", "N", "Chandan"],
  ["Mahender", "N", "Panchamrit"],
  ["Surya", "NE", "Gud"],
  ["Satya", "NE", "Wheat Ghee mixed"],
  ["Bhrisha", "NE", "Fish oil / Badam oil"],
  ["Antriksh", "NE", "Clove"],
  ["Anil", "E", "Lal Chandan"],
  ["Pusha", "E", "Kheel"],
  ["Vitasta", "E", "Chane"],
  ["Grispatya", "E", "Wheat and honey mix"],
  ["Yama", "SE", "Paneer"],
  ["Gandharav", "SE", "Any beautiful designed food"],
  ["Bhrigraj", "SE", "Alcohol"],
  ["Mrighah", "SE", "Jaun"],
  ["Pitr", "S", "Almonds"],
  ["Dauwarik", "S", "Pani ka kalash / Keel"],
  ["Sugreev", "S", "5 types grains"],
  ["Pushpdant", "S", "Jawar"],
  ["Varun", "SW", "Water"],
  ["Asur", "SW", "Curd"],
  ["Shosha", "SW", "Paan / Supari"],
  ["Papyakshma", "SW", "Onion"],
  ["Rog", "W", "Khopra / Sukha Nariyal"],
  ["Ahir", "W", "Fresh fruits"],
  ["Mukhya", "W", "Mango / Wheat / Brinjal"],
  ["Bhallat", "W", "Moong Daal"],
  ["Soma", "NW", "Makhana / Butter"],
  ["Bhujang", "NW", "Tulsi Patta"],
  ["Aditi", "NW", "Puri and Kheer / Dahi"],
  ["Diti", "NW", "Tamsik food / Basi Khana"],
];

export const DEVTAS_32 = RAW_32.map(([name, direction, offering], i) => ({
  name,
  direction,
  offering,
  sectorStart: i * 11.25,
  sectorSpan: 11.25,
}));

// Compass directions for overlays, clockwise from North (bearing in degrees).
export const DIRECTIONS = [
  { code: "N", label: "North", bearing: 0 },
  { code: "NE", label: "North-East", bearing: 45 },
  { code: "E", label: "East", bearing: 90 },
  { code: "SE", label: "South-East", bearing: 135 },
  { code: "S", label: "South", bearing: 180 },
  { code: "SW", label: "South-West", bearing: 225 },
  { code: "W", label: "West", bearing: 270 },
  { code: "NW", label: "North-West", bearing: 315 },
];