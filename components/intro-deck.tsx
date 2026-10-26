"use client";
import {I18nRegion} from "./i18n";


import { MemberLink } from "./member-access";
import { useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, BookOpen, Compass, Layers, Users } from "lucide-react";

export const introDoors = [
  {label:"发现机会",title:"下一次出发，\n在这里遇见。",detail:"赛事 · 活动 · 实习",href:"/discover/",icon:Compass,tone:"sky",word:"EXPLORE",note:"下一种可能，正在展开。"},
  {label:"学点新招",title:"从“想学”，\n到“我会了”。",detail:"课程 · 工具 · 成长路线",href:"/learn/",icon:BookOpen,tone:"pink",word:"LEARN",note:"给好奇心，添点装备。"},
  {label:"找到伙伴",title:"一个好点子，\n可以一起实现。",detail:"社区 · 评论 · 赛事组队",href:"/community/",icon:Users,tone:"mint",word:"TOGETHER",note:"和同频的人，一起出发。"},
  {label:"留下作品",title:"做过的事，\n值得被看见。",detail:"项目 · 经历 · 个人名片",href:"/profile/",icon:Layers,tone:"lilac",word:"CREATE",note:"你的成长，自成星系。"},
];

const poses = [
  {x:"0%",y:"0%",z:80,rotateZ:4,rotateY:0,rotateX:1,scale:1,opacity:1},
  {x:"-43%",y:"10%",z:20,rotateZ:-16,rotateY:18,rotateX:0,scale:.84,opacity:1},
  {x:"46%",y:"12%",z:10,rotateZ:16,rotateY:-20,rotateX:0,scale:.81,opacity:1},
  {x:"0%",y:"13%",z:0,rotateZ:0,rotateY:0,rotateX:0,scale:.7,opacity:0},
];

function DeckCard({index,slot,onSelect}:{index:number;slot:number;onSelect:(index:number)=>void}) {
  const item=introDoors[index],front=slot===0,reduce=useReducedMotion();
  const select=useRef<HTMLButtonElement>(null),link=useRef<HTMLAnchorElement>(null);
  // Null starts each arc from the current animated position, including rapid reversals.
  const destination=useMemo(()=>{
    const pose=poses[slot];
    if(reduce)return pose;
    return {...pose,y:[null,front?"-7%":"16%",pose.y],z:[null,front?180:5,pose.z],rotateY:[null,front?-24:slot===1?32:-32,pose.rotateY]};
  },[slot,reduce,front]);
  return <I18nRegion><motion.article className={"intro-swap-card intro-tone-"+item.tone} data-slot={slot} data-card={index}
    initial={false} animate={destination} transition={{duration:reduce?0:.88,ease:[.22,.75,.2,1],times:[0,.45,1]}}
    aria-label={item.label+"卡片"} aria-hidden={slot===3}>
    <div className="intro-card-face" aria-hidden={!front}>
      <div className="intro-deck-top"><item.icon size={22}/><span>{item.detail}</span><ArrowUpRight size={19}/></div>
      <div className="intro-glass-orb" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="M50 3C54 33 67 46 97 50C67 54 54 67 50 97C46 67 33 54 3 50C33 46 46 33 50 3Z" fill="currentColor"/></svg><span>YOU</span></div>
      <h2>{item.title.split('\n').map((line,i)=><span key={i}>{line}</span>)}</h2>
      <MemberLink ref={link} href={item.href} tabIndex={front?0:-1} aria-label={"去看看："+item.label}>去看看<ArrowRight size={18}/></MemberLink>
    </div>
    <div className="intro-card-peek" aria-hidden="true"><span>{item.word}</span><item.icon/><b>{item.label}</b><small>{item.note}</small></div>
    <button ref={select} className="intro-deck-select" aria-label={"将“"+item.label+"”卡片移到前排"} tabIndex={front||slot===3?-1:0} aria-hidden={front||slot===3} onClick={()=>{onSelect(index);requestAnimationFrame(()=>link.current?.focus({preventScroll:true}));}}/>
  </motion.article></I18nRegion>;
}

export function IntroDeck({order,onSelect}:{order:number[];onSelect:(index:number)=>void}) {
  return <I18nRegion><div className="intro-card-stage" role="group" aria-label="点击后排卡片，切换到前排">
    {introDoors.map((item,index)=><DeckCard key={item.label} index={index} slot={order.indexOf(index)} onSelect={onSelect}/>)}
    <p className="intro-deck-status" role="status" aria-live="polite">当前前排：{introDoors[order[0]].label}</p>
  </div></I18nRegion>;
}
