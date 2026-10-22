import Link from "next/link";
export default function NotFound(){return <main className="page-main"><div className="empty-state"><h1>这条路，暂时还未开辟。</h1><p>回到首页，继续发现你的下一步。</p><Link href="/" className="button primary">返回首页</Link></div></main>}
