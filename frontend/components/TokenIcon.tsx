import { TokenMeta } from "@/lib/tokens";

/**
 * Brand marks for the listed assets, inlined as SVG on a 32×32 grid — the
 * convention the standard crypto icon sets use, so the official paths drop in
 * without rescaling.
 *
 * Inline rather than remote images: the table paints with no network
 * round-trip and nothing breaks if a CDN is unreachable.
 */
type Icon = { bg: string; art: React.ReactNode };

const ICONS: Record<string, Icon> = {
  HBAR: {
    bg: "#000000",
    // Hedera's mark: an H with two crossbars, built from rects so the strokes
    // stay perfectly even at small sizes.
    art: (
      <g fill="#fff">
        <rect x="9.4" y="8" width="2.9" height="16" rx="0.2" />
        <rect x="19.7" y="8" width="2.9" height="16" rx="0.2" />
        <rect x="9.4" y="13.1" width="13.2" height="2.5" />
        <rect x="9.4" y="17.6" width="13.2" height="2.5" />
      </g>
    ),
  },
  USDC: {
    bg: "#2775CA",
    art: (
      <g fill="#fff">
        <path d="M20.4 18.533c0-2.333-1.4-3.133-4.2-3.466-2-.267-2.4-.8-2.4-1.734 0-.933.667-1.533 2-1.533 1.2 0 1.867.4 2.2 1.4a.5.5 0 00.467.333h1.066a.456.456 0 00.467-.466v-.067a3.333 3.333 0 00-3-2.733V8.667c0-.267-.2-.467-.533-.534h-1a.5.5 0 00-.534.534v1.533c-2 .267-3.266 1.6-3.266 3.267 0 2.2 1.333 3.066 4.133 3.4 1.867.333 2.467.733 2.467 1.8 0 1.066-.933 1.8-2.2 1.8-1.734 0-2.334-.734-2.534-1.734-.066-.266-.266-.4-.466-.4h-1.134a.456.456 0 00-.466.467v.067c.266 1.666 1.333 2.866 3.533 3.2v1.533c0 .267.2.467.533.533h1a.5.5 0 00.534-.533v-1.533c2-.334 3.333-1.734 3.333-3.534z" />
        <path d="M12.6 25.533c-5.2-1.866-7.867-7.666-5.933-12.8 1-2.8 3.2-4.933 5.933-5.933.267-.133.4-.333.4-.667v-.933c0-.267-.133-.467-.4-.533-.066 0-.2 0-.266.066a12.005 12.005 0 00-7.8 15.134c1.2 3.733 4.066 6.6 7.8 7.8.266.133.533 0 .6-.267.066-.066.066-.133.066-.267v-.933c0-.2-.2-.467-.4-.667zm7.066-20.8c-.266-.133-.533 0-.6.267-.066.066-.066.133-.066.267v.933c0 .267.2.533.4.733 5.2 1.867 7.866 7.667 5.933 12.8-1 2.8-3.2 4.934-5.933 5.934-.267.133-.4.333-.4.666v.934c0 .266.133.466.4.533.066 0 .2 0 .266-.067a12.005 12.005 0 007.8-15.133c-1.2-3.8-4.133-6.667-7.8-7.867z" />
      </g>
    ),
  },
  USDT: {
    bg: "#26A17B",
    art: (
      <path
        fill="#fff"
        d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"
      />
    ),
  },
  SAUCE: {
    bg: "#8259EF",
    // SaucerSwap's saucer: an ellipse with a dome, plus the beam beneath.
    art: (
      <g fill="#fff">
        <path d="M16 9.6c-2.5 0-4.5 1.7-4.9 3.9h9.8c-.4-2.2-2.4-3.9-4.9-3.9z" />
        <ellipse cx="16" cy="15.1" rx="9.4" ry="2.9" />
        <path
          opacity=".55"
          d="M11.6 19.1h1.9v2.6h-1.9zM15.05 19.9h1.9v3.4h-1.9zM18.5 19.1h1.9v2.6h-1.9z"
        />
      </g>
    ),
  },
  WBTC: {
    bg: "#F7931A",
    art: (
      <path
        fill="#fff"
        d="M23.189 10.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 2l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.056l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"
        // Canonical Bitcoin path is drawn off-centre in its own box; this
        // centres it on the 32x32 disc and sizes it to match the other marks.
        transform="translate(1.87 5.24) scale(0.9)"
      />
    ),
  },
  WETH: {
    bg: "#627EEA",
    art: (
      <g fill="#fff">
        <path fillOpacity=".6" d="M16.498 4v8.87l7.497 3.35z" />
        <path d="M16.498 4 9 16.22l7.498-3.35z" />
        <path fillOpacity=".6" d="M16.498 21.968v6.027L24 17.616z" />
        <path d="M16.498 27.995v-6.028L9 17.616z" />
        <path fillOpacity=".2" d="m16.498 20.573 7.497-4.353-7.497-3.348z" />
        <path fillOpacity=".6" d="M9 16.22l7.498 4.353v-7.701z" />
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

  // Unknown asset: neutral disc with the leading letter.
  if (!icon) {
    return (
      <span
        className="inline-grid shrink-0 place-items-center rounded-full bg-surface-raised font-bold text-text-muted ring-1 ring-border"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
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
      viewBox="0 0 32 32"
      className="shrink-0 rounded-full"
      role="img"
      aria-label={token.symbol}
    >
      <circle cx="16" cy="16" r="16" fill={icon.bg} />
      {icon.art}
    </svg>
  );
}
