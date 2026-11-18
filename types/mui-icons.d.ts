declare module "@mui/icons-material/*" {
  const Icon: import("react").ComponentType<import("@mui/material/SvgIcon").SvgIconProps>;
  export default Icon;
}

declare module "@mui/icons-material" {
  import type { ComponentType } from "react";
  import type { SvgIconProps } from "@mui/material/SvgIcon";

  type Icon = ComponentType<SvgIconProps>;

  export const Visibility: Icon;
  export const VisibilityOff: Icon;
  export const StorefrontRounded: Icon;
  export const CloudUploadRounded: Icon;
  const _default: Record<string, Icon>;
  export default _default;
  export = _default;
}
