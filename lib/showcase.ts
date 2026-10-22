export const blockKinds = ["note", "link", "image", "award", "education", "work", "highlight", "heading"] as const;
export type BlockKind = typeof blockKinds[number];
export type ShowcaseBlock = {
  id: string; kind: BlockKind; title: string; body: string; detail: string;
  url: string; date: string; imagePath: string; visible: boolean; wide: boolean;
};
export type ShowcaseDoc = {
  version: 1; theme: "rose" | "orange" | "sky" | "sand" | "lavender";
  status: string; introduction: string; tags: string[]; blocks: ShowcaseBlock[]; published: boolean;
};
export type MemberCard = {
  id: string; name: string; school: string; bio: string; avatar_url: string;
  interests: string[]; showcase: ShowcaseDoc;
};
export const blockLabels: Record<BlockKind, string> = {
  note: "文字介绍", link: "作品链接", image: "图片展示", award: "获奖记录",
  education: "教育经历", work: "工作经历", highlight: "高光时刻", heading: "分区标题",
};
export const themeLabels = { rose: "樱粉步道", orange: "橘子汽水", sky: "晴空球场", sand: "旧书纸棕", lavender: "紫藤花廊" };
export function blankShowcase(): ShowcaseDoc {
  return { version: 1, theme: "rose", status: "", introduction: "", tags: [], blocks: [], published: false };
}
export function freshBlock(kind: BlockKind): ShowcaseBlock {
  return { id: crypto.randomUUID(), kind, title: "", body: "", detail: "", url: "", date: "", imagePath: "", visible: true, wide: kind === "heading" };
}
export function safeLink(value: string): string {
  if (!value.trim()) return "";
  try {
    const text = value.trim();
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : "https://" + text);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.href.length <= 2048 ? url.href : "";
  } catch { return ""; }
}
export function parseShowcase(value: unknown): ShowcaseDoc {
  const fallback = blankShowcase();
  if (!value || typeof value !== "object") return fallback;
  const source = value as Partial<ShowcaseDoc>;
  const storedTheme = (source as { theme?: string }).theme;
  return { ...fallback, theme: storedTheme === "sage" ? "sky" : Object.hasOwn(themeLabels, storedTheme || "") ? source.theme! : "rose",
    status: typeof source.status === "string" ? source.status.slice(0, 60) : "",
    introduction: typeof source.introduction === "string" ? source.introduction.slice(0, 1500) : "",
    tags: Array.isArray(source.tags) ? source.tags.filter(t => typeof t === "string").slice(0, 12).map(t => t.slice(0, 24)) : [],
    blocks: Array.isArray(source.blocks) ? source.blocks.filter(b => b && blockKinds.includes(b.kind)).slice(0, 24) : [],
    published: source.published === true };
}
export function validateShowcase(doc: ShowcaseDoc) {
  if (typeof doc.introduction !== "string" || doc.introduction.length > 1500) throw new Error("个人介绍最多 1500 字。");
  if (new TextEncoder().encode(JSON.stringify(doc)).byteLength > 65536) throw new Error("主页内容较多，请精简部分文字后再保存。");
  if (doc.blocks.length > 24) throw new Error("一个主页最多添加 24 个模块。");
  if (doc.status.length > 60 || doc.tags.length > 12 || doc.tags.some(t => t.length > 24)) throw new Error("状态最多 60 字，标签最多 12 个，每个最多 24 字。");
  const ids = new Set<string>();
  for (const b of doc.blocks) {
    if (ids.has(b.id)) throw new Error("模块重复，请重新添加。");
    ids.add(b.id);
    if (!b.title.trim() || b.title.length > 90 || b.body.length > 1500 || b.detail.length > 100) throw new Error("请填写模块标题，并控制标题 90 字、正文 1500 字、补充信息 100 字以内。");
    if (b.url && !safeLink(b.url)) throw new Error("链接仅支持有效的 HTTP 或 HTTPS 网址。");
    if (b.kind === "link" && !b.url) throw new Error("作品链接模块需要填写网址。");
    if (b.kind === "image" && !b.imagePath) throw new Error("图片模块需要先上传图片。");
  }
}
