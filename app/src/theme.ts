import { createTheme } from "@mui/material/styles";

type ThemeMode = "light" | "dark";

export function createAppTheme(mode: ThemeMode = "light") {
  const paletteByMode =
    mode === "dark"
      ? {
          primary: { main: "#f59e0b", contrastText: "#17100b" },
          secondary: { main: "#33241b", contrastText: "#f6dfc8" },
          background: { default: "#120f0c", paper: "#1f1a16" },
          text: { primary: "#f8efe7", secondary: "#d8c0aa" },
          divider: "#4d3a2d",
          error: { main: "#f87171" },
        }
      : {
          primary: { main: "#b45309", contrastText: "#fffaf3" },
          secondary: { main: "#f1dfc9", contrastText: "#271812" },
          background: { default: "#f8f1e7", paper: "#ffffff" },
          text: { primary: "#1f1712", secondary: "#6d5140" },
          divider: "#dec9ae",
          error: { main: "#dc2626" },
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
            boxShadow: "0 18px 42px color-mix(in srgb, var(--foreground) 12%, transparent)",
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
              boxShadow: "0 10px 24px color-mix(in srgb, var(--sidebar-primary) 24%, transparent)",
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
            color: "var(--foreground)",
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiInputBase-input": {
              color: "var(--foreground)",
            },
            "& .MuiInputLabel-root": {
              color: "var(--muted-foreground)",
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "var(--primary)",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--input)",
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            color: "var(--foreground)",
            borderColor: "var(--border)",
          },
          head: {
            color: "var(--foreground)",
            fontWeight: 800,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            overflow: "visible",
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            overflow: "visible",
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


