import { useId } from "react";
import { cn } from "cn";

interface EsFlagProps {
  size?: number | string;
  className?: string;
}

/** Round flag of Spain. */
function EsFlag({ size = 14, className }: EsFlagProps) {
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
        <rect width="20" height="20" fill="#AA151B" />
        <rect y="5" width="20" height="10" fill="#F1BF00" />
      </g>
    </svg>
  );
}

export { EsFlag };
