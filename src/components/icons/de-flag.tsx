import { useId } from "react";
import { cn } from "cn";

interface DeFlagProps {
  size?: number | string;
  className?: string;
}

/** Round flag of Germany. */
function DeFlag({ size = 14, className }: DeFlagProps) {
  const id = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn("shrink-0 rounded-full", className)}
    >
      <defs>
        <clipPath id={id}>
          <circle cx="10" cy="10" r="10" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="20" height="20" fill="#DD0000" />
        <rect width="20" height="6.67" fill="#000" />
        <rect y="13.33" width="20" height="6.67" fill="#FFCE00" />
      </g>
    </svg>
  );
}

export { DeFlag };
