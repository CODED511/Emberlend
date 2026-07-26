import { TokenMeta } from "@/lib/tokens";

/** Round coin badge — a glyph on a tinted disc, per token. */
export function TokenIcon({
  token,
  size = 36,
}: {
  token: TokenMeta;
  size?: number;
}) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full ring-1 ${token.tint}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      {token.glyph}
    </span>
  );
}
