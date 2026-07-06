// Extracts amzn1.assetlibrary.asset1.XXXXX from a pasted Amazon creative-asset URL,
// or returns the input unchanged if it's already a bare asset ID.
export function extractAssetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/amzn1\.assetlibrary\.asset1\.[a-f0-9]+/i);
  return match ? match[0] : trimmed;
}
