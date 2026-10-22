"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import {useSearchParams} from 'next/navigation';
import * as Tabs from "@radix-ui/react-tabs";
import { Plus, Users, MessageCircle, Check, Clock3, Pencil, Trash2 } from "lucide-react";
import { Pagination, usePagination } from "./pagination";
import { Platform, Reveal, Modal, ResourceDetail } from "./platform";
import {CompetitionCover} from "./competition-cover";
import {competitionRecruitment} from "@/lib/event-sharing.mjs";
import { AuthDialog } from "./auth-dialog";
import { CommunityAuthor } from "./community-author";
import { PostComments } from "./post-comments";
import { useGrowth } from "@/lib/store";
import { ownsContent, postDraft } from "@/lib/community-rules.mjs";
import type { Post, Resource } from "@/lib/data";

function EventShareIntent({onIntent}:{onIntent:(intent:{id:string;token:string})=>void}){
 const params=useSearchParams(),id=params.get('share')||'',token=params.get('compose')||'';
 useEffect(()=>onIntent({id,token}),[id,token,onIntent]);
 return null;
}

export default function Community(){
 const s=useGrowth();
 const [editor,setEditor]=useState(false),[edit,setEdit]=useState<Post|null>(null),[deleting,setDeleting]=useState<Post|null>(null),[selectedId,setSelectedId]=useState<string|null>(null),[auth,setAuth]=useState(false);
 const [pending,setPending]=useState(false),[error,setError]=useState("");
 const selected=s.posts.find(p=>p.id===selectedId);
 const [intent,setIntent]=useState({id:'',token:''});
 const incoming=intent.id;
 const [shared,setShared]=useState<Resource|null>(null),[eventDetail,setEventDetail]=useState<Resource|null>(null);
 const handled=useRef("");
 useEffect(()=>{handled.current="";setEditor(false);setEdit(null);setShared(null);setDeleting(null);setError("");},[s.user?.id]);
 useEffect(()=>{
  if(!incoming||s.loading)return;
  const key=incoming+":"+intent.token+":"+(s.connected?(s.user?.id||"guest"):"demo");if(handled.current===key)return;
  handled.current=key;
  const resource=s.resources.find(r=>r.id===incoming&&r.kind==="competition"&&r.status==="published");
  if(!resource){s.notify("原赛事已下架或不存在，暂时无法转发。");return;}
  if(s.connected&&!s.user){setAuth(true);return;}
  setEdit(null);setShared(resource);setError("");setEditor(true);
 },[incoming,intent.token,s.loading,s.resources,s.user?.id]);
 const shareDraft=shared?competitionRecruitment(shared):null;
 const own=(p:Post)=>ownsContent(p.owner_id,s.user?.id,s.connected);
 const mine=s.posts.filter(own),requests=s.applications.filter(a=>mine.some(p=>p.id===a.post_id));
 const applied=selected&&s.applications.some(a=>a.post_id===selected.id&&a.user_id===s.user?.id);
 const all=usePagination(s.posts,12),recruitment=usePagination(s.posts.filter(p=>p.type==="recruitment"),12),discussion=usePagination(s.posts.filter(p=>p.type==="discussion"),12),myPosts=usePagination(mine,12,s.user?.id);
 function begin(post:Post|null=null){
  if(s.connected&&!s.user){setAuth(true);return;}
  if(post&&!own(post))return;
  setShared(null);setEdit(post);setError("");setEditor(true);
 }
 function open(post:Post){setError("");setSelectedId(post.id);}
 function person(post:Post){return <CommunityAuthor id={post.owner_id} name={post.author} url={own(post)?s.avatarUrl||post.avatar_url:post.avatar_url} meta={post.date+" · "+(post.type==="recruitment"?"队友招募":"社区动态")}/>;}
 function eventLink(id:string|null|undefined){
  if(!id)return null;
  const event=s.resources.find(r=>r.id===id&&r.kind==="competition"&&r.status==="published");
  return event?<button type="button" className="shared-event-card" onClick={()=>setEventDetail(event)}>
   {event.cover_path&&<CompetitionCover path={event.cover_path} title={event.title}/>}
   <span><small>转发赛事 · 组队招募</small><strong>{event.title}</strong><span>{event.org} · {event.location}</span></span><span className="shared-event-arrow" aria-hidden="true">↗</span>
  </button>:<div className="shared-event-unavailable">原赛事已下架或移除，组队帖与评论仍保留。</div>;
 }
 function postList(type="all"){
  const paging=type==="recruitment"?recruitment:type==="discussion"?discussion:type==="mine"?myPosts:all;
  return paging.total?<div ref={paging.anchor} tabIndex={-1} className="pagination-anchor"><div className="post-list">{paging.items.map(p=><Reveal className="post-card" key={p.id}>
   <div className="post-author">{person(p)}<div className="post-heading-actions"><span className={p.type==="recruitment"?"status published":"status discussion"}>{p.type==="recruitment"?"寻找伙伴":"交流分享"}</span>
    {own(p)&&<><button className="icon-button" aria-label={"编辑我的帖子："+p.title} onClick={()=>begin(p)}><Pencil size={16}/></button><button className="icon-button" aria-label={"删除我的帖子："+p.title} onClick={()=>{setDeleting(p);setError("");}}><Trash2 size={16}/></button></>}
   </div></div><h2>{p.title}</h2><p className="post-card-body">{p.body}</p>{eventLink(p.resource_id)}<div className="post-bottom"><div className="tags">{p.tags.map(t=><span key={t}>{t}</span>)}</div><button className="button secondary" onClick={()=>open(p)}><MessageCircle size={15}/>查看动态 / 评论</button></div>
  </Reveal>)}</div><Pagination paging={paging} label={type==="mine"?"我的帖子":"社区动态"}/></div>:<div className="empty-state"><MessageCircle/><h3>{type==="mine"?"你还没有发布帖子":"这里还很安静"}</h3><p>分享一段思考，或发布你的队友招募。</p>{type==="mine"&&<button className="button soft" onClick={()=>begin()}>发布第一条动态</button>}</div>;
 }
 return <Platform page="community">
  <Suspense fallback={null}><EventShareIntent onIntent={setIntent}/></Suspense>
  <Reveal className="page-heading"><div><span className="eyebrow">GOOD PEOPLE, GREAT POSSIBILITIES</span><h1>一个人启程，一群人走得更远。</h1><p>遇见兴趣相投的伙伴，一起学习、共创和成长。</p></div><button className="button primary" onClick={()=>begin()}><Plus size={17}/>发布动态 / 招募</button></Reveal>
  <div className="community-layout"><div><Tabs.Root defaultValue="all"><Tabs.List className="radix-tabs"><Tabs.Trigger value="all">社区广场</Tabs.Trigger><Tabs.Trigger value="recruitment">队友招募</Tabs.Trigger><Tabs.Trigger value="discussion">交流分享</Tabs.Trigger><Tabs.Trigger value="mine">我的帖子 <span>{mine.length}</span></Tabs.Trigger><Tabs.Trigger value="review">申请审核 <span>{requests.filter(a=>a.status==="pending").length}</span></Tabs.Trigger></Tabs.List>
   <Tabs.Content value="all">{postList()}</Tabs.Content><Tabs.Content value="recruitment">{postList("recruitment")}</Tabs.Content><Tabs.Content value="discussion">{postList("discussion")}</Tabs.Content><Tabs.Content value="mine">{postList("mine")}</Tabs.Content>
   <Tabs.Content value="review">{requests.length?<div className="application-list">{requests.map(a=><div className="application-row" key={a.id}><div><span className={"status "+a.status}>{a.status==="pending"?"待审核":a.status==="approved"?"已通过":"已拒绝"}</span><h3>{a.name||"申请者"}</h3><p>{a.message}</p></div>{a.status==="pending"&&<div className="row-actions"><button className="button soft" onClick={()=>s.review(a.id,"approved").catch(e=>s.notify(e.message))}>通过</button><button className="button secondary" onClick={()=>s.review(a.id,"rejected").catch(e=>s.notify(e.message))}>拒绝</button></div>}</div>)}</div>:<div className="empty-state"><Clock3 size={30}/><h3>暂时没有待审核申请</h3><p>发布队友招募后，可以在这里审核申请。</p></div>}</Tabs.Content>
  </Tabs.Root></div><aside className="community-aside"><Reveal className="community-guide"><span className="eyebrow">一起做点事</span><Users size={34} strokeWidth={1.2}/><h2>好的队伍，<br/>从清晰的期待开始。</h2><ul><li>说清你想解决的问题</li><li>说明需要的技能与时间</li><li>一起约定具体的产出</li><li>尊重彼此，保持沟通</li></ul><button className="button soft" onClick={()=>begin()}>发布一份招募</button></Reveal><Reveal className="community-note"><span>✦</span><p>不必等到准备完美，<br/>你也可以带着问题加入。</p></Reveal></aside></div>
  <Modal open={editor} onOpenChange={value=>{if(!pending)setEditor(value);}} title={edit?"编辑你的帖子":"让对的人，发现你"} wide><form className="form-stack" key={edit?.id||shared?.id||"new-post"} onSubmit={async e=>{
   e.preventDefault();setPending(true);setError("");try{const draft=postDraft(new FormData(e.currentTarget));if(edit)await s.updatePost(edit.id,draft);else await s.publishPost({id:crypto.randomUUID(),...draft,...(shared?{resource_id:shared.id}:{}),author:s.profile.name,avatar:Array.from(s.profile.name)[0]||"宗",date:new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Shanghai"}),owner_id:s.user?.id||"demo"});setEditor(false);}catch(e){setError((e as Error).message);}finally{setPending(false);}
  }}>{eventLink(edit?.resource_id||shared?.id)}{shared&&<p className="field-help">已关联原赛事。请写下自己的方向、已有技能、期待的队友和可投入时间，确认后再发布。</p>}<label>发布类型<select name="type" defaultValue={edit?.type||"recruitment"}><option value="recruitment">队友招募</option><option value="discussion">交流分享</option></select></label><label>标题<input name="title" defaultValue={edit?.title||shareDraft?.title} required maxLength={100} placeholder="简洁说清你的想法或招募方向"/></label><label>正文<textarea name="body" defaultValue={edit?.body} required minLength={20} maxLength={5000} placeholder="介绍目标、当前进展、期待的伙伴和投入时间（至少 20 字）"/></label><label>标签<input name="tags" defaultValue={edit?.tags.join("，")||shareDraft?.tags.join("，")} maxLength={150} placeholder="人工智能，产品设计，组队"/></label>{error&&<p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="button secondary" type="button" disabled={pending} onClick={()=>setEditor(false)}>取消</button><button className="button primary" disabled={pending}>{pending?"保存中…":edit?"保存修改":"发布到社区广场"}</button></div></form></Modal>
  <Modal open={!!selected} onOpenChange={()=>setSelectedId(null)} title={selected?.title||"动态"} wide>{selected&&<><div className="post-detail-author">{person(selected)}{own(selected)&&<button className="button secondary" onClick={()=>begin(selected)}><Pencil size={15}/>编辑帖子</button>}</div><p className="detail-description post-detail-body">{selected.body}</p>{eventLink(selected.resource_id)}<div className="tags">{selected.tags.map(t=><span key={t}>{t}</span>)}</div>
   {selected.type==="recruitment"&&!own(selected)&&(s.connected&&!s.user?<div className="apply-signin"><p>登录后，可以向发起人介绍自己。</p><button className="button soft" onClick={()=>setAuth(true)}>登录后申请加入</button></div>:<form className="apply-form" onSubmit={async e=>{e.preventDefault();setPending(true);setError("");try{await s.apply(undefined,selected.id,String(new FormData(e.currentTarget).get("message")));}catch(e){setError((e as Error).message);}finally{setPending(false);}}}><label>向队友介绍你自己<textarea name="message" required minLength={10} maxLength={1500} disabled={!!applied} placeholder="你能带来哪些技能？每周能投入多久？"/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button soft" disabled={pending||!!applied}><Check size={16}/>{applied?"已申请":pending?"提交中…":"提交加入申请"}</button></form>)}
   <PostComments key={selected.id} postId={selected.id} onSignIn={()=>setAuth(true)}/>
  </>}</Modal>
  <Modal open={!!deleting} onOpenChange={()=>{if(!pending)setDeleting(null);}} title="删除这条帖子？"><p className="muted">「{deleting?.title}」及其评论将不再向其他伙伴展示，已有组队申请记录会保留。</p>{error&&<p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="button secondary" disabled={pending} onClick={()=>setDeleting(null)}>保留帖子</button><button className="button danger" disabled={pending} onClick={async()=>{if(!deleting)return;setPending(true);setError("");try{await s.deletePost(deleting.id);if(selectedId===deleting.id)setSelectedId(null);setDeleting(null);}catch(e){setError((e as Error).message);}finally{setPending(false);}}}>{pending?"删除中…":"确认删除"}</button></div></Modal>
  <ResourceDetail resource={eventDetail} onClose={()=>setEventDetail(null)}/><AuthDialog open={auth} onOpenChange={setAuth}/>
 </Platform>;
}
