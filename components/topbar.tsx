"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/sidebar-content";
import { useState } from "react";

export function Topbar({
  username,
  role,
}: {
  username: string;
  role: "admin" | "user";
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent username={username} role={role} />
        </SheetContent>
      </Sheet>
      <span className="text-sm font-semibold text-foreground">
        LáLáGreen Automation Portal
      </span>
    </header>
  );
}
