"use client";
import {I18nRegion} from "./i18n";
import { useSearchParams } from "next/navigation";
import { useGrowth } from "@/lib/store";
import Profile from "./profile";
import { MemberProfile } from "./profile-showcase";

export default function ProfileRoute() {
  const params = useSearchParams(), s = useGrowth();
  const member = params.get("user");
  return <I18nRegion>{member && member !== s.user?.id ? <MemberProfile id={member} /> : <Profile />}</I18nRegion>;
}
