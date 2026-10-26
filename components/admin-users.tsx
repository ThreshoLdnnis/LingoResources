"use client";
import {I18nRegion} from "./i18n";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Search, UsersRound } from "lucide-react";
import { useGrowth } from "@/lib/store";
import { Pagination, usePagination } from "./pagination";

type RegisteredUser={nickname:string;email:string};
export function AdminUsers(){
 const s=useGrowth(),[users,setUsers]=useState<RegisteredUser[]>([]),[query,setQuery]=useState("");
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const activeAccount=useRef(s.user?.id),version=useRef(0);activeAccount.current=s.user?.id;
 async function reload(){
  if(!s.client||!s.isAdmin){setUsers([]);setLoading(false);return;}
  const account=s.user?.id,request=++version.current;setLoading(true);setError("");
  try{const result=await s.client.rpc("list_registered_users");if(result.error)throw result.error;if(account===activeAccount.current&&request===version.current)setUsers(result.data||[]);}
  catch(e){if(account===activeAccount.current&&request===version.current){setUsers([]);setError((e as Error).message);}}
  finally{if(account===activeAccount.current&&request===version.current)setLoading(false);}
 }
 useEffect(()=>{setUsers([]);setQuery("");setError("");void reload();return()=>{version.current++;}},[s.client,s.isAdmin,s.user?.id]);
 const keyword=query.trim().toLocaleLowerCase(),rows=users.filter(u=>u.nickname.toLocaleLowerCase().includes(keyword)||u.email.toLocaleLowerCase().includes(keyword));
 const paging=usePagination(rows,20,query+":"+s.user?.id);
 return <I18nRegion><section className="admin-users" aria-label="已注册用户列表">
  <div className="beta-manager-heading"><div><h2><UsersRound size={22}/>用户列表</h2><p>查看已注册用户的昵称和注册邮箱。</p></div><button type="button" className="button secondary" disabled={loading||!s.connected} onClick={()=>void reload()}><RefreshCw size={15}/>刷新</button></div>
  {!s.connected?<p>使用管理员账号登录后即可查看。</p>:<>
   <div className="discovery-toolbar"><div className="search-field"><Search size={18}/><input type="search" aria-label="搜索用户昵称或注册邮箱" placeholder="搜索昵称或注册邮箱" value={query} onChange={e=>setQuery(e.target.value)}/></div><span className="admin-user-count">共 {users.length} 位用户{keyword?" · 找到 "+rows.length+" 位":""}</span></div>
   {error&&<p className="form-error" role="alert">用户列表读取失败：{error}</p>}
   <div ref={paging.anchor} tabIndex={-1} className="pagination-anchor">{loading?<p role="status">正在读取用户列表…</p>:<div className="table-wrap"><table className="content-table"><thead><tr><th>昵称</th><th>注册邮箱</th></tr></thead><tbody>{paging.items.map((u,index)=><tr key={u.email||index}><td>{u.nickname}</td><td>{u.email||"未绑定邮箱"}</td></tr>)}</tbody></table>{!rows.length&&!error&&<div className="empty-state"><UsersRound size={30}/><p>{keyword?"没有找到匹配的用户":"暂无已注册用户"}</p></div>}</div>}<Pagination paging={paging} label="用户列表"/></div>
  </>}
 </section></I18nRegion>;
}
