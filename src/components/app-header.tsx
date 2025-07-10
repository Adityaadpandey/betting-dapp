"use client";

import { WalletButton } from "@/components/solana/solana-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { Circle, Dice6, Globe, Home, Settings, TrendingUp, Trophy, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCluster } from "./cluster/cluster-data-access";
import { ClusterUiSelect } from "./cluster/cluster-ui";
import { Button } from "./ui/button";

export function useGetBalance({ address }: { address: PublicKey }) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["get-balance", { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getBalance(address),
  });
}

// Enhanced icon mapping for routes
const getRouteIcon = (path: string, label: string) => {
  const lowerLabel = label.toLowerCase();
  if (path === "/" || lowerLabel.includes("home")) return <Home className="size-4" />;
  if (lowerLabel.includes("bet") || lowerLabel.includes("game")) return <Dice6 className="size-4" />;
  if (lowerLabel.includes("market") || lowerLabel.includes("trade")) return <TrendingUp className="size-4" />;
  if (lowerLabel.includes("leaderboard") || lowerLabel.includes("winner")) return <Trophy className="size-4" />;
  if (lowerLabel.includes("setting")) return <Settings className="size-4" />;
  return <Circle className="size-4" />;
};

export function AppSidebar({ links = [] }: { links: { label: string; path: string }[] }) {
  const { publicKey } = useWallet();
  const { data: balanceData } = useGetBalance({
    address: publicKey || new PublicKey("11111111111111111111111111111111"),
  }); // Fetch balance using publicKey

  // Ensure publicKey is defined before using it

  const pathname = usePathname();
  const { cluster } = useCluster();
  const { connection } = useConnection();

  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

  return (
    <Sidebar className="border-r border-border/50 bg-gradient-to-b from-background/95 to-muted/30 backdrop-blur-sm">
      {/* Enhanced Header */}
      <SidebarHeader className="p-6 border-b border-border/30">
        <Link href="/" className="group flex items-center gap-4 hover:opacity-90 transition-all duration-300">
          <div className="relative">
            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <Dice6 className="size-6" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              BettingDApp
            </h2>
            <p className="text-sm text-muted-foreground font-medium">Premium Platform</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-4 py-2">
        {/* Enhanced Navigation */}
        {links.length > 0 && (
          <SidebarGroup className="py-4">
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-3 px-2">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {links.map(({ label, path }) => (
                  <SidebarMenuItem key={path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(path)}
                      className={`
                        w-full justify-start rounded-lg px-3 py-2.5 transition-all duration-200 group
                        ${
                          isActive(path)
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-4 border-primary shadow-sm"
                            : "hover:bg-muted/50 hover:text-foreground hover:shadow-sm hover:translate-x-1"
                        }
                      `}
                    >
                      <Link href={path} className="flex items-center gap-3 w-full">
                        <div
                          className={`
                          flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200
                          ${
                            isActive(path)
                              ? "bg-primary/20 text-primary"
                              : "text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                          }
                        `}
                        >
                          {getRouteIcon(path, label)}
                        </div>
                        <span className="truncate font-medium">{label}</span>
                        {isActive(path) && (
                          <div className="ml-auto">
                            <Zap className="size-3 text-primary" />
                          </div>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* <Separator className="my-6 bg-border/50" /> */}

        {/* Enhanced Network Status */}
        {/* <SidebarGroup className="py-4">
          <SidebarGroupContent>
            <Card className="p-4 bg-gradient-to-br from-muted/30 to-muted/50 border-border/50 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">Connected</span>
                </div>
                <Badge variant="outline" className="text-xs font-medium bg-primary/10 text-primary border-primary/30">
                  {cluster.name}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="size-3" />
                  <span className="truncate font-mono">{connection.rpcEndpoint}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="size-3" />
                  <span>Low Latency</span>
                </div>
              </div>
            </Card>
          </SidebarGroupContent>
        </SidebarGroup> */}
      </SidebarContent>

      {/* Enhanced Footer */}
      <SidebarFooter className="p-6 border-t border-border/30 bg-gradient-to-b from-transparent to-muted/20 mb-10">
        <SidebarGroup>
          <SidebarGroupContent className="space-y-4">
            {/* Enhanced Wallet Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-muted/30 to-muted/50 border border-border/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/20 text-primary">
                  <Wallet className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <WalletButton className="w-full justify-start text-sm font-medium bg-transparent border-none shadow-none hover:bg-primary/10 hover:text-primary transition-all duration-200" />
                </div>
              </div>
            </div>

            {/* Enhanced Controls - Balanced Layout */}
            <div className="space-y-3">
              {/* Network Control */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-muted/30 to-muted/50 border border-border/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-500/20 text-blue-500">
                  <Globe className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <ClusterUiSelect />
                </div>
              </div>
              {/* Balance Display */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-muted/30 to-muted/50 border border-border/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-500/20 text-green-500">
                  <Zap className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <Button variant="outline" className="text-[0.875rem] font-medium w-full">
                      {publicKey ? (balanceData ? (balanceData / 1e9).toFixed(4) : "0.0000") : "0.0000"} SOL
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Elegant Separator */}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
