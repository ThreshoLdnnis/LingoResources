"use client";
import {I18nRegion} from "./i18n";


import { useEffect, useRef } from "react";
import { createOrbitScene } from "@/lib/orbit-scene";

export function ExplorationOrbit(){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const element=host.current,target=canvas.current;if(!element||!target)return;
    let scene:ReturnType<typeof createOrbitScene>;
    try{scene=createOrbitScene(target);}catch{element.dataset.renderer="fallback";return;}
    element.dataset.renderer="webgl";
    const motion=matchMedia("(prefers-reduced-motion: reduce)");
    let frame=0,visible=false,previous=0,elapsed=0,disposed=false,available=true;
    function render(now:number){frame=0;if(disposed||!available||!visible||document.hidden)return;if(previous&&now-previous<32&&!motion.matches){frame=requestAnimationFrame(render);return;}if(previous)elapsed+=Math.min((now-previous)/1000,.08);previous=now;scene.draw(elapsed);if(!motion.matches)frame=requestAnimationFrame(render);}
    function update(){cancelAnimationFrame(frame);frame=0;previous=0;element!.dataset.active=String(visible&&available&&!document.hidden&&!motion.matches);if(visible&&available&&!document.hidden)frame=requestAnimationFrame(render);}
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:.05});
    const resize=new ResizeObserver(()=>scene.draw(elapsed));observer.observe(element);resize.observe(target);
    const lost=(event:Event)=>{event.preventDefault();available=false;cancelAnimationFrame(frame);element.dataset.renderer="fallback";element.dataset.active="false";};
    target.addEventListener("webglcontextlost",lost);document.addEventListener("visibilitychange",update);motion.addEventListener("change",update);scene.draw(0);
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();target.removeEventListener("webglcontextlost",lost);document.removeEventListener("visibilitychange",update);motion.removeEventListener("change",update);scene.dispose();};
  },[]);
  return <I18nRegion><div className="intro-manifesto-art intro-orbit-model" ref={host} data-renderer="fallback" role="img" aria-label="探索轨道：宇宙紫与宇宙蓝立体双环交错转动，星点沿轨道运行，中央金黄色四角星柔和闪烁，下方是蓝紫色底座">
    <div className="exploration-orbit-shadow"/>
    <canvas ref={canvas} className="exploration-orbit-canvas" aria-hidden="true"/>
    <div className="exploration-orbit-fallback" aria-hidden="true"><i/><i/><b/><span/></div>
  </div></I18nRegion>;
}
