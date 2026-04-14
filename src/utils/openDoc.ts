/**
 * Opens a document or image URL safely in a new browser tab.
 *
 * Chrome blocks navigation to bare data: URLs ("Not allowed to navigate top frame to data URL").
 * The fix: convert the base64 data URL → Blob → blob:// URL, which Chrome fully allows.
 * For normal http(s) URLs, just open directly.
 */
export const openDoc = (url: string): void => {
  if (!url) return;

  if (url.startsWith('data:')) {
    try {
      // Extract mime type and raw base64 string
      const commaIdx = url.indexOf(',');
      const header = url.substring(0, commaIdx);         // e.g. "data:image/jpeg;base64"
      const base64 = url.substring(commaIdx + 1);        // the actual base64 data

      const mimeMatch = header.match(/data:([^;]+)/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

      // Decode base64 → Uint8Array
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Create a Blob and a temporary blob:// URL
      const blob = new Blob([bytes], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const newTab = window.open(blobUrl, '_blank');

      // Revoke after 30 s — enough time for the tab to load the content
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);

      if (!newTab) {
        // Popup was blocked — fall back to same-tab navigation
        URL.revokeObjectURL(blobUrl);
        window.location.href = blobUrl;
      }
    } catch (err) {
      console.error('[openDoc] Failed to open data URL as Blob:', err);
    }
  } else {
    // Normal http / https URL — open directly
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
