export interface Category {
  id: string;
  title: string;
  emoji: string;
  aliases: string[];
}

/**
 * The category taxonomy. Aliases power the "soft" category score:
 * a report of "car keys" and a report of "bunch of keys" share the
 * "keys" category even when the free text differs.
 */
export const CATEGORIES: Category[] = [
  { id: "keys", title: "Keys", emoji: "🔑", aliases: ["keychain", "fob", "car keys", "house keys"] },
  { id: "phone", title: "Phone", emoji: "📱", aliases: ["smartphone", "mobile", "cellphone", "handset"] },
  { id: "wallet", title: "Wallet & Cards", emoji: "👛", aliases: ["purse", "cards", "id card", "debit card"] },
  { id: "bag", title: "Bag", emoji: "🎒", aliases: ["backpack", "handbag", "tote", "rucksack", "sling"] },
  { id: "clothing", title: "Clothing", emoji: "🧥", aliases: ["jacket", "hoodie", "sweater", "scarf", "cap"] },
  { id: "glasses", title: "Glasses", emoji: "👓", aliases: ["spectacles", "sunglasses", "eyewear"] },
  { id: "jewelry", title: "Jewelry", emoji: "💍", aliases: ["ring", "necklace", "bracelet", "earring", "chain"] },
  { id: "electronics", title: "Electronics", emoji: "🎧", aliases: ["earbuds", "headphones", "charger", "laptop", "tablet"] },
  { id: "documents", title: "Documents", emoji: "📄", aliases: ["passport", "papers", "folder", "notebook"] },
  { id: "pet", title: "Pet", emoji: "🐕", aliases: ["dog", "cat", "puppy", "kitten"] },
  { id: "sports", title: "Sports gear", emoji: "🏸", aliases: ["racket", "helmet", "ball", "gym bag"] },
  { id: "other", title: "Something else", emoji: "❓", aliases: [] },
];

export function getCategory(id: string): Category {
  const cleanId = id.replace(/^category-/, "");
  return CATEGORIES.find((c) => c.id === cleanId) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Does this free text mention a category alias not covered by the chosen category id? */
export function aliasHits(text: string): Category[] {
  const t = text.toLowerCase();
  return CATEGORIES.filter((c) => c.aliases.some((a) => t.includes(a.toLowerCase())));
}
