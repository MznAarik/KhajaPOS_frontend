import { createTheme } from "@mui/material/styles";

type ThemeMode = "light" | "dark";

export function createAppTheme(mode: ThemeMode = "light") {
  const paletteByMode =
    mode === "dark"
      ? {
          primary: { main: "#d8e6e1", contrastText: "#233234" },
          secondary: { main: "#384c4f", contrastText: "#eef4f2" },
          background: { default: "#3f5457", paper: "#496164" },
          text: { primary: "#eef4f2", secondary: "#c8d5d2" },
          divider: "#647b79",
          error: { main: "#d64545" },
        }
      : {
          primary: { main: "#50686b", contrastText: "#f6f8f7" },
          secondary: { main: "#dfe6e2", contrastText: "#223033" },
          background: { default: "#f5f4ef", paper: "#fcfbf7" },
          text: { primary: "#1f2a2b", secondary: "#667779" },
          divider: "#d7ddd8",
          error: { main: "#d64545" },
        };

  return createTheme({
    palette: {
      mode,
      ...paletteByMode,
    },
    typography: {
      fontFamily: `var(--font-poppins), "Poppins", "Helvetica", "Arial", sans-serif`,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: "color-mix(in srgb, var(--card) 82%, transparent)",
            color: "var(--foreground)",
            backgroundImage: "none",
            boxShadow: "0 18px 42px rgba(31, 42, 43, 0.14)",
            borderBottom: "1px solid var(--border)",
            backdropFilter: "blur(18px)",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: "var(--sidebar)",
            backgroundImage:
              "linear-gradient(180deg, color-mix(in srgb, var(--sidebar) 96%, white 4%), color-mix(in srgb, var(--sidebar-accent) 42%, var(--sidebar) 58%) 52%, color-mix(in srgb, var(--sidebar) 88%, black 12%))",
            color: "var(--sidebar-foreground)",
            borderColor: "var(--sidebar-border)",
            boxShadow: "none",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: "16px",
            color: "inherit",
            paddingBlock: "0.75rem",
            paddingInline: "1rem",
            transition: "all 200ms ease",
            "&:hover": {
              backgroundColor: "color-mix(in srgb, var(--sidebar-accent) 70%, transparent)",
              color: "var(--sidebar-accent-foreground)",
              boxShadow: "0 10px 24px rgba(80, 104, 107, 0.18)",
            },
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            color: "inherit",
          },
          secondary: {
            color: "var(--muted-foreground)",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: "inherit",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: "72px",
          },
        },
      },
    },
  });
}

const theme = createAppTheme();

export default theme;


