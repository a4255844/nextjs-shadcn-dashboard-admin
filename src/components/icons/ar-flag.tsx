import { useId } from "react";
import { cn } from "cn";

interface ArFlagProps {
  size?: number | string;
  className?: string;
}

/** Round flag of the United Arab Emirates (representing the Arabic locale). */
function ArFlag({ size = 14, className }: ArFlagProps) {
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
        <rect width="20" height="20" fill="#00732F" />
        <rect y="6.67" width="20" height="6.67" fill="#fff" />
        <rect y="13.34" width="20" height="6.66" fill="#000" />
        <rect width="5" height="20" fill="#FF0000" />
      </g>
    </svg>
  );
}

export { ArFlag };
