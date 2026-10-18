import { createTheme } from "@mui/material/styles";

type ThemeMode = "light" | "dark";

export function createAppTheme(mode: ThemeMode = "light") {
  const paletteByMode =
    mode === "dark"
      ? {
          primary: { main: "#e08061", contrastText: "#2a1008" },
          secondary: { main: "#203028", contrastText: "#d6e8dd" },
          background: { default: "#080f0b", paper: "#15211b" },
          text: { primary: "#f3e2d6", secondary: "#dac5b5" },
          divider: "#3d4f43",
          error: { main: "#ff7a66" },
          warning: { main: "#f0b429" },
        }
      : {
          primary: { main: "#b45309", contrastText: "#fff8ef" },
          secondary: { main: "#f7e7d2", contrastText: "#2b1c10" },
          background: { default: "#faf6f0", paper: "#ffffff" },
          text: { primary: "#1b1714", secondary: "#6b6156" },
          divider: "#e6dccc",
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
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 800,
            letterSpacing: "0.01em",
          },
          contained: {
            boxShadow:
              "0 10px 24px color-mix(in srgb, var(--primary) 26%, transparent)",
            "&:hover": {
              boxShadow:
                "0 14px 32px color-mix(in srgb, var(--primary) 38%, transparent)",
              filter: "brightness(1.06)",
            },
          },
          outlined: {
            borderColor: "var(--border)",
            "&:hover": {
              borderColor: "var(--primary)",
              backgroundColor:
                "color-mix(in srgb, var(--primary) 10%, transparent)",
            },
          },
          text: {
            "&:hover": {
              backgroundColor:
                "color-mix(in srgb, var(--primary) 10%, transparent)",
            },
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


