"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CirclePlusIcon, MailIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { ListToolDialog } from "./list-tool-dialog";
import { api } from "@/convex/_generated/api";

type NavItem = {
  title: string;
  url: string;
  icon?: React.ReactNode;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
};

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.getMe, {});
  const isAdmin = me?.role === "admin";

  const visibleItems = items.filter((item) => {
    if (item.requiresAdmin) return isAdmin;
    if (item.requiresAuth) return isAuthenticated;
    return true;
  });

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {isAuthenticated && (
            <SidebarMenuItem className="flex items-center gap-2">
              <ListToolDialog>
                <SidebarMenuButton
                  tooltip="List a tool"
                  className="min-w-8 bg-primary font-medium text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                >
                  <CirclePlusIcon />
                  <span>List a tool</span>
                </SidebarMenuButton>
              </ListToolDialog>
            </SidebarMenuItem>
          )}
        </SidebarMenu>

        <SidebarMenu>
          {visibleItems.map((item) => {
            const url = item.url.replace(/\/$/, "") || "/";
            const current = pathname.replace(/\/$/, "") || "/";
            const isActive =
              current === url ||
              (url !== "/dashboard" && current.startsWith(url + "/"));

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  isActive={isActive}
                  render={<Link href={item.url} />}
                  tooltip={item.title}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
