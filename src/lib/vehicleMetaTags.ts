const PREFIX = "__vn:";

export type VehicleMeta = {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  condition?: string | null;
  sellerType?: string | null;
};

function enc(v: string): string {
  return encodeURIComponent(v.trim());
}

function dec(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export function isVehicleMetaTag(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function buildVehicleMetaTags(meta: VehicleMeta): string[] {
  const tags: string[] = [];
  if (meta.make?.trim()) tags.push(`${PREFIX}make:${enc(meta.make)}`);
  if (meta.model?.trim()) tags.push(`${PREFIX}model:${enc(meta.model)}`);
  if (meta.year != null && meta.year > 1900) tags.push(`${PREFIX}year:${meta.year}`);
  if (meta.fuel?.trim()) tags.push(`${PREFIX}fuel:${enc(meta.fuel)}`);
  if (meta.transmission?.trim()) tags.push(`${PREFIX}transmission:${enc(meta.transmission)}`);
  if (meta.drivetrain?.trim()) tags.push(`${PREFIX}drivetrain:${enc(meta.drivetrain)}`);
  if (meta.condition?.trim()) tags.push(`${PREFIX}condition:${enc(meta.condition)}`);
  if (meta.sellerType?.trim()) tags.push(`${PREFIX}sellerType:${enc(meta.sellerType)}`);
  return tags;
}

export function parseVehicleMetaTags(values: string[]): VehicleMeta {
  const meta: VehicleMeta = {};
  for (const value of values) {
    if (!isVehicleMetaTag(value)) continue;
    const raw = value.slice(PREFIX.length);
    const [k, ...rest] = raw.split(":");
    const v = dec(rest.join(":"));
    if (!k || !v) continue;
    if (k === "make") meta.make = v;
    if (k === "model") meta.model = v;
    if (k === "fuel") meta.fuel = v;
    if (k === "transmission") meta.transmission = v;
    if (k === "drivetrain") meta.drivetrain = v;
    if (k === "condition") meta.condition = v;
    if (k === "sellerType") meta.sellerType = v;
    if (k === "year") {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 1900 && n <= 2100) meta.year = n;
    }
  }
  return meta;
}

export function stripVehicleMetaTags(values: string[]): string[] {
  return values.filter((v) => !isVehicleMetaTag(v));
}
