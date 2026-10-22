// One link, used for the hero CTA and each card's single link. Every link opens in the same tab
// (Dustin's navigation preference, 22 Oct 2026). Links to other Moose sites keep the decorative ↗ arrow
// so sighted users can see they lead to another site; the arrow is aria-hidden.
import { ARROW_EXTERNAL, ARROW_INTERNAL } from "../app/home-content";

export function HomeLink({
  href,
  external,
  className,
  children,
}: {
  href: string;
  external: boolean;
  className: string;
  children: string;
}) {
  return (
    <a href={href} className={className}>
      {children}
      <span aria-hidden="true">{external ? ARROW_EXTERNAL : ARROW_INTERNAL}</span>
    </a>
  );
}
