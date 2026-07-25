import Link from "next/link";
import { ConnectButtons } from "./ConnectButtons";

export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ember-btn text-lg shadow-ember-sm">
            🔥
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            Ember<span className="text-primary">lend</span>
          </span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-text-muted sm:flex">
          <Link href="/dashboard" className="hover:text-text">
            Borrow
          </Link>
          <Link href="/dashboard" className="hover:text-text">
            Lend
          </Link>
          <Link href="/dashboard" className="hover:text-text">
            Treasury
          </Link>
        </div>
        <ConnectButtons />
      </nav>
    </header>
  );
}
