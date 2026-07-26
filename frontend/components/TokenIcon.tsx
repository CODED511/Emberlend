import { TokenMeta } from "@/lib/tokens";

/**
 * Brand marks for the listed assets, inlined as SVG.
 *
 * Inline rather than remote images so the table paints with no network
 * round-trip and nothing breaks if a CDN is unreachable — the icons are
 * simple enough to redraw as paths.
 */
const ICONS: Record<string, { bg: string; svg: React.ReactNode }> = {
  HBAR: {
    bg: "#000000",
    svg: (
      <g fill="#fff">
        {/* Hedera "H" inside its circle */}
        <path d="M8.4 6.2h1.9v3.42h5.4V6.2h1.9v13.6h-1.9v-4.03h-5.4v4.03H8.4z" />
        <path d="M10.3 11.02h5.4v1.24h-5.4zM10.3 13.9h5.4v1.24h-5.4z" />
      </g>
    ),
  },
  USDC: {
    bg: "#2775CA",
    svg: (
      <g fill="#fff">
        <path d="M13 5.2c0-.35-.28-.62-.62-.62h-.76c-.34 0-.62.27-.62.62v.8c-1.7.24-2.9 1.3-2.9 2.85 0 1.85 1.32 2.55 3.2 3 1.44.35 1.9.72 1.9 1.43 0 .72-.63 1.2-1.62 1.2-1.2 0-1.85-.44-2.1-1.3a.72.72 0 0 0-.68-.5h-.6c-.42 0-.72.4-.62.8.32 1.32 1.36 2.2 2.82 2.44v.83c0 .35.28.62.62.62h.76c.34 0 .62-.27.62-.62v-.83c1.78-.27 3-1.4 3-3.04 0-1.9-1.32-2.6-3.3-3.06-1.36-.33-1.8-.7-1.8-1.36 0-.66.53-1.13 1.44-1.13.9 0 1.44.35 1.7 1.1.1.28.36.47.66.47h.56c.42 0 .72-.4.6-.8-.32-1.16-1.24-1.94-2.6-2.18z" />
        <path
          opacity=".85"
          d="M9.6 21.4a.9.9 0 0 1-.6 1.72A11.6 11.6 0 0 1 12 .4a11.6 11.6 0 0 1 3 22.72.9.9 0 0 1-.6-1.72 9.8 9.8 0 0 0 0-18.8.9.9 0 0 1 .6-1.7 9.8 9.8 0 0 0-5.4 20.5z"
        />
      </g>
    ),
  },
  USDT: {
    bg: "#26A17B",
    svg: (
      <path
        fill="#fff"
        d="M13.36 10.72v-1.9h4.36V5.9H6.3v2.92h4.36v1.9C7.1 10.9 4.44 11.6 4.44 12.45c0 .85 2.66 1.55 6.22 1.72v5.6h2.7v-5.6c3.55-.17 6.2-.87 6.2-1.72 0-.85-2.65-1.55-6.2-1.73zM12 13.6c-3.9 0-7.07-.6-7.07-1.35 0-.63 2.25-1.16 5.3-1.3v2.2c.55.03 1.15.05 1.77.05s1.2-.02 1.76-.05v-2.2c3.05.14 5.3.67 5.3 1.3 0 .74-3.16 1.35-7.06 1.35z"
      />
    ),
  },
  SAUCE: {
    bg: "#7B2FF7",
    svg: (
      <g fill="#fff">
        <path d="M12 4.6c-3.1 0-5.6 1.7-5.6 3.9 0 1.9 1.5 2.9 4 3.4l2 .4c1.5.3 2.1.7 2.1 1.4 0 .8-1 1.4-2.5 1.4-1.7 0-2.7-.6-2.9-1.6H6.5c.2 2.3 2.5 3.9 5.5 3.9 3.2 0 5.6-1.6 5.6-4 0-1.9-1.3-3-3.9-3.5l-2-.4c-1.5-.3-2.2-.7-2.2-1.4 0-.8.9-1.3 2.4-1.3 1.5 0 2.5.6 2.7 1.5h2.6c-.2-2.2-2.3-3.7-5.2-3.7z" />
        <circle cx="12" cy="19.4" r="1.2" />
      </g>
    ),
  },
  WBTC: {
    bg: "#F09242",
    svg: (
      <path
        fill="#fff"
        d="M15.7 10.5c.2-1.4-.86-2.15-2.3-2.65l.47-1.87-1.14-.29-.46 1.82-.9-.21.46-1.83-1.14-.28-.47 1.87-.72-.17v-.01l-1.57-.4-.3 1.22s.84.2.83.2c.46.12.55.42.53.67l-.53 2.13c.03 0 .07.02.12.04l-.12-.03-.75 3c-.06.14-.2.35-.52.27.01.02-.84-.2-.84-.2l-.57 1.3 1.48.38.81.2-.47 1.9 1.14.28.47-1.87.9.24-.46 1.86 1.14.28.47-1.9c1.95.38 3.4.23 4.02-1.53.5-1.42 0-2.24-1.03-2.77.75-.17 1.31-.66 1.46-1.68zm-2.6 3.66c-.35 1.42-2.75.65-3.53.46l.63-2.5c.78.19 3.28.57 2.9 2.04zm.36-3.68c-.32 1.29-2.32.63-2.97.47l.57-2.27c.65.16 2.74.46 2.4 1.8z"
      />
    ),
  },
  WETH: {
    bg: "#627EEA",
    svg: (
      <g fill="#fff">
        <path fillOpacity=".7" d="M12 3v6.65l5.62 2.51z" />
        <path d="M12 3 6.38 12.16 12 9.65z" />
        <path fillOpacity=".7" d="M12 16.48V21l5.63-7.79z" />
        <path d="M12 21v-4.52l-5.62-3.27z" />
        <path fillOpacity=".5" d="M12 15.43l5.62-3.27L12 9.65z" />
        <path fillOpacity=".8" d="M6.38 12.16 12 15.43V9.65z" />
      </g>
    ),
  },
};

export function TokenIcon({
  token,
  size = 36,
}: {
  token: TokenMeta;
  size?: number;
}) {
  const icon = ICONS[token.symbol];

  // Unknown asset: fall back to the first letter on a neutral disc.
  if (!icon) {
    return (
      <span
        className="inline-grid shrink-0 place-items-center rounded-full bg-surface-raised text-text-muted ring-1 ring-border"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
        aria-hidden
      >
        {token.symbol.slice(0, 1)}
      </span>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="shrink-0 rounded-full"
      role="img"
      aria-label={token.symbol}
    >
      <circle cx="12" cy="12" r="12" fill={icon.bg} />
      {icon.svg}
    </svg>
  );
}
