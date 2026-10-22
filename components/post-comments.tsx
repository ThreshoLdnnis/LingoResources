"use client";
import { useEffect, useState } from "react";
import { LoaderCircle, MessageCircle, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useGrowth } from "@/lib/store";
import type { PostComment } from "@/lib/data";
import { ownsContent } from "@/lib/community-rules.mjs";
import { CommunityAuthor } from "./community-author";
import { Modal } from "./platform";

export function PostComments({postId,onSignIn}:{postId:string;onSignIn:()=>void}){
 const s=useGrowth();
 const [items,setItems]=useState<PostComment[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(1),[refresh,setRefresh]=useState(0);
 const [loading,setLoading]=useState(true),[pending,setPending]=useState(false),[error,setError]=useState(""),[draft,setDraft]=useState("");
 const [editing,setEditing]=useState<string|null>(null),[editBody,setEditBody]=useState(""),[deleting,setDeleting]=useState<PostComment|null>(null);
 useEffect(()=>{setDraft("");setEditing(null);setDeleting(null);setPage(1);},[postId,s.user?.id]);
 useEffect(()=>{
  let active=true;setLoading(true);setError("");
  void s.getComments(postId,page).then(result=>{
   if(!active)return;const last=Math.max(1,Math.ceil(result.total/20));
   if(page>last){setPage(last);return;}setItems(result.items);setTotal(result.total);
  }).catch(e=>{if(active)setError(e.message||"评论加载失败，请重试。");}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[postId,page,refresh,s.user?.id,s.avatarUrl,s.profile.name]);
 const pages=Math.max(1,Math.ceil(total/20));
 const refreshComments=()=>setRefresh(x=>x+1);
 const own=(comment:PostComment)=>ownsContent(comment.owner_id,s.user?.id,s.connected);
 return <section className="post-comments" aria-label="帖子评论">
  <div className="comments-heading"><h3><MessageCircle size={18}/>评论 <span>{total}</span></h3><button className="icon-button" aria-label="刷新评论" disabled={loading} onClick={refreshComments}><RefreshCw size={16}/></button></div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {loading?<div className="comments-loading" role="status"><LoaderCircle size={18} className="spin"/>正在读取评论…</div>:items.length?<div className="comment-list">{items.map(comment=><article className="comment-card" key={comment.id}>
   <div className="comment-header"><CommunityAuthor id={comment.owner_id} name={comment.author} url={own(comment)?s.avatarUrl||comment.avatar_url:comment.avatar_url} meta={new Date(comment.created_at).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}/>
    {own(comment)&&<div className="comment-actions"><button className="icon-button" aria-label="编辑我的评论" disabled={pending} onClick={()=>{setEditing(comment.id);setEditBody(comment.body);setError("");}}><Pencil size={14}/></button><button className="icon-button" aria-label="删除我的评论" disabled={pending} onClick={()=>{setDeleting(comment);setError("");}}><Trash2 size={14}/></button></div>}
   </div>
   {editing===comment.id&&own(comment)?<form className="comment-edit" onSubmit={async e=>{e.preventDefault();setPending(true);setError("");try{await s.editComment(comment,editBody);setEditing(null);refreshComments();}catch(e){setError((e as Error).message);}finally{setPending(false);}}}>
    <textarea aria-label="修改评论内容" required maxLength={1500} value={editBody} onChange={e=>setEditBody(e.target.value)}/><div className="comment-form-actions"><button className="button secondary" type="button" disabled={pending} onClick={()=>setEditing(null)}>取消</button><button className="button soft" disabled={pending||!editBody.trim()}>{pending?"保存中…":"保存修改"}</button></div>
   </form>:<p className="comment-body">{comment.body}</p>}
  </article>)}</div>:!error&&<p className="comments-empty">还没有评论。留下一句话，认识一起出发的伙伴。</p>}
  {pages>1&&<nav className="comment-pagination" aria-label="评论翻页"><button className="button secondary" disabled={loading||page===1} onClick={()=>setPage(x=>x-1)}>上一页</button><span>第 {page} / {pages} 页 · 最新评论在前</span><button className="button secondary" disabled={loading||page===pages} onClick={()=>setPage(x=>x+1)}>下一页</button></nav>}
  {s.connected&&!s.user?<div className="comment-sign-in"><p>登录后，就可以参与讨论和组队。</p><button className="button soft" onClick={onSignIn}>登录后评论</button></div>:<form className="comment-compose" onSubmit={async e=>{
   e.preventDefault();setPending(true);setError("");try{await s.addComment(postId,draft);setDraft("");setPage(1);refreshComments();}catch(e){setError((e as Error).message);}finally{setPending(false);}
  }}><label htmlFor={"comment-"+postId}>写下你的评论</label><textarea id={"comment-"+postId} value={draft} onChange={e=>setDraft(e.target.value)} required maxLength={1500} placeholder="交流想法、介绍自己的技能，或者约定一起组队。"/><div className="comment-form-actions"><small>{draft.length} / 1500</small><button className="button primary" disabled={pending||!draft.trim()}>{pending?"提交中…":"发表评论"}</button></div></form>}
  <Modal open={!!deleting} onOpenChange={()=>{if(!pending)setDeleting(null);}} title="删除这条评论？"><p className="muted">删除后，这条评论不再向其他伙伴展示。</p>{error&&<p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="button secondary" disabled={pending} onClick={()=>setDeleting(null)}>保留评论</button><button className="button danger" disabled={pending} onClick={async()=>{
   if(!deleting)return;setPending(true);setError("");try{await s.deleteComment(deleting);setDeleting(null);if(editing===deleting.id)setEditing(null);refreshComments();}catch(e){setError((e as Error).message);}finally{setPending(false);}
  }}>{pending?"删除中…":"确认删除"}</button></div></Modal>
 </section>;
}
