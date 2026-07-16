export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB — matches the backend's Cloudinary upload limit

/** Mirrors the backend's constraints for any Cloudinary-backed photo upload
 *  (aadharPhoto/licensePhoto/vehiclePhoto/profilePhoto — images only, max
 *  5MB) so the driver finds out instantly instead of after a slow upload
 *  followed by a generic 400 from the server. */
export function validatePhoto(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file (JPG, PNG, etc.)";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return `That photo is ${(file.size / (1024 * 1024)).toFixed(1)}MB — please choose one under 5MB.`;
  }
  return null;
}
