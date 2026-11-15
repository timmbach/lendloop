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
  ChartBarIcon,
  FolderIcon,
  UsersIcon,
  CameraIcon,
  FileTextIcon,
  Settings2Icon,
  CircleHelpIcon,
  SearchIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
  CommandIcon,
  SquareArrowUpRightExit,
  InboxIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";
import Image from "next/image";

const data = {
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
    },
  ],
  navClouds: [],
  navSecondary: [],
  documents: [],
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
                src="/xcode_logo.png"
                alt="lendloop logo"
                height={20}
                width={20}
              />
              <span className="text-base font-semibold">LendLoop</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />

        {/* Views only available to signed-in users */}
        <Authenticated>
          <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/my-listings" />}>
                    <ListCheck />
                    <span>My Listings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/my-requests" />}>
                    <SquareArrowUpRightExit />
                    <span>My requests</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/incoming-requests" />}
                  >
                    <InboxIcon />
                    <span>Incoming requests</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </Authenticated>

        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        {/* <NavUser user={data.user} /> */}
        <Authenticated>
          <UserButton />
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
