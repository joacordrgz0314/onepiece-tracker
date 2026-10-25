// Constantes y utilidades de dominio para One Piece TCG

export const COLORS = [
  { id: "Red", label: "Rojo", hex: "#e03a3e" },
  { id: "Green", label: "Verde", hex: "#2fa56a" },
  { id: "Blue", label: "Azul", hex: "#2f7fd8" },
  { id: "Purple", label: "Morado", hex: "#8a4fd1" },
  { id: "Black", label: "Negro", hex: "#4a4f5a" },
  { id: "Yellow", label: "Amarillo", hex: "#e0b020" },
  { id: "Multi", label: "Multicolor", hex: "#d1658a" },
  { id: "Black2", label: "Negro", hex: "#000" },
];

export const RARITIES = [
  "C",
  "UC",
  "R",
  "SR",
  "SEC",
  "L",
  "SP",
  "TR",
  "P",
  "DON",
];

export const TYPES = ["Character", "Event", "Stage", "Leader", "DON!!"];

export const VARIANTS = [
  "Normal",
  "Parallel",
  "Alt Art",
  "Manga",
  "Promo",
  "Foil",
];

export const CONDITIONS = ["M", "NM", "LP", "MP", "HP", "DMG"];

export const STATUS = [
  { id: "owned", label: "En colección" },
  { id: "wishlist", label: "Lista de deseos" },
];

export const colorHex = (id) =>
  COLORS.find((c) => c.id === id)?.hex ?? "#6b7280";
export const colorLabel = (id) => COLORS.find((c) => c.id === id)?.label ?? id;

export const newId = () =>
  crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const emptyCard = () => ({
  id: newId(),
  code: "",
  name: "",
  set: "",
  rarity: "C",
  color: "Red",
  type: "Character",
  variant: "Normal",
  condition: "NM",
  qty: 1,
  status: "owned",
  buyPrice: "",
  price: "",
  image: "",
  notes: "",
  history: [],
  addedAt: todayISO(),
});

// "OP01-001" -> "OP01"
export const setFromCode = (code) => {
  const m = /^([A-Z]{1,3}\d{1,2})-/i.exec(code.trim());
  return m ? m[1].toUpperCase() : "";
};

export const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
