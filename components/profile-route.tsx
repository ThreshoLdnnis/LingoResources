"use client";
import { useSearchParams } from "next/navigation";
import { useGrowth } from "@/lib/store";
import Profile from "./profile";
import { MemberProfile } from "./profile-showcase";

export default function ProfileRoute() {
  const params = useSearchParams(), s = useGrowth();
  const member = params.get("user");
  return member && member !== s.user?.id ? <MemberProfile id={member} /> : <Profile />;
}
