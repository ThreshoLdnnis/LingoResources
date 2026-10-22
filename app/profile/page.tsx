import { brand } from "@/lib/brand";
import { Suspense } from "react";
import View from "@/components/profile-route";
import { Platform } from "@/components/platform";
export const metadata = {title:`个人空间 · ${brand.title}`};
export default function Page(){return <Suspense fallback={<Platform page="profile"><div className="empty-state"><h1>你的个人名片</h1><p>正在展开你的故事…</p></div></Platform>}><View/></Suspense>;}
