"use client";
import {I18nRegion} from "./i18n";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, SlidersHorizontal, RotateCcw, Compass, ArrowUpRight, BookOpen, Wrench, Flag } from "lucide-react";
import { Platform, Reveal, ResourceCard, ResourceDetail, Modal } from "./platform";
import { Pagination, usePagination } from "./pagination";
import { useGrowth } from "@/lib/store";
import type { Resource } from "@/lib/data";
import { domesticCities, internationalCities, discoveryInterests, filterResources, recommendResources, understandRequest, type MatchPreferences } from "@/lib/matching.mjs";

const goals = [["internship","找到一份实习","积累职业经历"],["competition","参加一次比赛","让想法走向舞台"],["skill","学习一项技能","学会实用工具"],["project","完成一个项目","做出可展示的作品"]];
const goalLabels:Record<string,string>={internship:"寻找实习",competition:"参加赛事",skill:"学习技能",project:"完成作品"};
const examples=["零基础，想学 AI 做作品集，优先线上资源","想在深圳参加编程比赛，30天内报名","想用免费工具做 PPT 和图表"];
const initialDraft=():MatchPreferences=>({text:"",goal:"auto",tags:[],location:"auto",level:"auto",horizon:"auto",price:"auto",includeOnline:true,personalize:true});

function CityOptions({auto=false}:{auto?:boolean}) {
  return <I18nRegion><>{auto&&<option value="auto">从需求中自动识别</option>}<option>全部</option><option>线上</option><option>远程</option><optgroup label="国内城市">{domesticCities.map(city=><option key={city}>{city}</option>)}</optgroup><optgroup label="海外城市">{internationalCities.map(city=><option key={city}>{city}</option>)}</optgroup></></I18nRegion>;
}

export default function Discover() {
  const s=useGrowth();
  const [query,setQuery]=useState(""),[kind,setKind]=useState("all"),[location,setLocation]=useState("全部"),[sort,setSort]=useState("featured");
  const [selected,setSelected]=useState<Resource|null>(null),[match,setMatch]=useState(false);
  const [draft,setDraft]=useState<MatchPreferences>(initialDraft),[applied,setApplied]=useState<MatchPreferences|null>(null);
  const account=useRef(s.user?.id);
  useEffect(()=>{
    const p=new URLSearchParams(window.location.search);
    if(p.get("match")==="1")setMatch(true);
    if(p.get("q"))setQuery(p.get("q")!);
  },[]);
  useEffect(()=>{
    if(account.current!==s.user?.id){account.current=s.user?.id;setApplied(null);setDraft(initialDraft());setSort("featured");}
  },[s.user?.id]);
  const intent=useMemo(()=>understandRequest(draft.text||""),[draft.text]);
  const result=useMemo(()=>{
    if(!applied)return null;
    const personalize=applied.personalize&&!!s.user;
    const savedTags=personalize?s.resources.filter(r=>s.favorites.includes(r.id)).flatMap(r=>r.tags):[];
    return recommendResources(s.resources,applied,{interests:personalize?[...new Set([...s.profile.interests,...savedTags])].slice(0,10):[],favorites:personalize?s.favorites:[],completed:personalize?s.completed:[]});
  },[applied,s.resources,s.user?.id,s.profile.interests,s.favorites,s.completed]);
  const shown=useMemo(()=>filterResources(s.resources,query,kind,location,sort),[s.resources,query,kind,location,sort]);
  const ranked=useMemo(()=>{
    if(!result)return [];
    const allowed=new Set(shown.map(r=>r.id));
    if(sort==="smart")return result.rows.filter(r=>allowed.has(r.resource.id));
    const found=new Map(result.rows.map(r=>[r.resource.id,r]));
    return shown.flatMap(r=>found.has(r.id)?[found.get(r.id)!]:[]);
  },[result,shown,sort]);
  const recommendations=new Map(ranked.map(r=>[r.resource.id,r]));
  const paging=usePagination(result?ranked.map(r=>r.resource):shown,12,JSON.stringify([query,kind,location,sort,applied]));
  useEffect(()=>{
    const context=(document as unknown as {modelContext?:{registerTool:(tool:Record<string,unknown>,options:{signal:AbortSignal})=>unknown}}).modelContext;
    if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    try{void Promise.resolve(context.registerTool({name:"search_growth_resources",title:"搜索站内资源",description:"按关键词和类型筛选机会发现页面，返回站内已发布资源。",inputSchema:{type:"object",properties:{query:{type:"string"},kind:{type:"string",enum:["all","competition","internship","course","tool","project"]}},required:["query"],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async(input:unknown)=>{
      const x=input as {query?:unknown;kind?:unknown};
      if(!x||typeof x.query!=="string"||Object.keys(x).some(k=>!["query","kind"].includes(k))||x.kind!==undefined&&!["all","competition","internship","course","tool","project"].includes(String(x.kind)))throw new Error("Invalid search input");
      const type=String(x.kind||"all");setQuery(x.query);setKind(type);setLocation("全部");setApplied(null);setSort("featured");
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      return {resources:filterResources(s.resources,x.query,type,"全部","featured").map(r=>({id:r.id,title:r.title,kind:r.kind}))};
    }},{signal:lifecycle.signal})).catch(()=>{})}catch{}
    return()=>lifecycle.abort();
  },[s.resources]);
  function reset(){setQuery("");setKind("all");setLocation("全部");setSort("featured");setApplied(null);}
  function update(p:Partial<MatchPreferences>){setDraft(d=>({...d,...p}));}
  const effectiveGoal=draft.goal==="auto"?intent.goal||"skill":draft.goal;
  const effectiveCity=draft.location==="auto"?intent.location||"全部":draft.location;
  const total=result?ranked.length:shown.length;
  const hasTarget=result&&["internship","competition","project"].includes(result.preferences.goal)&&result.rows.some(r=>r.resource.kind===result.preferences.goal);
  return <I18nRegion><Platform page="discover">
    <Reveal className="page-heading"><div><span className="eyebrow">EXPLORE YOUR POSSIBILITIES</span><h1>机会藏在这里，下一步由你决定。</h1><p>赛事、实习、工具与项目，把信息差变成你的成长空间。</p></div><button className="button soft" onClick={()=>setMatch(true)}><Sparkles size={17}/>智能发现</button></Reveal>
    {result&&<Reveal className="smart-result-panel">
      <div className="smart-result-heading"><div className="smart-result-icon"><Sparkles size={23}/></div><div><span className="eyebrow">YOUR NEXT MOVE</span><h2>从目标出发，找到下一步。</h2><p>{applied?.text||"为这次成长挑选合适的资源"}</p></div><div className="smart-result-actions"><button className="button secondary" onClick={()=>setMatch(true)}>调整需求</button><button className="text-link" onClick={reset}>退出推荐</button></div></div>
      <div className="smart-active-filters" aria-label="当前推荐条件"><span>{goalLabels[result.preferences.goal]}</span><span>{result.preferences.location==="全部"?"不限地点":result.preferences.location+(applied?.includeOnline&&!['线上','远程'].includes(result.preferences.location)?" + 线上":"")}</span>{result.preferences.tags.map(t=><span key={t}>{t}</span>)}{result.intent.keywords.map(t=><span key={"keyword-"+t}>{t}</span>)}{result.preferences.level!=="any"&&<span>{result.preferences.level==="beginner"?"入门起步":"进阶提升"}</span>}{result.preferences.horizon!=="any"&&<span>机会截止 {result.preferences.horizon} 天内</span>}{result.preferences.freeOnly&&<span>已注明免费 / 开源</span>}</div>
      <div className="smart-path">{result.path.map((step,i)=>{const Icon=[BookOpen,Wrench,Flag][i];return <article className={"smart-path-step "+(!step.match?"unavailable":"")} key={step.title}><div className="smart-step-top"><span>0{i+1}</span><Icon size={18}/></div><h3>{step.title}</h3>{step.match?<button onClick={()=>setSelected(step.match!.resource)} translate="no">{step.match.resource.title}<ArrowUpRight size={16}/></button>:<p>还没有符合条件的{["课程","工具","实践资源"][i]}，可以调整需求或稍后再看。</p>}</article>})}</div>
      <p className="smart-result-footnote">{result.excluded.expired>0?`已避开 ${result.excluded.expired} 项已截止机会。`:"优先推荐仍可参与的机会。"} 具体要求和截止时间以官方信息为准。</p>
      {!hasTarget&&["internship","competition","project"].includes(result.preferences.goal)&&<p className="smart-gap-note">暂时没有符合这些条件的{goalLabels[result.preferences.goal]==="寻找实习"?"实习":result.preferences.goal==="competition"?"赛事":"项目"}，可先从下方学习与工具资源做准备。</p>}
    </Reveal>}
    <div ref={paging.anchor} tabIndex={-1} className="pagination-anchor">
      <Reveal className="discovery-toolbar"><div className="search-field"><Search size={18}/><input aria-label="搜索全部资源" value={query} onChange={e=>setQuery(e.target.value)} placeholder={result?"在推荐结果中继续搜索":"搜索关键词、方向或组织名称"}/>{query&&<button className="icon-button" aria-label="清除搜索" onClick={()=>setQuery("")}><RotateCcw size={16}/></button>}</div><label><SlidersHorizontal size={16}/><select aria-label="按地点筛选" value={location} onChange={e=>setLocation(e.target.value)}><CityOptions/></select></label><select aria-label="排序方式" value={sort} onChange={e=>setSort(e.target.value)}>{result&&<option value="smart">匹配优先</option>}<option value="featured">精选优先</option><option value="deadline">截止日期优先</option></select></Reveal>
      <div className="filter-row"><div className="segmented">{[["all","全部资源"],["competition","赛事活动"],["internship","工作实习"],["tool","工具库"],["course","课程"],["project","项目"]].map(([v,t])=><button key={v} className={kind===v?"selected":""} onClick={()=>setKind(v)}>{kind===v&&<motion.span layoutId="discover-filter" className="segment-highlight"/>}<span>{t}</span></button>)}</div><span className="results-count" role="status">{total} 个{result?"推荐":""}资源</span></div>
      {total?<div className="resource-grid">{paging.items.map(r=><ResourceCard key={r.id} resource={r} open={setSelected} recommendation={recommendations.get(r.id)}/>)}</div>:<div className="empty-state"><Compass size={35}/><h3>{result?"还没有同时满足这些条件的资源":"这里暂时没有匹配的资源"}</h3><p>{result?"试试不限城市、扩大报名时间，或减少兴趣条件。我们会在现有资源中重新匹配。":"减少筛选条件，或试试「设计」「AI」「作品集」。"}</p><button className="button secondary" onClick={result?()=>setMatch(true):reset}>{result?"调整推荐条件":"清除全部筛选"}</button>{result&&<button className="text-link" onClick={reset}>浏览全部资源</button>}</div>}
      <Pagination paging={paging} label="机会发现"/>
    </div>
    <ResourceDetail resource={selected} onClose={()=>setSelected(null)}/>
    <Modal open={match} onOpenChange={setMatch} title="告诉我，你想走向哪里" wide>
      <p className="muted smart-intro">说出目标和限制，我们一起找一条能开始的成长路径。</p>
      <form className="form-stack smart-match-form" onSubmit={e=>{e.preventDefault();setApplied({...draft,tags:[...(draft.tags||[])]});setKind("all");setQuery("");setLocation("全部");setSort("smart");setMatch(false);}}>
        <label className="smart-request-label">用一句话描述你的想法<textarea aria-label="我的成长需求" value={draft.text} maxLength={600} rows={3} onChange={e=>update({text:e.target.value})} placeholder="例如：我零基础，想在深圳参加编程比赛，优先最近一个月还能报名的活动。"/><span className="smart-input-count">{draft.text?.length||0} / 600</span></label>
        <div className="smart-examples" aria-label="试试这些需求">{examples.map(t=><button type="button" key={t} onClick={()=>setDraft({...initialDraft(),text:t})}>{t}<ArrowUpRight size={12}/></button>)}</div>
        {!!draft.text&&<div className="smart-understood" role="status"><Sparkles size={15}/><div><strong>已识别</strong><div className="smart-understood-tags">{intent.goal&&<span>{goalLabels[intent.goal]}</span>}{intent.tags.map(t=><span key={t}>{t}</span>)}{intent.location&&<span>{intent.location}</span>}{intent.level&&<span>{intent.level==="beginner"?"零基础 / 入门":"进阶"}</span>}{intent.horizon&&<span>{intent.horizon} 天内报名</span>}{intent.freeOnly&&<span>免费 / 开源</span>}{intent.excluded.map(t=><span key={t}>不关注：{t}</span>)}{!intent.goal&&!intent.tags.length&&!intent.location&&<span>可以补充方向或使用下面的选项</span>}</div>{intent.cities.length>1&&<small>识别到多个城市，当前使用 {intent.location}；可在地点选项中调整。</small>}</div></div>}
        <fieldset><legend className="smart-goal-legend"><span>这一次，你想先做什么？</span><button type="button" className="text-link" onClick={()=>update({goal:"auto"})} aria-pressed={draft.goal==="auto"}>自动识别{draft.goal==="auto"?" ✓":""}</button></legend><div className="goal-grid">{goals.map(([v,t,d])=><label className={effectiveGoal===v?"goal selected":"goal"} key={v}><input type="radio" name="goal" checked={effectiveGoal===v} onChange={()=>update({goal:v})} value={v}/><span><strong>{t}</strong><small>{d}</small></span></label>)}</div></fieldset>
        <fieldset><legend>补充兴趣方向（可选）</legend><div className="interest-options">{discoveryInterests.map(t=><button type="button" key={t} aria-pressed={draft.tags?.includes(t)} className={draft.tags?.includes(t)?"chosen":""} onClick={()=>update({tags:draft.tags?.includes(t)?draft.tags.filter(i=>i!==t):[...(draft.tags||[]),t]})}>{t}</button>)}</div></fieldset>
        <details className="smart-preferences"><summary><SlidersHorizontal size={16}/>地点、基础与报名偏好<span>可覆盖自动识别</span></summary><div className="smart-preference-fields"><label>希望在哪里？<select aria-label="推荐地点" value={draft.location} onChange={e=>update({location:e.target.value})}><CityOptions auto/></select></label><label>当前基础<select aria-label="当前基础" value={draft.level} onChange={e=>update({level:e.target.value})}><option value="auto">从需求中自动识别</option><option value="any">不限基础</option><option value="beginner">零基础 / 入门起步</option><option value="advanced">已有基础 / 进阶提升</option></select></label><label>机会的截止时间<select aria-label="报名时间范围" value={draft.horizon} onChange={e=>update({horizon:e.target.value})}><option value="auto">从需求中自动识别</option><option value="any">不限截止时间</option><option value="30">未来 30 天内截止</option><option value="90">未来 90 天内截止</option></select></label><label>费用偏好<select aria-label="费用偏好" value={draft.price} onChange={e=>update({price:e.target.value})}><option value="auto">从需求中自动识别</option><option value="any">不限费用</option><option value="free">仅说明中注明免费 / 开源</option></select></label></div><p className="smart-preference-help">时间范围用于有明确截止日期的赛事、实习和项目；课程与工具可作为准备资源。未注明费用的内容不会被当成免费。</p>{effectiveCity!=="全部"&&!['线上','远程'].includes(effectiveCity||"")&&<label className="smart-check"><input type="checkbox" checked={draft.includeOnline} onChange={e=>update({includeOnline:e.target.checked})}/>同时考虑可在线参与的资源</label>}</details>
        {s.user&&<label className="smart-check"><input type="checkbox" checked={draft.personalize} onChange={e=>update({personalize:e.target.checked})}/>结合我的兴趣、收藏和已完成课程推荐</label>}
        <div className="smart-submit-row"><button className="text-link" type="button" onClick={()=>setDraft(initialDraft())}><RotateCcw size={14}/>清空条件</button><button className="button primary" disabled={s.loading}><Sparkles size={17}/>{s.loading?"资源读取中…":"发现适合我的资源"}</button></div><small className="muted">从本站已发布资源中推荐，每项附推荐理由。自动识别后仍可手动调整。</small>
      </form>
    </Modal>
  </Platform></I18nRegion>;
}
