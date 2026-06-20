import { DEMO_MINT_PLACEHOLDER } from "@/lib/constants";
import type { MerchantRegistryEntry } from "@/lib/types";

export const MERCHANTS: Record<string, MerchantRegistryEntry> = {
  "stats-api.demo": {
    merchantId: "m_stats_api",
    domain: "stats-api.demo",
    displayName: "World Cup Stats API",
    category: "match_data",
    recipientAddress: "2izHjzP6TMxrrTqqwktu2HJQzmqit2GKkkqD288MpTQC",
    recipientAta: "DXnzs7ZAKcty2ovRGfSRTUjGdHJKnaqWBQ4hsZ9U7Vc5",
    tokenMint: DEMO_MINT_PLACEHOLDER,
    maxExpectedPriceUsdc: 0.05,
    trustStatus: "trusted_demo"
  },
  "transit-api.demo": {
    merchantId: "m_transit_api",
    domain: "transit-api.demo",
    displayName: "Match Transit API",
    category: "transit",
    recipientAddress: "5bD5k7qXPrY97UKQ6V7CH6vBBd7cM5R4J7ApzVMf7BMr",
    recipientAta: "3bgifTfUfvJLLN8GMPEUhG6jwtrbKKiB77qBSPpFigZF",
    tokenMint: DEMO_MINT_PLACEHOLDER,
    maxExpectedPriceUsdc: 0.1,
    trustStatus: "trusted_demo"
  },
  "food-voucher.demo": {
    merchantId: "m_food_voucher",
    domain: "food-voucher.demo",
    displayName: "Food Voucher API",
    category: "food_voucher",
    recipientAddress: "6UHZ2FRif8e1KV9jMbNePrsb5XjZQVE2hfPkUunvy8MP",
    recipientAta: "EBkpxYB3uuigVQtCbs8UAq3iQdtNf9uUhXEcD2weSa7B",
    tokenMint: DEMO_MINT_PLACEHOLDER,
    maxExpectedPriceUsdc: 0.1,
    trustStatus: "trusted_demo"
  },
  "official-merch.demo": {
    merchantId: "m_official_merch",
    domain: "official-merch.demo",
    displayName: "Official Merch API",
    category: "merch",
    recipientAddress: "6UHZ2FRif8e1KV9jMbNePrsb5XjZQVE2hfPkUunvy8MP",
    recipientAta: "EBkpxYB3uuigVQtCbs8UAq3iQdtNf9uUhXEcD2weSa7B",
    tokenMint: DEMO_MINT_PLACEHOLDER,
    maxExpectedPriceUsdc: 0.08,
    trustStatus: "trusted_demo"
  },
  "fake-merch.demo": {
    merchantId: "m_fake_merch",
    domain: "fake-merch.demo",
    displayName: "Fake Merch API",
    category: "merch",
    recipientAddress: "659BYYHvto7sCDaPwNwfgRpn1a9LhDuwXzERWoEvrC6L",
    recipientAta: "56uzUNxhWNcUNYg3iQEGmGQJ3nPyY8cvg2f53mwEkfc8",
    tokenMint: DEMO_MINT_PLACEHOLDER,
    maxExpectedPriceUsdc: 0.01,
    trustStatus: "blocked"
  }
};
