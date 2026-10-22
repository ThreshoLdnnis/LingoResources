"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// Stable coordinates keep server rendering and hydration identical.
const stars=Array.from({length:78},(_,i)=>({
  left:((i*47.37+11.3)%100).toFixed(2)+"%",
  top:((i*31.79+7.1)%100).toFixed(2)+"%",
  size:(i%11===0?2: .7+(i%5)*.22)+"px",
  sparkle:i%4===0,
  sparkleSize:(i%12===0?13:8+(i%3)*2)+"px",
  duration:(3.8+(i%9)*.7)+"s",
  delay:-(i*1.37%10)+"s",
}));

export function CosmicBackdrop(){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const element=ref.current;
    if(!element)return;
    let visible=false;
    const update=()=>{element.dataset.active=String(visible&&!document.hidden);};
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:.05});
    observer.observe(element);document.addEventListener("visibilitychange",update);
    return()=>{observer.disconnect();document.removeEventListener("visibilitychange",update);};
  },[]);
  return <div className="intro-cosmos" ref={ref} aria-hidden="true" data-active="false">
    <div className="intro-cosmic-glow"/>
    <div className="intro-cosmic-beam"/>
    <div className="intro-cosmic-horizon"/>
    <div className="intro-starfield">{stars.map((star,i)=><i className={"intro-star"+(star.sparkle?" intro-star-sparkle":"")} key={i} style={{left:star.left,top:star.top,width:star.sparkle?star.sparkleSize:star.size,height:star.sparkle?star.sparkleSize:star.size,"--star-duration":star.duration,"--star-delay":star.delay} as CSSProperties}/>)}</div>
    <span className="intro-cosmic-caption">GO BEYOND<br/>WHAT YOU KNOW.</span>
  </div>;
}
