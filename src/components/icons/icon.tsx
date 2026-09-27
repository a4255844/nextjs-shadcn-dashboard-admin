import type { ComponentType } from "react";
import { UsFlag } from "./us-flag";
import { CnFlag } from "./cn-flag";
import { DeFlag } from "./de-flag";
import { EsFlag } from "./es-flag";
import { ArFlag } from "./ar-flag";

/** All registered icon names. Add a new entry when introducing an icon file. */
export type IconName =
  | "us-flag"
  | "cn-flag"
  | "de-flag"
  | "es-flag"
  | "ar-flag";

/** Contract every icon component must fulfill so <Icon /> can render it. */
interface IconComponentProps {
  size?: number | string;
  className?: string;
}

const REGISTRY: Record<IconName, ComponentType<IconComponentProps>> = {
  "us-flag": UsFlag,
  "cn-flag": CnFlag,
  "de-flag": DeFlag,
  "es-flag": EsFlag,
  "ar-flag": ArFlag,
};

interface IconProps {
  /** Registered icon name, e.g. "us-flag". */
  name: IconName;
  /** Icon size in px. Falls back to each icon's own default. */
  size?: number | string;
  className?: string;
}

/**
 * Public icon entry point.
 *
 * Usage: <Icon name="us-flag" size={16} />
 */
function Icon({ name, size, className }: IconProps) {
  const Component = REGISTRY[name];
  if (!Component) return null;
  return <Component size={size} className={className} />;
}

export { Icon, type IconProps };
