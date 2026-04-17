export type VehicleLegacyMirrorInput = {
  mileageKmInput?: string;
  doorsInput?: string;
  seatsInput?: string;
};

export type VehicleLegacyMirrorPatch = {
  surface?: string;
  bathrooms?: string;
  toilets?: string;
};

/**
 * UI-level compatibility bridge:
 * keep legacy draft fields mirrored from vehicle inputs without altering user-entered raw values.
 */
export function buildLegacyMirrorPatchFromVehicleInputs(
  input: VehicleLegacyMirrorInput,
): VehicleLegacyMirrorPatch {
  const patch: VehicleLegacyMirrorPatch = {};
  if (input.mileageKmInput != null) patch.surface = input.mileageKmInput;
  if (input.doorsInput != null) patch.bathrooms = input.doorsInput;
  if (input.seatsInput != null) patch.toilets = input.seatsInput;
  return patch;
}
