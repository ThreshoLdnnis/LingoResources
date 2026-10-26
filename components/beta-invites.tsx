"use client";
import {I18nRegion,useI18n} from "./i18n";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, RefreshCw, Ticket } from "lucide-react";
import { useGrowth } from "@/lib/store";
import { Modal } from "./platform";
import { Pagination, usePagination } from "./pagination";

type Invite={id:string;code_hint:string;code:string|null;label:string;expires_at:string;enabled:boolean;used_at:string|null;created_at:string};
const date=(value:string)=>new Date(value).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:false});
function status(i:Invite){return i.used_at?"已使用":!i.enabled?"已停用":new Date(i.expires_at).getTime()<=Date.now()?"已过期":"待使用";}

async function copyText(text:string){
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{if(!navigator.clipboard)throw new Error("Clipboard unavailable");await Promise.race([navigator.clipboard.writeText(text),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error("Clipboard timeout")),1500)})]);}
 catch{
  const field=document.createElement("textarea"),focused=document.activeElement as HTMLElement|null;
  field.value=text;field.readOnly=true;field.style.cssText="position:fixed;left:0;top:0;opacity:0;pointer-events:none";(focused?.closest('[role="dialog"]')||document.body).appendChild(field);field.select();field.setSelectionRange(0,text.length);
  let copied=false;try{copied=document.execCommand("copy");}finally{field.remove();focused?.focus({preventScroll:true});}
  if(!copied)throw new Error("Clipboard permission required");
 }finally{if(timeout)clearTimeout(timeout);}
}

export function BetaInvites(){
 const s=useGrowth();const {t}=useI18n();
 const [invites,setInvites]=useState<Invite[]>([]),[showCodes,setShowCodes]=useState(false),[history,setHistory]=useState(false);
 const [pending,setPending]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [copied,setCopied]=useState(""),[copyError,setCopyError]=useState("");
 const activeAccount=useRef(s.user?.id);activeAccount.current=s.user?.id;
 const requestVersion=useRef(0);
 useEffect(()=>{setInvites([]);setShowCodes(false);setHistory(false);setCopied("");setCopyError("");requestVersion.current++;},[s.user?.id]);
 useEffect(()=>{if(copied){const timer=setTimeout(()=>setCopied(""),2500);return()=>clearTimeout(timer)}},[copied]);
 async function reload(){
  const version=++requestVersion.current,account=s.user?.id;setLoading(true);setError("");
  try{const r=await s.client!.rpc("list_beta_invites_v2");if(r.error)throw r.error;if(account===activeAccount.current&&version===requestVersion.current)setInvites(r.data||[]);}
  catch(e){if(account===activeAccount.current&&version===requestVersion.current)setError((e as Error).message);}
  finally{if(account===activeAccount.current&&version===requestVersion.current)setLoading(false);}
 }
 useEffect(()=>{if(s.client&&s.isAdmin)void reload();else setLoading(false);return()=>{requestVersion.current++}},[s.client,s.isAdmin,s.user?.id]);
 const current=invites.filter(i=>i.code),available=current.filter(i=>status(i)==="待使用"),archive=invites.filter(i=>!i.code);
 const rows=history?archive:current,paging=usePagination(rows,20,String(history)+s.user?.id);
 async function copyCodes(item?:Invite){
  setCopyError("");const text=item?.code||available.map(i=>i.code).join("\n");if(!text||item&&status(item)!=="待使用")return;
  try{await copyText(text);setCopied(item?.id||"all");s.notify(item?"已复制 8 位内测码":"已复制 "+available.length+" 个可用码，一行一个");}
  catch{setCopyError("浏览器未允许自动复制，请手动选择复制，或导出 CSV。");setShowCodes(true);}
 }
 async function toggle(i:Invite){
  const account=s.user?.id;setPending(true);setError("");
  try{const r=await s.client!.rpc("set_beta_invite_enabled",{invite_id:i.id,invite_enabled:!i.enabled});if(r.error)throw r.error;if(account!==activeAccount.current)return;await reload();s.notify(i.enabled?"内测码已停用":"内测码已恢复");}
  catch(e){if(account===activeAccount.current)setError((e as Error).message);}finally{setPending(false);}
 }
 function download(){
  const csv="\uFEFF"+t("内测码,有效期（北京时间）")+"\r\n"+available.map(i=>i.code+","+date(i.expires_at)).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download=t("翎语-8位内测码-"+new Date().toISOString().slice(0,10)+".csv");a.click();URL.revokeObjectURL(url);
 }
 return <I18nRegion><section className="beta-manager" aria-label="内测邀请管理">
  <div className="beta-manager-heading"><div><h2><Ticket size={22}/>内测邀请</h2><p>固定批次 · 8 位数字 · 每码一个新账号。账户创建后仍需确认邮箱。</p></div><button className="button secondary" disabled={loading||pending||!s.connected} onClick={()=>void reload()}><RefreshCw size={15}/>刷新</button></div>
  {!s.connected?<p>连接正式数据库并登录管理员账号后，可查看和复制内测码。</p>:<>
   <div className="beta-copy-batch"><div><strong><Ticket size={18}/>本批 {current.length} 个内测码 · 可用 {available.length} 个</strong><p>完整码已安全保存在后台，刷新后仍可复制。刷新和复制均不会生成新码。</p></div><div className="beta-copy-actions"><button type="button" className="button primary" disabled={loading||!available.length} onClick={()=>void copyCodes()}>{copied==="all"?<Check size={16}/>:<Copy size={16}/>}<span>{copied==="all"?"已复制全部":"复制全部可用码"}</span></button><button type="button" className="button secondary" disabled={!available.length} onClick={()=>setShowCodes(true)}>查看完整清单</button><button type="button" className="button secondary" disabled={!available.length} onClick={download}><Download size={16}/>导出 CSV</button></div></div>
   <p className="beta-hint-note"><Ticket size={15}/><span>已使用表示账户已创建；如果同学还未登录成功，请先查收确认邮件，再用原邮箱和密码登录，无需分发新码。</span></p>
   <div className="beta-batch-tabs" role="group" aria-label="内测码批次"><button type="button" className={"button "+(!history?"soft":"secondary")} aria-pressed={!history} onClick={()=>setHistory(false)}>当前批次 {current.length}</button><button type="button" className={"button "+(history?"soft":"secondary")} aria-pressed={history} onClick={()=>setHistory(true)}>已归档旧码 {archive.length}</button></div>
   {copyError&&!showCodes&&<p className="form-error" role="alert">{copyError}</p>}{error&&<p className="form-error" role="alert">{error}</p>}
   <div className="invite-summary"><span>{history?"旧码已全部停用，保留历史记录":"待使用 "+available.length}</span>{!history&&<><span>已使用 {current.filter(i=>i.used_at).length}</span><span>已停用 {current.filter(i=>!i.used_at&&!i.enabled).length}</span></>}</div>
   <div ref={paging.anchor} tabIndex={-1} className="pagination-anchor">{loading?<p role="status">正在读取内测邀请…</p>:!rows.length?<div className="empty-state"><Ticket size={32}/><h3>暂无内测码</h3><p>刷新只读取已存在的内测码，不会自动生成。</p></div>:<div className="table-wrap"><table className="content-table"><thead><tr><th>{history?"历史标识（已停用）":"8 位内测码"}</th><th>批次</th><th>状态</th><th>有效期（北京时间）</th><th>操作</th></tr></thead><tbody>{paging.items.map(i=><tr key={i.id}><td><div className="beta-code-cell"><code>{i.code||i.code_hint}</code>{i.code&&<button type="button" className="button secondary" disabled={status(i)!=="待使用"} aria-label={"复制内测码 "+i.code} onClick={()=>void copyCodes(i)}>{copied===i.id?<Check size={14}/>:<Copy size={14}/>}<span>{copied===i.id?"已复制":"复制此码"}</span></button>}</div></td><td>{i.label}</td><td><span className={"status "+(status(i)==="待使用"?"published":"draft")}>{status(i)}</span>{i.used_at&&<small>账户已创建 · {date(i.used_at)}</small>}</td><td>{date(i.expires_at)}</td><td>{!i.code?<span>已归档</span>:<button type="button" className="button secondary" disabled={pending||!!i.used_at||new Date(i.expires_at).getTime()<=Date.now()} onClick={()=>void toggle(i)}>{i.used_at?"已兑换":i.enabled?"停用":"恢复"}</button>}</td></tr>)}</tbody></table></div>}<Pagination paging={paging} label="内测邀请"/></div>
  </>}
  <Modal open={showCodes} onOpenChange={setShowCodes} title="复制可用内测码" wide><div className="beta-callout"><p>共 {available.length} 个可用的 8 位数字码，一人一个。已使用或停用的码会自动排除，刷新后可再次查看。</p></div><div className="beta-modal-copy-heading"><span>完整码 · 可直接用于注册</span><button type="button" className="button primary" disabled={!available.length} onClick={()=>void copyCodes()}><Copy size={16}/>{copied==="all"?"已复制全部":"复制全部可用码"}</button></div>{copyError&&<p className="form-error" role="alert">{copyError}</p>}<details className="beta-manual-copy" open><summary>全部可用码（一行一个）</summary><textarea className="invite-code-list" aria-label="全部可用的 8 位内测码" rows={10} readOnly value={available.map(i=>i.code).join("\n")}/></details><div className="dialog-actions"><button type="button" className="button secondary" disabled={!available.length} onClick={download}><Download size={16}/>导出 CSV</button><button type="button" className="button secondary" onClick={()=>setShowCodes(false)}>返回管理页</button></div></Modal>
 </section></I18nRegion>;
}
