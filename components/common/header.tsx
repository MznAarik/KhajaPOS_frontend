'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export const Header = () => {
    return (
        <Box className="sticky top-0 z-50 border-b border-border/80 bg-card/95 px-6 py-4 text-foreground shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <Box className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
                <Box className="flex items-center gap-3">
                    <Box className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                        KP
                    </Box>
                    <Box>
                        <Typography className="text-lg font-semibold tracking-[0.18em] text-primary uppercase">
                            KhajaPOS
                        </Typography>
                        <Typography className="text-sm text-muted-foreground">
                            Restaurant management system
                        </Typography>
                    </Box>
                </Box>
                <Typography className="hidden text-sm font-medium text-muted-foreground md:block">
                    Fast billing, orders, and daily operations
                </Typography>
            </Box>
        </Box>
    )
}
