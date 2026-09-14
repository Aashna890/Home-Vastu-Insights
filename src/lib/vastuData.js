// Vastu Purusha Mandala framework data — Paramasaayika / Shakti Chakra tradition.
// All values are DATA (no analysis results are hardcoded). Areas are computed
// geometrically by vastuEngine.js from the detected plot box and North bearing.

export const RING = {
  manushyaOuter: 0.589,
  devaOuter: 0.386,
  brahmaRadius: 0.03,
};

export const TOLERANCE = {
  dev4:  0.137,
  dev8:  0.125,
  dev32: 0.2147,
  brahma: 0.2,
};

export const BRAHMA = {
  name: "Brahmsthan",
  direction: "Centre",
  offering: "Kesar ka tikka",
  nakshatra: "Rohini",
  note: "Centre of the plot — keep light, open and clutter-free.",
};

// 4 cardinal Devtas — each covers 90° of the Vastu circle
// Bearing convention: 0=North, 90=East, 180=South, 270=West (clockwise)
// N-sector: 315→45 (centred on 0/North), E-sector: 45→135, S-sector: 135→225, W-sector: 225→315
export const DEVTAS_4 = [
  { name: "Bhudhar",  direction: "N", offering: "Gehu ka Aata",        nakshatra: "Poorva Ashadha", sectorStart: 315, sectorSpan: 90 },
  { name: "Aryama",   direction: "E", offering: "Chocolate / Shakkar", nakshatra: "Uttra Phalguni", sectorStart:  45, sectorSpan: 90 },
  { name: "Vivaswan", direction: "S", offering: "Lit a Diya",          nakshatra: "Ashwini",        sectorStart: 135, sectorSpan: 90 },
  { name: "Mitra",    direction: "W", offering: "Gud / Kheer",         nakshatra: "Anuradha",       sectorStart: 225, sectorSpan: 90 },
];

// 8 Devtas — each spans 22.5°, placed in adjacent pairs straddling each intercardinal axis.
//
// VERIFIED from reference image degree-ring readings (North detected at 0°):
//
//   The 8-Devta ring is offset +17° from cardinal North.
//   Devtas do NOT start at clean 0/45/90/135... boundaries.
//   Each devta spans 22.5° (= half of a 45° intercardinal zone).
//   They come in clockwise pairs, one on each side of each intercardinal midpoint.
//
//   Devta          sectorStart   sectorEnd    Direction   Position
//   ──────────────────────────────────────────────────────────────────
//   Aapha               17°       39.5°        NW         NW side of North axis
//   Aapaavastha         40°       62.5°         N         NE side of North axis
//   Savita             107°      129.5°        NE         NW side of East axis
//   Savitra            130°      152.5°         E         SE side of East axis
//   Indra              197°      219.5°        SE         NE side of South axis
//   Jaya               220°      242.5°         S         SW side of South axis
//   Rudra              287°      309.5°        SW         NW side of West axis
//   Rajyakshma         310°      332.5°         W         NW side of West axis
//
// Inter-pair gaps (the 4 cardinal zones between pairs): 62.5°→107° (NE), 152.5°→197° (SE),
//   242.5°→287° (SW), 332.5°→17° wrapping (NW) — each gap ≈ 44.5°, aligning with Dev4 zones.
export const DEVTAS_8 = [
  { name: "Aapha",       direction: "NW", offering: "Nariyal",             nakshatra: "-",               sectorStart:  17,  sectorSpan: 22.5 },
  { name: "Aapaavastha", direction: "N",  offering: "Ghee",                nakshatra: "-",               sectorStart:  40,  sectorSpan: 22.5 },
  { name: "Savita",      direction: "NE", offering: "Kheer / Peda",        nakshatra: "Poorva Phalguni", sectorStart: 107,  sectorSpan: 22.5 },
  { name: "Savitra",     direction: "E",  offering: "Batasha Gheeshakker", nakshatra: "Vishakha",        sectorStart: 130,  sectorSpan: 22.5 },
  { name: "Indra",       direction: "SE", offering: "Pilli Sarso",         nakshatra: "-",               sectorStart: 197,  sectorSpan: 22.5 },
  { name: "Jaya",        direction: "S",  offering: "Kali Sarso",          nakshatra: "-",               sectorStart: 220,  sectorSpan: 22.5 },
  { name: "Rudra",       direction: "SW", offering: "Onion",               nakshatra: "Ardra",           sectorStart: 287,  sectorSpan: 22.5 },
  { name: "Rajyakshma",  direction: "W",  offering: "Supari (Sabut)",      nakshatra: "Dhanishta",       sectorStart: 310,  sectorSpan: 22.5 },
];

// 32 perimeter Devtas — each covers 11.25°, clockwise from 0° (North).
// ORDER VERIFIED against both reference images:
//   Soma starts exactly at 0° (North marker). Each subsequent devta is +11.25° clockwise.
//   Full traversal: N(0°) → NE(45°) → E(90°) → SE(135°) → S(180°) → SW(225°) → W(270°) → NW(315°) → N(360°)
//
// Index  StartDeg  Name          Dir     Notes (from image degree ring)
//   0       0.00   Soma          N→NW    At North (0°) — circled in reference images
//   1      11.25   Bhujang       N→NW
//   2      22.50   Aditi         N→NW
//   3      33.75   Diti          N→NE
//   4      45.00   Shikhi        NE      NE corner
//   5      56.25   Prajanya      NE
//   6      67.50   Jayant        NE
//   7      78.75   Mahender      NE→E
//   8      90.00   Surya         E       East marker
//   9     101.25   Satya         E
//  10     112.50   Bhrisha       E
//  11     123.75   Antriksh      E→SE
//  12     135.00   Anil          SE      SE corner
//  13     146.25   Pusha         SE
//  14     157.50   Vitasta       SE
//  15     168.75   Grispatya     SE→S
//  16     180.00   Yama          S       South marker
//  17     191.25   Gandharav     S
//  18     202.50   Bhrigraj      S
//  19     213.75   Mrighah       S→SW
//  20     225.00   Pitr          SW      SW corner
//  21     236.25   Dauwarik      SW
//  22     247.50   Sugreev       SW
//  23     258.75   Pushpdant     SW→W
//  24     270.00   Varun         W       West marker
//  25     281.25   Asur          W
//  26     292.50   Shosha        W
//  27     303.75   Papyakshma    W→NW
//  28     315.00   Rog           NW      NW corner
//  29     326.25   Ahir          NW
//  30     337.50   Mukhya        NW
//  31     348.75   Bhallat       NW→N    Last sector, ends at 360°=0°
const RAW_32 = [
  // N zone (0° – 45°): Soma, Bhujang, Aditi, Diti
  ["Soma",       "N",  "Makhana / Butter",            "Mrigashira"],
  ["Bhujang",    "N",  "Tulsi Patta",                 "-"],
  ["Aditi",      "N",  "Puri and Kheer / Dhai",       "Punarvasu"],
  ["Diti",       "N",  "Tamsik food / Basi Khana",    "Pushya"],
  // NE zone (45° – 90°): Shikhi, Prajanya, Jayant, Mahender
  ["Shikhi",     "NE", "Ghee ka Diya",                "Pushya"],
  ["Prajanya",   "NE", "Makhana",                     "Pushya"],
  ["Jayant",     "NE", "Chandan",                     "Pushya"],
  ["Mahender",   "NE", "Panchamrit",                  "Pushya"],
  // E zone (90° – 135°): Surya, Satya, Bhrisha, Antriksh
  ["Surya",      "E",  "Gud",                         "Hast"],
  ["Satya",      "E",  "Wheat Ghee mixed",            "Uttarashad"],
  ["Bhrisha",    "E",  "Fish oil / Badam oil",        "Bharani"],
  ["Antriksh",   "E",  "Clove",                       "Kritika"],
  // SE zone (135° – 180°): Anil, Pusha, Vitasta, Grispatya
  ["Anil",       "SE", "Lal Chandan",                 "Kritika"],
  ["Pusha",      "SE", "Kheel",                       "Revati"],
  ["Vitasta",    "SE", "Chane",                       "-"],
  ["Grispatya",  "SE", "Wheat and honey mix",         "-"],
  // S zone (180° – 225°): Yama, Gandharav, Bhrigraj, Mrighah
  ["Yama",       "S",  "Paneer",                      "-"],
  ["Gandharav",  "S",  "Any beautiful designed food", "-"],
  ["Bhrigraj",   "S",  "Alcohol",                     "Jyestha"],
  ["Mrighah",    "S",  "Jaun",                        "Chitra"],
  // SW zone (225° – 270°): Pitr, Dauwarik, Sugreev, Pushpdant
  ["Pitr",       "SW", "Almonds",                     "Magha"],
  ["Dauwarik",   "SW", "Pani ka kalash / Keel",       "Moola"],
  ["Sugreev",    "SW", "5 types grains",              "-"],
  ["Pushpdant",  "SW", "Jawar",                       "-"],
  // W zone (270° – 315°): Varun, Asur, Shosha, Papyakshma
  ["Varun",      "W",  "Water",                       "Shatabhisha"],
  ["Asur",       "W",  "Curd",                        "Poorva Bhadrapada"],
  ["Shosha",     "W",  "Paan / Supari",               "Shravana"],
  ["Papyakshma", "W",  "Onion",                       "-"],
  // NW zone (315° – 360°): Rog, Ahir, Mukhya, Bhallat
  ["Rog",        "NW", "Khopra / Sukha Nariyal",      "Swati"],
  ["Ahir",       "NW", "Fresh fruits",                "Aslesha"],
  ["Mukhya",     "NW", "Mango / Wheat / Brinjal",     "-"],
  ["Bhallat",    "NW", "Moong Daal",                  "Uttra Bhadrapada"],
];

export const DEVTAS_32 = RAW_32.map(([name, direction, offering, nakshatra], i) => ({
  name,
  direction,
  offering,
  nakshatra,
  sectorStart: i * 11.25,
  sectorSpan:  11.25,
}));

export const DIRECTIONS = [
  { code: "N",  label: "North",      bearing:   0 },
  { code: "NE", label: "North-East", bearing:  45 },
  { code: "E",  label: "East",       bearing:  90 },
  { code: "SE", label: "South-East", bearing: 135 },
  { code: "S",  label: "South",      bearing: 180 },
  { code: "SW", label: "South-West", bearing: 225 },
  { code: "W",  label: "West",       bearing: 270 },
  { code: "NW", label: "North-West", bearing: 315 },
];