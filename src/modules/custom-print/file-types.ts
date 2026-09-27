export const MODEL_EXTENSIONS = ["stl", "3mf", "obj", "step", "stp"] as const;
export const REFERENCE_PHOTO_EXTENSIONS = ["jpg", "jpeg", "png"] as const;

export function isModelExtension(extension: string): boolean {
  return MODEL_EXTENSIONS.includes(extension.toLowerCase() as (typeof MODEL_EXTENSIONS)[number]);
}

export function isReferencePhotoExtension(extension: string): boolean {
  return REFERENCE_PHOTO_EXTENSIONS.includes(
    extension.toLowerCase() as (typeof REFERENCE_PHOTO_EXTENSIONS)[number],
  );
}
