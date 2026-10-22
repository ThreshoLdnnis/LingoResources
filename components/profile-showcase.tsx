"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, BriefcaseBusiness, Check, Coffee, Copy, ExternalLink, Eye, EyeOff, Image as ImageIcon, LayoutGrid, Link2, LoaderCircle, Pencil, Plus, Quote, Sparkles, Trash2, Trophy, Type, X } from "lucide-react";
import { useGrowth } from "@/lib/store";
import { blockLabels, freshBlock, parseShowcase, safeLink, themeLabels, validateShowcase, type BlockKind, type MemberCard, type ShowcaseBlock, type ShowcaseDoc } from "@/lib/showcase";
import { AvatarImage } from "./account-avatar";
import { AuthDialog } from "./auth-dialog";
import { Modal, Platform, Reveal } from "./platform";

const icons = { note: Quote, link: Link2, image: ImageIcon, award: Trophy, education: BookOpen, work: BriefcaseBusiness, highlight: Sparkles, heading: Type };
const descriptions: Record<BlockKind, string> = {
  note: "一段介绍，一点正在思考的事", link: "网站、项目、文章或作品集", image: "作品、生活片刻与灵感照片", award: "把值得纪念的认可留下来",
  education: "学校、专业与学习经历", work: "实习、工作或志愿经历", highlight: "做成的小事，也值得闪闪发光", heading: "为你的主页整理一个章节",
};
const clone = (doc: ShowcaseDoc) => JSON.parse(JSON.stringify(doc)) as ShowcaseDoc;
const tagsFrom = (text: string) => [...new Set(text.split(/[,，\n]/).map(t => t.trim()).filter(Boolean))];

export function ProfileIdentity({ name, school, bio, avatarUrl, interests, doc, onEdit }: {
  name: string; school: string; bio: string; avatarUrl: string; interests: string[]; doc: ShowcaseDoc; onEdit?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tags = doc.tags.length ? doc.tags : interests;
  return <Reveal className={"profile-identity profile-theme-" + doc.theme}>
    <div className="identity-eyebrow"><span>YOUR PERSONAL CONSTELLATION</span><span><Sparkles size={13} /> 个人名片</span></div>
    <div className="identity-portrait"><div className="identity-avatar"><AvatarImage url={avatarUrl} name={name} /></div>
      <div><h1>{name}</h1><p>{school}</p></div>{onEdit && <button className="button secondary" onClick={onEdit}><Pencil size={15} />编辑资料</button>}
    </div>
    {(doc.status || bio) && <div className="identity-bubble">{doc.status && <span className="identity-status"><Coffee size={15} />{doc.status}</span>}{bio && <p className={bio.length > 130 && !expanded ? "bio-collapsed" : ""}>{bio}</p>}{bio.length > 130 && <button className="text-button bio-expand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "收起简介" : "展开简介"}</button>}</div>}
    {doc.introduction && <section className="identity-introduction" aria-label="个人介绍"><span>ABOUT ME / 个人介绍</span><p>{doc.introduction}</p></section>}
    {!!tags.length && <div className="identity-tags">{tags.map((t, i) => <span key={t + i}><i />{t}</span>)}</div>}
  </Reveal>;
}

function ModulePicture({ path, title }: { path: string; title: string }) {
  const s = useGrowth();
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true; setUrl(""); setFailed(false);
    if (!s.client || !path) { setFailed(true); return; }
    void s.client.storage.from("profile-media").createSignedUrl(path, 900).then(result => {
      if (!active) return;
      if (result.error) setFailed(true); else setUrl(result.data.signedUrl);
    });
    return () => { active = false; };
  }, [path, s.client, s.user?.id]);
  return <div className="showcase-picture">{url && !failed ? <img src={url} alt={title} onError={() => setFailed(true)} /> : <div><ImageIcon size={28} /><span>{failed ? "图片暂时不可用" : "正在加载图片…"}</span></div>}</div>;
}

function AwardLaurel() {
  return <svg className="award-laurel" viewBox="0 0 320 190" preserveAspectRatio="none" aria-hidden="true">{[0, 1].map(side => <g key={side} transform={side ? "translate(320 0) scale(-1 1)" : undefined}><path d="M47 164C15 132 7 83 30 32" fill="none" stroke="currentColor" strokeWidth="1.2" />{Array.from({ length: 8 }, (_, i) => { const y = 46 + i * 14, x = 19 + Math.pow((i - 2.5) / 5, 2) * 17; return <g key={i}><ellipse cx={x - 5} cy={y} rx="3.6" ry="8.5" fill="currentColor" transform={`rotate(-35,${x - 5},${y})`} /><ellipse cx={x + 8} cy={y + 5} rx="3.3" ry="7.5" fill="currentColor" transform={`rotate(38,${x + 8},${y + 5})`} /></g>; })}</g>)}</svg>;
}

function ShowcaseTile({ block, onRead }: { block: ShowcaseBlock; onRead: () => void }) {
  const Icon = icons[block.kind];
  const link = safeLink(block.url);
  const host = link ? new URL(link).hostname.replace(/^www\./, "") : "链接暂不可用";
  if (block.kind === "heading") return <div className="showcase-section-title"><span /><h2>{block.title}</h2><span /></div>;
  const canRead = block.body.length > 55 || block.title.length > 28 || block.detail.length > 28 || block.kind === "image";
  const body = <>
    {block.kind === "image" ? <ModulePicture path={block.imagePath} title={block.title} /> : block.kind === "award" ? <div className="certificate-header"><span>CERTIFICATE OF ACHIEVEMENT</span><b>荣誉证书</b><i>✦</i></div> : <div className="showcase-tile-top"><span className="showcase-kind-icon"><Icon size={23} strokeWidth={1.7} /></span><small>{blockLabels[block.kind]}</small>{block.kind === "link" && <ExternalLink size={16} />}</div>}
    {block.kind === "award" && <><AwardLaurel /><span className="certificate-seal" aria-hidden="true"><Trophy size={17} strokeWidth={1.4} /></span></>}
    <div className="showcase-tile-copy"><h3>{block.title}</h3>{block.body && <p>{block.body}</p>}
      {(block.detail || block.date) && <div className="showcase-tile-meta">{block.detail && <span>{block.detail}</span>}{block.date && <time dateTime={block.date}>{block.date.replaceAll("-", ".")}</time>}</div>}
      {block.kind === "link" && <span className="showcase-link-host">{host}<span>↗</span></span>}
    </div>
  </>;
  const className = "showcase-tile tile-" + block.kind;
  const readMore = canRead && <button type="button" className="showcase-read-more" onClick={onRead}>查看完整内容 <ArrowUp size={12} /></button>;
  return block.kind === "link" && link
    ? <article className={className}><a className="showcase-link-main" href={link} target="_blank" rel="noopener noreferrer" aria-label={"打开作品：" + block.title}>{body}</a>{readMore}</article>
    : <article className={className}>{body}{readMore}</article>;
}

export function ShowcaseBoard({ doc }: { doc: ShowcaseDoc }) {
  const [reading, setReading] = useState<ShowcaseBlock | null>(null);
  const blocks = doc.blocks.filter(b => b.visible);
  const visibleReading = blocks.find(b => b.id === reading?.id);
  return blocks.length ? <><div className={"showcase-board profile-theme-" + doc.theme}>{blocks.map(b => <Reveal className={b.kind === "heading" ? "showcase-heading-slot" : "showcase-card-slot"} key={b.id}><ShowcaseTile block={b} onRead={() => setReading(b)} /></Reveal>)}</div><Modal open={!!visibleReading} onOpenChange={open => { if (!open) setReading(null); }} title={visibleReading?.title || "展示内容"}><div className="showcase-full-content">{visibleReading?.kind === "image" && <ModulePicture path={visibleReading.imagePath} title={visibleReading.title} />}{visibleReading?.body && <p>{visibleReading.body}</p>}{(visibleReading?.detail || visibleReading?.date) && <div className="showcase-full-meta">{visibleReading.detail && <span>{visibleReading.detail}</span>}{visibleReading.date && <time dateTime={visibleReading.date}>{visibleReading.date.replaceAll("-", ".")}</time>}</div>}</div></Modal></>
    : <div className="showcase-quiet"><span>✦</span><h3>这里留给你的故事。</h3><p>一段介绍、一个作品，或一次值得记住的经历。</p></div>;
}

export function ProfileShowcase() {
  const s = useGrowth();
  const [open, setOpen] = useState(false), [auth, setAuth] = useState(false), [preview, setPreview] = useState(false);
  const [draft, setDraft] = useState<ShowcaseDoc>(() => clone(s.showcase));
  const [tagText, setTagText] = useState("");
  const [stage, setStage] = useState<"overview" | "library" | "block">("overview");
  const [editing, setEditing] = useState<ShowcaseBlock | null>(null);
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const [editorOwner, setEditorOwner] = useState("");
  useEffect(() => {
    if (open && editorOwner !== (s.user?.id || "demo")) { setOpen(false); setError(""); }
  }, [s.user?.id, editorOwner, open]);
  function begin() {
    if (s.connected && !s.user) { setAuth(true); return; }
    const initial = clone(s.showcase);
    if (!initial.blocks.length && !initial.status && !initial.tags.length) initial.published = true;
    setDraft(initial); setTagText(initial.tags.join("，")); setStage("overview"); setEditing(null); setError(""); setEditorOwner(s.user?.id || "demo"); setOpen(true);
  }
  function move(id: string, direction: number) {
    setDraft(current => {
      const blocks = [...current.blocks], index = blocks.findIndex(b => b.id === id), next = index + direction;
      if (next < 0 || next >= blocks.length) return current;
      [blocks[index], blocks[next]] = [blocks[next], blocks[index]];
      return { ...current, blocks };
    });
  }
  async function saveModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; setError(""); setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const rawUrl = String(form.get("url") || "");
      if (rawUrl.trim() && !safeLink(rawUrl)) throw new Error("请输入有效的 HTTP 或 HTTPS 链接。");
      const block = { ...editing, title: String(form.get("title") || "").trim(), body: String(form.get("body") || ""), detail: String(form.get("detail") || ""), date: String(form.get("date") || ""), url: safeLink(rawUrl), wide: false };
      if (!block.title || block.title.length > 90) throw new Error("请填写 90 字以内的标题。");
      const file = form.get("image") as File | null;
      if (file?.size) block.imagePath = await s.uploadShowcaseImage(file);
      validateShowcase({ ...draft, blocks: [block] });
      setDraft(current => ({ ...current, blocks: current.blocks.some(b => b.id === block.id) ? current.blocks.map(b => b.id === block.id ? block : b) : [...current.blocks, block] }));
      setEditing(null); setStage("overview");
    } catch (e) { setError((e as Error).message); } finally { setPending(false); }
  }
  async function save() {
    setPending(true); setError("");
    try { const document = { ...draft, tags: tagsFrom(tagText) }; validateShowcase(document); await s.updateShowcase(document); setOpen(false); }
    catch (e) { setError((e as Error).message); } finally { setPending(false); }
  }
  async function copyLink() {
    if (!s.user) { setAuth(true); return; }
    if (!s.showcase.published) { s.notify("先在编辑主页中开启展示并保存，再分享名片。"); return; }
    try { await navigator.clipboard.writeText(location.origin + "/profile/?user=" + s.user.id); s.notify("名片链接已复制，登录后即可查看"); }
    catch { s.notify("复制失败，请在个人名片预览中手动复制地址。"); }
  }
  return <section className="showcase-owner">
    <div className="showcase-toolbar"><div><span className="eyebrow">A LITTLE MORE ABOUT YOU</span><h2>把你喜欢的自己，展示出来。</h2><p>像整理书摘一样，留下你觉得最酷的事儿。</p></div>
      <div className="showcase-actions"><button className="button secondary" onClick={() => setPreview(true)}><Eye size={16} />预览名片</button><button className="button secondary" onClick={() => void copyLink()}><Copy size={16} />分享名片</button><button className="button primary" onClick={begin}><Pencil size={16} />编辑主页</button></div>
    </div>
    <div className="showcase-visibility"><span><i className={s.showcase.published ? "is-public" : ""} />{s.showcase.published ? "名片已开启站内展示" : "名片尚未开启展示"}</span><small>只展示你选中的内容，成长记录仍由自己管理。</small></div>
    <ShowcaseBoard doc={s.showcase} />
    {!s.showcase.blocks.length && <div className="showcase-start-options">{(["link", "award", "note", "image"] as BlockKind[]).map(kind => { const Icon = icons[kind]; return <button key={kind} onClick={() => { begin(); if (!s.connected || s.user) { setEditing(freshBlock(kind)); setStage("block"); } }}><Icon size={22} /><span>{blockLabels[kind]}</span><Plus size={14} /></button>; })}</div>}
    <AuthDialog open={auth} onOpenChange={setAuth} />
    <Modal open={preview} onOpenChange={setPreview} title="个人名片预览" wide><p className="field-help">{s.showcase.published ? "其他登录用户只会看到下方简介和已显示的模块。" : "当前尚未开启展示，保存并开启后伙伴就能看到这张名片。"}</p>
      <div className="showcase-preview"><ProfileIdentity name={s.profile.name} school={s.profile.school} bio={s.profile.bio} avatarUrl={s.avatarUrl} interests={s.profile.interests} doc={s.showcase} /><ShowcaseBoard doc={s.showcase} /></div>
      {s.user && s.showcase.published && <label className="share-url-label">名片地址<input readOnly value={typeof location === "undefined" ? "" : location.origin + "/profile/?user=" + s.user.id} aria-label="名片地址" /></label>}
    </Modal>
    <Dialog.Root open={open} onOpenChange={value => { if (!pending) setOpen(value); }}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="modal-content showcase-editor" aria-describedby="showcase-editor-description">
      <div className="modal-top"><Dialog.Title>{stage === "library" ? "添加一个展示模块" : stage === "block" && editing ? "编辑" + blockLabels[editing.kind] : "编辑你的个人主页"}</Dialog.Title><Dialog.Close className="icon-button" disabled={pending} aria-label="关闭主页编辑"><X size={20} /></Dialog.Close></div>
      <p id="showcase-editor-description" className="showcase-editor-hint">{stage === "overview" ? "自己决定展示什么。保存后同步到账号，也可以随时隐藏。" : "不用太有压力，先留下一件你觉得最酷的事儿。"}</p>
      {stage !== "overview" && <button className="text-button editor-back" disabled={pending} onClick={() => { setError(""); setStage("overview"); }}><ArrowLeft size={15} />返回主页编辑</button>}
      {stage === "library" ? <div className="module-library">{[{ name: "作品与表达", kinds: ["link", "note", "image", "heading"] }, { name: "经历与印记", kinds: ["highlight", "education", "work", "award"] }].map(group => <section key={group.name}><h3>{group.name}</h3><div>{group.kinds.map(value => { const kind = value as BlockKind, Icon = icons[kind]; return <button key={kind} onClick={() => { setEditing(freshBlock(kind)); setStage("block"); setError(""); }}><span><Icon size={28} strokeWidth={1.6} /></span><b>{blockLabels[kind]}</b><small>{descriptions[kind]}</small></button>; })}</div></section>)}</div>
      : stage === "block" && editing ? <form key={editing.id} className="form-stack module-form" onSubmit={saveModule}>
        <label>{editing.kind === "heading" ? "章节名称" : "标题"}<input name="title" defaultValue={editing.title} required maxLength={90} placeholder={editing.kind === "award" ? "例如：校园创新挑战赛一等奖" : editing.kind === "link" ? "例如：我做的第一个产品" : "为这一段故事取个名字"} /></label>
        {editing.kind === "link" && <label>作品网址<input name="url" defaultValue={editing.url} required maxLength={2048} placeholder="https:// 或直接输入网站域名" inputMode="url" /></label>}
        {editing.kind !== "heading" && <label>{editing.kind === "note" ? "想说的话" : "介绍 / 收获"}<textarea name="body" defaultValue={editing.body} maxLength={1500} placeholder="介绍你做了什么、为什么喜欢它，或留下一个值得记住的瞬间。" /></label>}
        {["award", "education", "work", "highlight"].includes(editing.kind) && <div className="form-columns"><label>{editing.kind === "award" ? "颁发机构" : editing.kind === "education" ? "学校 / 专业" : editing.kind === "work" ? "机构 / 职位" : "地点 / 补充信息"}<input name="detail" defaultValue={editing.detail} maxLength={100} /></label><label>日期（选填）<input name="date" type="date" defaultValue={editing.date} /></label></div>}
        {editing.kind === "image" && <><label>图片<input name="image" type="file" accept="image/png,image/jpeg,image/webp" /><small className="field-help">PNG / JPEG / WebP，最多 3MB。图片仅在你已展示的模块中对其他用户可见。</small></label>{editing.imagePath && <ModulePicture path={editing.imagePath} title={editing.title} />}</>}
        {editing.kind !== "heading" && <p className="field-help">展示卡片使用统一尺寸，长内容可以点击展开查看。</p>}
        {error && <p className="form-error" role="alert">{error}</p>}<div className="editor-save-row"><button className="button primary" disabled={pending}>{pending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{pending ? "正在保存模块…" : "保存模块"}</button></div>
      </form> : <div className="showcase-editor-grid"><div className="showcase-editor-settings">
        <div className="form-stack"><label>最近的状态<input value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })} maxLength={60} placeholder="☕ 可以聊聊 · 正在寻找创作伙伴" /></label><label>我的标签<input value={tagText} onChange={e => setTagText(e.target.value)} onBlur={() => setDraft({ ...draft, tags: tagsFrom(tagText) })} placeholder="产品设计，AI 探索，爱写作" /><small className="field-help">用逗号分隔，最多 12 个，每个 24 字以内。</small></label></div>
        <fieldset className="showcase-themes"><legend>主页配色</legend><div>{Object.entries(themeLabels).map(([theme, label]) => <button type="button" key={theme} className={"theme-swatch swatch-" + theme + (draft.theme === theme ? " chosen" : "")} aria-pressed={draft.theme === theme} aria-label={label} onClick={() => setDraft({ ...draft, theme: theme as ShowcaseDoc["theme"] })}><span>{draft.theme === theme && <Check size={15} />}</span><small>{label}</small></button>)}</div></fieldset>
        <label className="showcase-check publish-check"><input type="checkbox" checked={draft.published} onChange={e => setDraft({ ...draft, published: e.target.checked })} /><span>开启主页展示<small>允许其他登录用户查看你的简介及显示的模块。</small></span></label>
        <div className="module-list-heading"><h3>展示模块 <small>{draft.blocks.length} / 24</small></h3><button className="text-button" disabled={draft.blocks.length >= 24} onClick={() => setStage("library")}><Plus size={15} />添加模块</button></div>
        <div className="module-editor-list">{draft.blocks.map((block, index) => { const Icon = icons[block.kind]; return <div className={block.visible ? "" : "module-hidden"} key={block.id}><span className="module-list-icon"><Icon size={18} /></span><button className="module-edit-title" onClick={() => { setEditing({ ...block }); setStage("block"); setError(""); }}><b>{block.title}</b><small>{blockLabels[block.kind]}</small></button><div className="module-row-actions"><button className="icon-button" aria-label={"上移 " + block.title} disabled={index === 0} onClick={() => move(block.id, -1)}><ArrowUp size={15} /></button><button className="icon-button" aria-label={"下移 " + block.title} disabled={index === draft.blocks.length - 1} onClick={() => move(block.id, 1)}><ArrowDown size={15} /></button><button className="icon-button" aria-label={(block.visible ? "隐藏 " : "显示 ") + block.title} aria-pressed={block.visible} onClick={() => setDraft({ ...draft, blocks: draft.blocks.map(b => b.id === block.id ? { ...b, visible: !b.visible } : b) })}>{block.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button><button className="icon-button" aria-label={"移除 " + block.title} onClick={() => setDraft({ ...draft, blocks: draft.blocks.filter(b => b.id !== block.id) })}><Trash2 size={15} /></button></div></div>; })}</div>
        {!draft.blocks.length && <button className="module-add-empty" onClick={() => setStage("library")}><Plus size={25} /><b>添加你的第一个模块</b><span>作品、经历、图片，或一段自我介绍。</span></button>}
      </div><aside className="showcase-live-preview"><span className="eyebrow">名片预览</span><ProfileIdentity name={s.profile.name} school={s.profile.school} bio={s.profile.bio} avatarUrl={s.avatarUrl} interests={s.profile.interests} doc={draft} /><ShowcaseBoard doc={draft} /></aside></div>}
      {stage === "overview" && <div className="showcase-editor-footer">{error && <p className="form-error" role="alert">{error}</p>}<small>{draft.published ? "保存后，其他用户即可看到已显示的模块。" : "保存后仅自己可见，随时可以开启展示。"}</small><button className="button primary" disabled={pending} onClick={() => void save()}>{pending ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{pending ? "保存中…" : draft.published ? "保存并展示" : "保存主页"}</button></div>}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>;
}

export function MemberProfile({ id }: { id: string }) {
  const s = useGrowth();
  const [card, setCard] = useState<MemberCard | null>(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [auth, setAuth] = useState(false), [retry, setRetry] = useState(0);
  const validId = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id);
  useEffect(() => {
    let active = true; setCard(null); setError(""); setLoading(false);
    if (!s.client || !s.user || s.loading || !validId) return;
    setLoading(true);
    void s.client.rpc("get_member_profile", { p_user_id: id }).then(result => {
      if (!active) return;
      if (result.error) setError("暂时无法读取这张名片，请稍后重试。");
      else if (result.data) setCard({ ...result.data, showcase: parseShowcase(result.data.showcase) } as MemberCard);
      setLoading(false);
    });
    return () => { active = false; };
  }, [id, validId, s.user?.id, s.client, s.loading, retry]);
  return <Platform page="profile"><div className="member-card-navigation"><Link href="/community/"><ArrowLeft size={16} />返回社区广场</Link><Link href="/profile/">我的个人空间</Link></div>
    {!validId ? <div className="empty-state"><h1>这张名片的地址不完整</h1><p>请从对方的头像、昵称或分享链接重新进入。</p></div>
    : s.loading || loading ? <div className="empty-state"><LoaderCircle className="spin" size={30} /><p>正在展开这张名片…</p></div>
    : !s.user ? <div className="member-sign-in"><Sparkles size={32} /><h1>登录翎语，认识这位新伙伴。</h1><p>个人名片向站内用户开放，使用已有账号登录即可查看。</p><button className="button primary" onClick={() => setAuth(true)}>登录查看名片</button></div>
    : error ? <div className="empty-state"><h1>名片暂时没有展开</h1><p>{error}</p><button className="button secondary" onClick={() => setRetry(value => value + 1)}>重试</button></div>
    : !card ? <div className="member-sign-in"><EyeOff size={32} /><h1>对方暂未开启主页展示。</h1><p>可以先回社区广场，认识更多同行的伙伴。</p><Link href="/community/" className="button secondary">回到社区广场</Link></div>
    : <><ProfileIdentity name={card.name} school={card.school} bio={card.bio} avatarUrl={card.avatar_url || ""} interests={card.interests || []} doc={card.showcase} /><div className="member-showcase-heading"><span className="eyebrow">A FEW THINGS THAT MAKE ME, ME</span><h2>我的作品与成长印记</h2></div><ShowcaseBoard doc={card.showcase} /></>}
    <AuthDialog open={auth} onOpenChange={setAuth} />
  </Platform>;
}
