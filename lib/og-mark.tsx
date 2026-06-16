// Mirrors app/icon.svg / components/logo.tsx geometry exactly.
// next/og's JSX subset can render <svg> but not arbitrary React components,
// so we duplicate the geometry rather than importing TallyMark.
export function OgTallyMark({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <svg width={width} height={height} viewBox="0 0 40 32">
      <line x1="6" y1="4" x2="6" y2="28" stroke="#1a1a2e" strokeWidth={3} strokeLinecap="square" />
      <line x1="13" y1="4" x2="13" y2="28" stroke="#1a1a2e" strokeWidth={3} strokeLinecap="square" />
      <line x1="20" y1="4" x2="20" y2="28" stroke="#1a1a2e" strokeWidth={3} strokeLinecap="square" />
      <line x1="27" y1="4" x2="27" y2="28" stroke="#1a1a2e" strokeWidth={3} strokeLinecap="square" />
      <line x1="3" y1="29" x2="33" y2="3" stroke="#b45309" strokeWidth={3.25} strokeLinecap="square" />
    </svg>
  );
}
