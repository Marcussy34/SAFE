import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { SolanaWalletProvider } from "@/components/wallet/SolanaWalletProvider";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "SAFE - Spend Authorization Firewall for Agents",
  description: "Payment firewall for x402 agents built first on Solana allowances.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  // Dark mode only: force the `dark` class so `.dark` CSS variables always apply.
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <body>
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  );
}
