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
  { name: "Bhudhar",  direction: "N", offering: "Gehu ka Aata",        nakshatra: "Poorva Ashadha",  sectorStart: 315, sectorSpan: 90 },
  { name: "Aryama",   direction: "E", offering: "Chocolate / Shakkar",  nakshatra: "Uttra Phalguni",  sectorStart:  45, sectorSpan: 90 },
  { name: "Vivaswan", direction: "S", offering: "lit a Diya",           nakshatra: "Ashwini",         sectorStart: 135, sectorSpan: 90 },
  { name: "Mitra",    direction: "W", offering: "Gud / Kheer",          nakshatra: "Anuradha",        sectorStart: 225, sectorSpan: 90 },
];

// 8 Devtas — each covers 45°, filling the ring between devaOuter and manushyaOuter
// Sectors start at 0° (North) and go clockwise: NE=0-45, E=45-90 ... etc.
// Mapping from expected image:
//   Aapha      NE  0→45
//   Savita     SE  45→90   (was Aapaavastha — fixed to match image 5)
//   Savitra    SE  90→135
//   Yama/Indra SW  135→180  (Indra in image 5 is SW-lower)
//   Jaya       SW  180→225
//   Rudra      NW  225→270  (image 5: Rudra is NW upper-right area)
//   Rajyakshma NW  270→315
//   Aapaavastha NE 315→360
// NOTE: Re-mapped to match the reference screenshots (image 5) exactly
export const DEVTAS_8 = [
  { name: "Aapha",       direction: "NE", offering: "Ghee",                nakshatra: "Nariyal",         sectorStart:   0, sectorSpan: 45 },
  { name: "Savita",      direction: "SE", offering: "Kheer / Peda",        nakshatra: "Poorva Phalguni", sectorStart:  45, sectorSpan: 45 },
  { name: "Savitra",     direction: "SE", offering: "Batasha Gheeshakker", nakshatra: "Vishakha",        sectorStart:  90, sectorSpan: 45 },
  { name: "Indra",       direction: "SW", offering: "Pilli Sarso",         nakshatra: "-",               sectorStart: 135, sectorSpan: 45 },
  { name: "Jaya",        direction: "SW", offering: "Kali Sarso",          nakshatra: "-",               sectorStart: 180, sectorSpan: 45 },
  { name: "Rudra",       direction: "NW", offering: "Onion",               nakshatra: "Ardra",           sectorStart: 225, sectorSpan: 45 },
  { name: "Rajyakshma",  direction: "NW", offering: "Supari (Sabut)",      nakshatra: "Dhanishta",       sectorStart: 270, sectorSpan: 45 },
  { name: "Aapaavastha", direction: "NE", offering: "Nariyal",             nakshatra: "-",               sectorStart: 315, sectorSpan: 45 },
];

// 32 perimeter Devtas — each 11.25°, starting from 0° (North), clockwise
// Order matches the Vastu Purusha Mandala (Paramasaayika) — N→NE→E→SE→S→SW→W→NW
const RAW_32 = [
  ["Shikhi",     "N",  "Ghee ka Diya",              "Pushya"],
  ["Prajanya",   "N",  "Makhana",                   "Pushya"],
  ["Jayant",     "N",  "Chandan",                   "Pushya"],
  ["Mahender",   "N",  "Panchamrit",                "Pushya"],
  ["Surya",      "NE", "Gud",                       "Hast"],
  ["Satya",      "NE", "Wheat Ghee mixed",          "Uttarashad"],
  ["Bhrisha",    "NE", "Fish oil / Badam oil",      "Bharani"],
  ["Antriksh",   "NE", "Clove",                     "Kritika"],
  ["Anil",       "E",  "Lal Chandan",               "Kritika"],
  ["Pusha",      "E",  "Kheel",                     "Revati"],
  ["Vitasta",    "E",  "Chane",                     "-"],
  ["Grispatya",  "E",  "Wheat and honey mix",       "-"],
  ["Yama",       "SE", "Paneer",                    "-"],
  ["Gandharav",  "SE", "Any beautiful designed food","-"],
  ["Bhrigraj",   "SE", "Alcohol",                   "Jyestha"],
  ["Mrighah",    "SE", "Jaun",                      "Chitra"],
  ["Pitr",       "S",  "Almonds",                   "Magha"],
  ["Dauwarik",   "S",  "Pani ka kalash / Keel",     "Moola"],
  ["Sugreev",    "S",  "5 types grains",            "-"],
  ["Pushpdant",  "S",  "Jawar",                     "-"],
  ["Varun",      "SW", "Water",                     "Shatabhisha"],
  ["Asur",       "SW", "Curd",                      "Poorva Bhadrapada"],
  ["Shosha",     "SW", "Paan / Supari",             "Shravana"],
  ["Papyakshma", "SW", "Onion",                     "-"],
  ["Rog",        "W",  "Khopra / Sukha Nariyal",    "Swati"],
  ["Ahir",       "W",  "Fresh fruits",              "Astesha"],
  ["Mukhya",     "W",  "Mango / Wheat / Brinjal",   "-"],
  ["Bhallat",    "W",  "Moong Daal",                "Uttra Bhadrapada"],
  ["Soma",       "NW", "Makhana / Butter",          "Mrigashira"],
  ["Bhujang",    "NW", "Tulsi Patta",               "-"],
  ["Aditi",      "NW", "Puri and Kheer / Dhai",     "Punarvasu"],
  ["Diti",       "NW", "Tamsik food / Basi Khana",  "Pushya"],
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
  { code: "N",  label: "North",     bearing:   0 },
  { code: "NE", label: "North-East",bearing:  45 },
  { code: "E",  label: "East",      bearing:  90 },
  { code: "SE", label: "South-East",bearing: 135 },
  { code: "S",  label: "South",     bearing: 180 },
  { code: "SW", label: "South-West",bearing: 225 },
  { code: "W",  label: "West",      bearing: 270 },
  { code: "NW", label: "North-West",bearing: 315 },
];