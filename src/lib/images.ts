/**
 * Builds an optimized Cloudinary URL with specified width, auto-format, and auto-quality.
 * Adds f_auto,q_auto,c_limit,w_{width} transforms.
 */
export function getCloudinaryVariant(url: string, width: number): string {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;

  const uploadToken = "/upload/";
  const idx = url.indexOf(uploadToken);
  const prefix = url.substring(0, idx + uploadToken.length);
  let rest = url.substring(idx + uploadToken.length);

  // Strip existing transformation segment if present
  rest = rest.replace(/^(?:[a-z]_[^/]+,)*[a-z]_[^/]+\//, "");

  return `${prefix}f_auto,q_auto,c_limit,w_${width}/${rest}`;
}

/**
 * Builds responsive srcset candidates for cards, tablets, and large galleries.
 */
export function buildCloudinarySrcSet(url: string, widths = [320, 480, 640, 1024, 1600]): string {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return "";

  return widths.map((w) => `${getCloudinaryVariant(url, w)} ${w}w`).join(", ");
}
