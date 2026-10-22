import { Platform } from "@/components/platform";
import { brand } from "@/lib/brand";

export const metadata = { title: `探索首页 · ${brand.title}` };
export default function Explore() { return <Platform page="home"/>; }
