// Fetch Playfair Display TTF binaries for use in next/og ImageResponse.
// Pattern: ask Google Fonts CSS API for the @font-face block, then fetch the actual src URL.
// `cache: "force-cache"` lets the edge runtime memoize between renders.
async function fetchGoogleFont(family: string, weight: 400 | 700): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
  const css = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "force-cache",
  }).then((r) => r.text());
  const match = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error(`Could not locate ${family} ${weight} TTF in Google Fonts CSS`);
  return fetch(match[1], { cache: "force-cache" }).then((r) => r.arrayBuffer());
}

export async function loadPlayfair(): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }>
> {
  const [regular, bold] = await Promise.all([
    fetchGoogleFont("Playfair Display", 400),
    fetchGoogleFont("Playfair Display", 700),
  ]);
  return [
    { name: "Playfair Display", data: regular, weight: 400, style: "normal" },
    { name: "Playfair Display", data: bold, weight: 700, style: "normal" },
  ];
}
