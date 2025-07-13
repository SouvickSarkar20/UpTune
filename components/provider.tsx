import React, { ReactNode } from "react";
import { SocketContextProvider } from "@/context/socket-context";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from "next-themes";

// interface ThemeProviderProps {
//   children: ReactNode;
//   attribute?: string;
//   defaultTheme?: string;
//   enableSystem?: boolean;
//   disableTransitionOnChange?: boolean;
//   // add more props from next-themes docs if you use them
// }

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ConnectionProvider endpoint={"https://api.devnet.solana.com"}>
            <WalletProvider wallets={[]} autoConnect>
                <WalletModalProvider>
                    <SessionProvider>
                        <SocketContextProvider>
                            {children}
                        </SocketContextProvider>
                    </SessionProvider>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}