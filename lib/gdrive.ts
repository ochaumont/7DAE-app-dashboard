const FILE_ID_PATTERN = /\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/;

/** Extracts a Google Drive file ID from a share/view/preview URL, independent
 * of host (covers proxied domains like drive.google.com.rproxy.goskope.com)
 * and of trailing suffix (/view, /preview, ?usp=..., or none). */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  const match = FILE_ID_PATTERN.exec(pathname);
  return match ? match[1] : null;
}

export function buildGoogleDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/** Convenience: raw documentRef.url -> canonical embed URL, or null if the
 * URL isn't a recognizable Google Drive file link (caller should fall back
 * to a plain "Open video" link in that case). */
export function getGoogleDriveEmbedUrl(url: string): string | null {
  const fileId = extractGoogleDriveFileId(url);
  return fileId ? buildGoogleDriveEmbedUrl(fileId) : null;
}
