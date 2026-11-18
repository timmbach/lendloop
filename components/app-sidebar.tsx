"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import {
  LayoutDashboardIcon,
  ListCheck,
  SquareArrowUpRightExit,
  InboxIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";
import Image from "next/image";

export const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      requiresAuth: false,
    },
    {
      title: "My Listings",
      url: "/my-listings",
      icon: <ListCheck />,
      requiresAuth: true,
    },
    {
      title: "My requests",
      url: "/my-requests",
      icon: <SquareArrowUpRightExit />,
      requiresAuth: true,
    },
    {
      title: "Incoming requests",
      url: "/incoming-requests",
      icon: <InboxIcon />,
      requiresAuth: true,
    },
  ],
};
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="#" />}
            >
              {/* <CommandIcon className="size-5!" /> */}
              <Image
                src="/lendloop_brand.png"
                alt="lendloop logo"
                height={20}
                width={100}
              />
              {/* <span className="text-base font-semibold">LendLoop</span> */}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        {/* <NavUser user={data.user} /> */}
        <Authenticated>
          <UserButton showName />

          {/* <Content /> */}
        </Authenticated>
        <Unauthenticated>
          <SignInButton mode="modal">
            <Button variant="outline" size="lg">
              <Link href="#">Sign in to lend or borrow</Link>
            </Button>
          </SignInButton>
          {/* <SignUpButton mode="modal">
            <Button variant="outline" size="sm">
              <Link href="#">Sign up to lend or borrow</Link>
            </Button>
          </SignUpButton> */}
        </Unauthenticated>
      </SidebarFooter>
    </Sidebar>
  );
}
