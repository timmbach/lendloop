"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function UserProfileInitializer() {
  const { isSignedIn, isLoaded } = useAuth();
  const { isLoaded: userIsLoaded, user } = useUser();
  const ensureProfile = useMutation(api.users.ensureUserProfile);

  useEffect(() => {
    if (!isLoaded || !userIsLoaded || !isSignedIn || !user) return;

    ensureProfile({
      name:
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : (user.firstName ?? user.username ?? undefined),
      email: user.primaryEmailAddress?.emailAddress,
    });
  }, [ensureProfile, isLoaded, userIsLoaded, isSignedIn, user]);

  return null;
}
