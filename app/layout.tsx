import type { Metadata } from "next";
import "./globals.css";
import "./showcase.css";
import "./theme.css";
import "./landing.css";
import "./refinements.css";
import "./i18n.css";
import "./event-cards.css";
import {I18nProvider} from '@/components/i18n';
import { brand } from "@/lib/brand";
import { GrowthProvider } from "@/lib/store";
import { MemberBoundary } from "@/components/member-access";
export const metadata: Metadata = { title: `${brand.title} · ${brand.descriptor}`, description: `${brand.tagline}。让优秀的资源，不再只属于少数知道的人。发现机会，学习技能，寻找伙伴，参与实践。`, icons: { icon: { url: "/brand/quill-bird-icon.svg", type: "image/svg+xml" }, apple: "/brand/quill-bird-logo.png" } };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{var t=localStorage.getItem('zongmen-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}"}}/></head><body><I18nProvider><GrowthProvider><MemberBoundary>{children}</MemberBoundary></GrowthProvider></I18nProvider></body></html>; }
