"use client";
import {I18nRegion,LanguageToggle} from "./i18n";

import { useEffect, useRef, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LogOut, MailCheck, Ticket, X } from "lucide-react";
import { useGrowth } from "@/lib/store";
import { authErrorMessage, inviteInputError, normalizeInviteCode, signupOutcome } from "@/lib/auth-rules.mjs";

export function AuthDialog({open,onOpenChange,initialMode="login",onAuthenticated}:{open:boolean;onOpenChange:(open:boolean)=>void;initialMode?:"login"|"signup";onAuthenticated?:()=>void}){
 const s=useGrowth(),[mode,setMode]=useState<"login"|"signup">("login");
 const [pending,setPending]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[emailToConfirm,setEmailToConfirm]=useState(""),[cooldown,setCooldown]=useState(0);
 const submitting=useRef(false);
 useEffect(()=>{if(open){setMode(initialMode);setError("");setNotice("");setEmailToConfirm("");}},[open,initialMode]);
 useEffect(()=>{if(cooldown>0){const timer=setTimeout(()=>setCooldown(n=>Math.max(0,n-1)),1000);return()=>clearTimeout(timer)}},[cooldown]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(submitting.current)return;submitting.current=true;setPending(true);setError("");setNotice("");
  const f=new FormData(e.currentTarget),email=String(f.get("email")||"").trim(),password=String(f.get("password")||""),invite=normalizeInviteCode(f.get("invite"));
  try{
   if(mode==="signup"&&inviteInputError(invite))throw new Error(inviteInputError(invite));
   const result=mode==="login"?await s.client!.auth.signInWithPassword({email,password}):await s.client!.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+"/explore/",data:{beta_invite_code:invite}}});
   if(result.error)throw result.error;
   const outcome=mode==="signup"?signupOutcome(result.data):"signed-in";
   if(outcome==="check-email"){setEmailToConfirm(email);setCooldown(60);setNotice("账户已创建，内测码已成功兑换。请确认邮箱后登录，无需再次注册。");}
   else if(outcome==="existing"){setMode("login");setNotice("该邮箱可能已经注册。请使用原邮箱和密码登录，无需更换内测码。");}
   else{await s.reload();onOpenChange(false);s.notify("欢迎来到翎语");onAuthenticated?.();}
  }catch(e){const failure=e as {message?:string;code?:string};setError(authErrorMessage(failure));if(failure.code==="email_not_confirmed"||/email not confirmed/i.test(failure.message||"")){setEmailToConfirm(email);setCooldown(0);}}
  finally{submitting.current=false;setPending(false);}
 }
 async function resend(){
  if(submitting.current||cooldown>0)return;submitting.current=true;setPending(true);setError("");setCooldown(60);
  try{const r=await s.client!.auth.resend({type:"signup",email:emailToConfirm,options:{emailRedirectTo:window.location.origin+"/explore/"}});if(r.error)throw r.error;setNotice("确认邮件已重新发送，请查看收件箱和垃圾邮件文件夹。确认后用原邮箱登录。");}
  catch(e){setError(authErrorMessage(e as {message?:string;code?:string}));}finally{submitting.current=false;setPending(false);}
 }
 const title=s.user?"账户管理":emailToConfirm?"还差一步：确认邮箱":mode==="login"?"欢迎回到翎语":"受邀加入翎语";
 return <I18nRegion><Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="modal-overlay"/><Dialog.Content className="modal-content" aria-describedby={undefined}>
  <div className="modal-top"><Dialog.Title>{title}</Dialog.Title><LanguageToggle/><Dialog.Close className="icon-button" aria-label="关闭窗口"><X size={20}/></Dialog.Close></div>
  {s.user?<><p translate="no">当前登录：{s.user.email}</p><button className="button secondary" onClick={async()=>{const r=await s.client?.auth.signOut();if(r?.error){s.notify(r.error.message);return;}onOpenChange(false);s.notify("已退出登录");}}><LogOut size={17}/>退出登录</button></>:!s.connected?<div className="empty-state"><Ticket size={32}/><h3>登录服务暂不可用</h3><p>请稍后重试或联系运营，登录后即可进入平台。</p><button className="button primary" onClick={()=>onOpenChange(false)}>返回</button></div>:emailToConfirm?<div className="auth-confirmation form-stack"><MailCheck size={34}/><strong>{emailToConfirm}</strong>{notice&&<p className="auth-notice" role="status">{notice}</p>}<p>请点击邮件里的确认链接。收件箱没有时，也请检查垃圾邮件；这一步不需要新的内测码。</p>{error&&<p className="form-error" role="alert">{error}</p>}<button type="button" className="button secondary" disabled={pending||cooldown>0} onClick={()=>void resend()}>{pending?"正在发送…":cooldown>0?cooldown+" 秒后可重发":"没收到邮件？重新发送"}</button><button type="button" className="button primary" disabled={pending} onClick={()=>{setEmailToConfirm("");setMode("login");setError("");setNotice("确认邮箱后，请用原邮箱和密码登录。");}}>我已确认，返回登录</button></div>:<form className="form-stack" onSubmit={submit}>
   {mode==="signup"&&<div className="beta-callout"><span><Ticket size={16}/>邀请内测</span><p>填写邮箱、密码与 8 位数字内测码。注册后请确认邮箱；每个码限创建一个账号。</p></div>}
   <label>邮箱<input name="email" type="email" autoComplete="email" disabled={pending} required/></label>
   <label>密码<input name="password" type="password" minLength={8} autoComplete={mode==="login"?"current-password":"new-password"} disabled={pending} required/><small className="field-help">至少 8 位</small></label>
   {mode==="signup"&&<label>内测码<input name="invite" type="text" inputMode="numeric" placeholder="输入 8 位数字内测码" autoComplete="off" spellCheck={false} maxLength={32} disabled={pending} required/><small className="field-help">仅首次注册需要。旧版长码已停用，请使用邀请人提供的新码。</small></label>}
   {error&&<p className="form-error" role="alert">{error}</p>}{notice&&<p className="auth-notice" role="status">{notice}</p>}
   <button className="button primary" disabled={pending}>{pending?"正在处理…":mode==="login"?"登录":"使用内测码注册"}</button>
   <button type="button" className="text-button" disabled={pending} onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");setNotice("");setEmailToConfirm("");}}>{mode==="login"?"有内测码？受邀加入":"已有账号？返回登录"}</button>
  </form>}
 </Dialog.Content></Dialog.Portal></Dialog.Root></I18nRegion>;
}
