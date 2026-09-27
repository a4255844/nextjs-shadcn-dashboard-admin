import { useId } from "react";
import { cn } from "cn";

interface CnFlagProps {
  size?: number | string;
  className?: string;
}

/** Round flag of China. */
function CnFlag({ size = 14, className }: CnFlagProps) {
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
        <rect width="20" height="20" fill="#DE2910" />
        <polygon
          points="0,-3 0.71,-0.97 2.85,-0.93 1.14,0.37 1.76,2.43 0,1.2 -1.76,2.43 -1.14,0.37 -2.85,-0.93 -0.71,-0.97"
          fill="#FFDE00"
          transform="translate(7,8)"
        />
      </g>
    </svg>
  );
}

export { CnFlag };
