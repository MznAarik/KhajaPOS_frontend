"use client";

import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createAppTheme } from "../../app/src/theme";

export default function RootThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = React.useMemo(() => createAppTheme("light"), []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
