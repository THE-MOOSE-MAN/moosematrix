// One link, used for the hero CTA and each card's single link. Other Moose sites open in a new tab; the
// "(opens in new tab)" hint is visually hidden text inside the link, so the accessible name starts with
// the visible words (WCAG 2.5.3) and no aria-label is needed. The arrow is decorative.
import { ARROW_EXTERNAL, ARROW_INTERNAL, NEW_TAB_HINT } from "../app/home-content";

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
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {external ? <span className="mm-sr-only">{NEW_TAB_HINT}</span> : null}
      <span aria-hidden="true">{external ? ARROW_EXTERNAL : ARROW_INTERNAL}</span>
    </a>
  );
}
