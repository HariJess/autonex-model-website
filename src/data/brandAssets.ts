export type BrandAsset = {
  id: string;
  label: string;
  logoPath?: string;
  aliases?: string[];
};

const normalizeBrandToken = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const buildAsset = (
  id: string,
  label: string,
  logoFileName?: string,
  aliases: string[] = [],
): BrandAsset => ({
  id,
  label,
  logoPath: logoFileName ? `/brands/${logoFileName}` : undefined,
  aliases,
});

export const BRAND_ASSETS: BrandAsset[] = [
  buildAsset("toyota", "Toyota", "toyota.svg"),
  buildAsset("nissan", "Nissan", "nissan.svg"),
  buildAsset("hyundai", "Hyundai", "hyundai.svg"),
  buildAsset("kia", "Kia", "kia.svg"),
  buildAsset("suzuki", "Suzuki", "suzuki.svg", ["suzuki moto"]),
  buildAsset("mitsubishi", "Mitsubishi", "mitsubishi.svg"),
  buildAsset("isuzu", "Isuzu", "isuzu.svg"),
  buildAsset("mazda", "Mazda", "mazda.svg"),
  buildAsset("ford", "Ford", "ford.svg"),
  buildAsset("renault", "Renault", "renault.svg"),
  buildAsset("peugeot", "Peugeot", "peugeot.svg"),
  buildAsset("volkswagen", "Volkswagen", "volkswagen.svg", ["vw"]),
  buildAsset("mercedes-benz", "Mercedes-Benz", "mercedes-benz.svg", ["mercedes", "mercedes benz"]),
  buildAsset("bmw", "BMW", "bmw.svg"),
  buildAsset("audi", "Audi", "audi.svg"),
  buildAsset("honda", "Honda", "honda.svg"),
  buildAsset("yamaha", "Yamaha"),
  buildAsset("byd", "BYD", "byd.svg"),
  buildAsset("chery", "Chery", "chery.svg"),
  buildAsset("citroen", "Citroën", "citroen.svg", ["citroen"]),
  buildAsset("chevrolet", "Chevrolet", "chevrolet.svg"),
  buildAsset("foton", "Foton", "foton.svg"),
  buildAsset("gmc", "GMC", "gmc.svg"),
  buildAsset("great-wall", "Great Wall", "great-wall.svg", ["gwm"]),
  buildAsset("haval", "Haval", "haval.svg"),
  buildAsset("infiniti", "Infiniti", "infiniti.svg"),
  buildAsset("jac-motors", "JAC Motors", "jac-motors.svg", ["jac"]),
  buildAsset("jeep", "Jeep", "jeep.svg"),
  buildAsset("land-rover", "Land Rover", "land-rover.svg", ["landrover"]),
  buildAsset("lexus", "Lexus", "lexus.svg"),
  buildAsset("mg-motor", "MG Motor", "mg-motor.svg", ["mg"]),
  buildAsset("mini", "MINI", "mini.svg"),
  buildAsset("porsche", "Porsche", "porsche.svg"),
  buildAsset("tank", "Tank", "tank.svg"),
  buildAsset("baic", "BAIC", "baic.svg"),
  buildAsset("cadillac", "Cadillac", "cadillac.svg"),
  buildAsset("changan", "Changan", "changan.svg"),
  buildAsset("avatr", "Avatr", "avatr.svg"),
  // Brands without a local SVG yet — listed so resolveBrandAsset returns a
  // BrandAsset (label) instead of null. ListingCard falls back to an
  // initial-letter chip for these until assets land.
  buildAsset("dacia", "Dacia"),
  buildAsset("fiat", "Fiat"),
  buildAsset("opel", "Opel"),
  buildAsset("seat", "Seat"),
  buildAsset("skoda", "Škoda", undefined, ["skoda"]),
  buildAsset("subaru", "Subaru"),
  buildAsset("tesla", "Tesla"),
  buildAsset("volvo", "Volvo"),
  buildAsset("jaguar", "Jaguar"),
  buildAsset("bugatti", "Bugatti"),
  buildAsset("ferrari", "Ferrari"),
  buildAsset("lamborghini", "Lamborghini"),
  buildAsset("maserati", "Maserati"),
  buildAsset("alfa-romeo", "Alfa Romeo", undefined, ["alfa romeo", "alfa"]),
  buildAsset("smart", "Smart"),
  buildAsset("cfmoto", "CFMoto", undefined, ["cf moto"]),
];

const brandAssetLookup = new Map<string, BrandAsset>();

for (const asset of BRAND_ASSETS) {
  brandAssetLookup.set(normalizeBrandToken(asset.id), asset);
  brandAssetLookup.set(normalizeBrandToken(asset.label), asset);
  for (const alias of asset.aliases ?? []) {
    brandAssetLookup.set(normalizeBrandToken(alias), asset);
  }
}

export function resolveBrandAsset(brandOrId: string | null | undefined): BrandAsset | null {
  if (!brandOrId) return null;
  const normalized = normalizeBrandToken(brandOrId);
  const direct = brandAssetLookup.get(normalized);
  if (direct) return direct;

  const tokens = normalized.split(" ").filter(Boolean);
  for (const token of tokens) {
    const single = brandAssetLookup.get(token);
    if (single) return single;
  }

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const pair = `${tokens[i]} ${tokens[i + 1]}`;
    const paired = brandAssetLookup.get(pair);
    if (paired) return paired;
  }

  return null;
}
