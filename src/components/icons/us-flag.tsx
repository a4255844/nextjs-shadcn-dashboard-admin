import { useId } from "react";
import { cn } from "cn";

interface UsFlagProps {
  size?: number | string;
  className?: string;
}

/** Round flag of the United States. */
function UsFlag({ size = 14, className }: UsFlagProps) {
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
        <rect width="20" height="20" fill="#fff" />
        <rect width="20" height="2.86" fill="#B22234" />
        <rect y="5.72" width="20" height="2.86" fill="#B22234" />
        <rect y="11.43" width="20" height="2.86" fill="#B22234" />
        <rect y="17.14" width="20" height="2.86" fill="#B22234" />
        <rect width="9" height="10" fill="#3C3B6E" />
      </g>
    </svg>
  );
}

export { UsFlag };
