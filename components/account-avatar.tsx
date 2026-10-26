"use client";
import {I18nRegion} from "./i18n";


import Link from "next/link";
import { useState } from "react";
import { UserRound } from "lucide-react";

export function AvatarImage({ url, name }: { url: string; name: string }) {
  const [failedUrl, setFailedUrl] = useState("");
  return <I18nRegion>{url && url !== failedUrl
    ? <img src={url} alt="" onError={() => setFailedUrl(url)} />
    : <span aria-hidden="true">{name.trim().slice(0, 1) || "我"}</span>}</I18nRegion>;
}

export function AccountAvatar({ signedIn, loading, url, name, open, onSignIn, onNavigate }: {
  signedIn: boolean; loading: boolean; url: string; name: string; open: boolean;
  onSignIn: () => void; onNavigate: () => void;
}) {
  return <I18nRegion>{signedIn
    ? <Link href="/profile/" className="avatar account-avatar" aria-label="个人空间" title="个人空间" onNavigate={onNavigate}>
      <AvatarImage url={url} name={name} />
    </Link>
    : <button type="button" className="avatar account-avatar avatar-guest" aria-label={loading ? "正在确认账户" : "登录或注册"}
      title="登录 / 注册" aria-haspopup="dialog" aria-expanded={open} disabled={loading} onClick={onSignIn}>
      <UserRound size={23} aria-hidden="true" />
    </button>}</I18nRegion>;
}
