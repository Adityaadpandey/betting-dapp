"use client";

import { AppSidebar } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { ThemeProvider } from "./theme-provider";
import { SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import { Toaster } from "./ui/sonner";

export function AppLayout({
  children,
  links,
}: {
  children: React.ReactNode;
  links: { label: string; path: string }[];
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="flex flex-col min-h-screen">
        <SidebarProvider>
          <AppSidebar links={links} />
          <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted/10">
            <header className="flex h-16 shrink-0 items-center gap-4 px-6 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger className="hover:bg-primary/10 hover:text-primary transition-colors duration-200" />
              <Separator orientation="vertical" className="h-6" />
              <div className="flex flex-1 items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    BettingDApp
                  </h1>
                  <Badge variant="secondary" className="text-xs">
                    Beta
                  </Badge>
                </div>
              </div>
            </header>
            <div className="flex-1 p-6 overflow-auto">
              <div className="max-w-7xl mx-auto">{children}</div>
            </div>
          </main>
        </SidebarProvider>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
