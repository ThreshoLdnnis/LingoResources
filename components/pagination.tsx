"use client";
import {I18nRegion} from "./i18n";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageInfo, pageNumbers } from "@/lib/pagination.mjs";

export function usePagination<T>(items:T[], size=12, resetKey="") {
  const [position,setPosition]=useState({key:resetKey,page:1});
  const anchor=useRef<HTMLDivElement>(null);
  const info=pageInfo(items.length,position.key===resetKey?position.page:1,size);
  if(position.key!==resetKey||position.page!==info.page)setPosition({key:resetKey,page:info.page});
  function go(page:number) {
    setPosition({key:resetKey,page:pageInfo(items.length,page,size).page});
    requestAnimationFrame(()=>{
      anchor.current?.focus({preventScroll:true});
      anchor.current?.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
    });
  }
  return {...info,items:items.slice(info.offset,info.offset+size),anchor,go};
}

type Paging=ReturnType<typeof usePagination>;
export function Pagination({paging,label="资源列表"}:{paging:Paging;label?:string}) {
  if(paging.pages<=1)return null;
  return <I18nRegion><nav className="pagination" aria-label={label+"分页"}>
    <p className="pagination-summary" role="status">共 {paging.total} 条 · 第 {paging.start}–{paging.end} 条</p>
    <div className="pagination-controls">
      <button type="button" className="page-arrow" disabled={paging.page===1} aria-label="上一页" onClick={()=>paging.go(paging.page-1)}><ChevronLeft size={16}/><span>上一页</span></button>
      {pageNumbers(paging.page,paging.pages).map((n:number|string)=>typeof n==="number"?<button type="button" className={"page-number "+(n===paging.page?"active":"")} aria-label={"第 "+n+" 页"} aria-current={n===paging.page?"page":undefined} onClick={()=>paging.go(n)} key={n}>{n}</button>:<span className="page-gap" aria-hidden="true" key={n}>…</span>)}
      <button type="button" className="page-arrow" disabled={paging.page===paging.pages} aria-label="下一页" onClick={()=>paging.go(paging.page+1)}><span>下一页</span><ChevronRight size={16}/></button>
    </div>
  </nav></I18nRegion>;
}
