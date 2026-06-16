import { type SVGProps } from "react";
import { SITE_NAME, SITE_SUBHEADLINE } from "@/lib/site-config";

type LogoVariant = "mark" | "lockup" | "footer";

type LogoProps = {
  variant?: LogoVariant;
  className?: string;
  monochrome?: boolean;
};

export function TallyMark({
  monochrome = false,
  ...rest
}: { monochrome?: boolean } & SVGProps<SVGSVGElement>) {
  const verticalStroke = monochrome
    ? "currentColor"
    : "rgb(var(--logo-stroke-vertical))";
  const diagonalStroke = monochrome
    ? "currentColor"
    : "rgb(var(--logo-stroke-diagonal))";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 32"
      role="img"
      {...rest}
    >
      <g
        stroke={verticalStroke}
        strokeWidth={3}
        strokeLinecap="square"
        fill="none"
      >
        <line x1="6" y1="4" x2="6" y2="28" />
        <line x1="13" y1="4" x2="13" y2="28" />
        <line x1="20" y1="4" x2="20" y2="28" />
        <line x1="27" y1="4" x2="27" y2="28" />
      </g>
      <line
        x1="3"
        y1="29"
        x2="33"
        y2="3"
        stroke={diagonalStroke}
        strokeWidth={3.25}
        strokeLinecap="square"
      />
    </svg>
  );
}

export function Logo({
  variant = "lockup",
  className = "",
  monochrome = false,
}: LogoProps) {
  if (variant === "mark") {
    return (
      <TallyMark
        monochrome={monochrome}
        className={className || "h-8 w-10"}
        aria-label={SITE_NAME}
      />
    );
  }

  if (variant === "footer") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <TallyMark
          monochrome={monochrome}
          className="h-7 w-[35px] shrink-0"
          aria-hidden="true"
        />
        <span className="flex flex-col leading-tight">
          <span className="font-display text-lg tracking-tight">
            {SITE_NAME}
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500 mt-0.5">
            {SITE_SUBHEADLINE}
          </span>
        </span>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <TallyMark
        monochrome={monochrome}
        className="h-5 w-[25px] sm:h-6 sm:w-[30px] shrink-0"
        aria-hidden="true"
      />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-base sm:text-xl tracking-tight">
          {SITE_NAME}
        </span>
        <span className="hidden sm:block text-[9px] uppercase tracking-[0.16em] text-stone-500 mt-0.5">
          {SITE_SUBHEADLINE}
        </span>
      </span>
    </span>
  );
}
