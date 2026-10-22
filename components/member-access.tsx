"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { forwardRef, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { useGrowth } from "@/lib/store";
import { AuthDialog } from "./auth-dialog";

const memberRoutes = new Set(["explore", "discover", "learn", "projects", "community", "profile", "admin"]);

export function MemberBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname(), s = useGrowth();
  const protectedRoute = memberRoutes.has(pathname.split("/").filter(Boolean)[0] || "");
  const [auth, setAuth] = useState(false), [mode, setMode] = useState<"login" | "signup">("login");
  useEffect(() => {
    if (protectedRoute && !s.user && !s.loading) { setMode("login"); setAuth(true); }
    else setAuth(false);
  }, [protectedRoute, pathname, s.user?.id, s.loading]);
  if (!protectedRoute || s.user) return children;
  function open(next: "login" | "signup") { setMode(next); setAuth(true); }
  return <div className="member-access-page">
    <header><Link href="/" className="member-access-brand"><img src="/brand/quill-bird-logo.png" alt="" width={48} height={48}/><span>Lingo <small>翎语</small></span></Link><Link href="/" className="text-link"><ArrowLeft size={15}/>返回平台介绍</Link></header>
    <main className="member-access-card">
      {s.loading ? <><LoaderCircle size={30} className="spin"/><h1>正在确认登录状态…</h1><p>稍等一下，你的下一段奇遇即将开启。</p></> : <>
        <span className="member-access-icon"><LockKeyhole size={26}/></span><span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
        <h1>登录翎语，<br/>开启下一段奇遇。</h1><p>资源、课程、项目与社区向已登录成员开放。<br/>使用已有账号登录，或凭内测码受邀注册。</p>
        <div className="member-access-actions"><button className="button primary" onClick={() => open("login")}>登录并继续<ArrowUpRight size={17}/></button><button className="button secondary" onClick={() => open("signup")}>有内测码？受邀注册</button></div>
        {s.error && <p className="form-error" role="alert">暂时无法确认登录状态。<button className="text-button" onClick={() => void s.reload()}>重新连接</button></p>}
      </>}
    </main>
    <AuthDialog open={auth} onOpenChange={setAuth} initialMode={mode}/>
  </div>;
}

type MemberLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & { href: string };
export const MemberLink = forwardRef<HTMLAnchorElement, MemberLinkProps>(function MemberLink({ href, children, ...props }, ref) {
  const s = useGrowth(), router = useRouter(), [auth, setAuth] = useState(false);
  return <><Link {...props} ref={ref} href={href} prefetch={s.user ? props.prefetch : false} onNavigate={event => {
    if (!s.user) { event.preventDefault(); setAuth(true); }
  }}>{children}</Link><AuthDialog open={auth} onOpenChange={setAuth} onAuthenticated={() => router.push(href)}/></>;
});
