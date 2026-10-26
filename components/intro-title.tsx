"use client";
import {I18nRegion} from "./i18n";


import { useEffect, useRef, type ReactNode } from "react";

type Dot = { homeX:number;homeY:number;x:number;y:number;vx:number;vy:number;heat:number;color:string };

/** Sample the rendered text runs so line breaks, tracking and both ink colors
 * stay aligned with the semantic heading at every responsive size. */
export function ParticleHeading({as:Heading="h1",id,effect="standard",children}:{as?:"h1"|"h2";id:string;effect?:"standard"|"vivid";children:ReactNode}) {
  const titleRef=useRef<HTMLHeadingElement>(null),canvasRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const title=titleRef.current,canvas=canvasRef.current;
    if(!title||!canvas)return;
    const context=canvas.getContext("2d");
    if(!context)return;
    const motion=matchMedia("(prefers-reduced-motion: reduce)");
    const vivid=effect==="vivid";
    const pointer={x:0,y:0,active:false};
    let dots:Dot[]=[],width=0,height=0,frame=0,previous=0,quiet=0;
    let visible=false,disposed=false,fontsReady=false,introduced=false,accent="";
    function reset(){
      cancelAnimationFrame(frame);frame=0;previous=0;pointer.active=false;
      dots.forEach(p=>{p.x=p.homeX;p.y=p.homeY;p.vx=p.vy=p.heat=0;});
      context!.clearRect(0,0,width,height);title!.dataset.particles="rest";
    }
    function render(time:number){
      frame=0;
      if(disposed||!visible||document.hidden||motion.matches){reset();return;}
      const step=previous?Math.min(1.8,Math.max(.4,(time-previous)/16.667)):1;
      previous=time;
      const damping=Math.pow(vivid ? .84 : .81,step),cooling=Math.pow(.94,step);
      const spring=(vivid ? .032 : .045)*step,radius=Math.min(vivid?110:75,height*(vivid ? .62 : .48));
      let speed=0,distance=0;
      context!.clearRect(0,0,width,height);
      for(const p of dots){
        p.heat*=cooling;
        if(pointer.active){
          const dx=p.x-pointer.x,dy=p.y-pointer.y,length=Math.hypot(dx,dy);
          if(length<radius){const force=Math.pow(1-length/radius,2)*(vivid?4.4:1.75)*step;
            if(vivid)p.heat=Math.max(p.heat,1-length/radius);
            p.vx+=(length>.01?dx/length:1)*force;p.vy+=(length>.01?dy/length:-.4)*force;}
        }
        p.vx=(p.vx+(p.homeX-p.x)*spring)*damping;
        p.vy=(p.vy+(p.homeY-p.y)*spring)*damping;
        p.x=Math.max(0,Math.min(width,p.x+p.vx*step));
        p.y=Math.max(0,Math.min(height,p.y+p.vy*step));
        const offset=Math.hypot(p.x-p.homeX,p.y-p.homeY),glow=Math.min(1,offset/22);
        speed=Math.max(speed,Math.abs(p.vx),Math.abs(p.vy));distance=Math.max(distance,offset);
        context!.fillStyle=(vivid?p.heat>.03:glow>.3)?accent:p.color;context!.globalAlpha=.9+glow*.1;
        context!.beginPath();context!.arc(p.x,p.y,vivid ? .78+p.heat*.65+glow*.12 : 1.05+glow*.45,0,Math.PI*2);context!.fill();
      }
      context!.globalAlpha=1;
      if(!pointer.active&&distance<.2&&speed<.06){reset();return;}
      quiet=speed<.025?quiet+1:0;
      if(quiet<5)frame=requestAnimationFrame(render);
      else if(!pointer.active)reset();
      else previous=0;
    }
    function wake(){
      if(disposed||!visible||document.hidden||motion.matches||!dots.length)return;
      title!.dataset.particles="active";quiet=0;
      if(!frame){previous=0;frame=requestAnimationFrame(render);}
    }
    function introduce(){
      if(introduced||!visible||document.hidden||motion.matches||!dots.length)return;
      introduced=true;
      dots.forEach((p,i)=>{p.x=Math.max(0,Math.min(width,p.homeX+Math.sin(i*2.39)*17));p.y=Math.max(0,Math.min(height,p.homeY+Math.cos(i*1.73)*9));});
      wake();
    }
    function build(){
      if(disposed||!fontsReady)return;
      reset();dots=[];
      if(motion.matches)return;
      const box=title!.getBoundingClientRect();width=Math.ceil(box.width);height=Math.ceil(box.height);
      if(!width||!height)return;
      const dpr=Math.min(devicePixelRatio||1,2);canvas!.width=Math.round(width*dpr);canvas!.height=Math.round(height*dpr);
      context!.setTransform(dpr,0,0,dpr,0,0);
      const style=getComputedStyle(title!);
      accent=style.getPropertyValue("--particle-accent").trim()||style.getPropertyValue("--accent").trim();
      const sample=document.createElement("canvas");sample.width=width;sample.height=height;
      const brush=sample.getContext("2d",{willReadFrequently:true});
      if(!brush)return;
      for(const run of title!.querySelectorAll<HTMLElement>(".intro-title-ink")){
        const style=getComputedStyle(run);
        brush.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        brush.fillStyle=style.color;
        const walker=document.createTreeWalker(run,NodeFilter.SHOW_TEXT);
        let node:Node|null;
        while((node=walker.nextNode())){
          let offset=0;
          for(const letter of node.textContent||""){
            const range=document.createRange();range.setStart(node,offset);offset+=letter.length;range.setEnd(node,offset);
            const rect=range.getBoundingClientRect();if(!rect.width||!rect.height)continue;
            const metrics=brush.measureText(letter),size=parseFloat(style.fontSize);
            const ascent=metrics.fontBoundingBoxAscent||size*.9,descent=metrics.fontBoundingBoxDescent||size*.2;
            brush.fillText(letter,rect.left-box.left,rect.top-box.top+(rect.height-ascent-descent)/2+ascent);
          }
        }
      }
      const pixels=brush.getImageData(0,0,width,height).data;
      // Keep fine letter detail at roughly three times the original density,
      // with a lower small-screen ceiling and no work while the heading rests.
      const limit=vivid?(width<440?4800:7200):2400;
      let gap=vivid?1.6:2;
      do{
        dots=[];
        for(let y=0;y<height;y+=gap)for(let x=0;x<width;x+=gap){
          const index=(Math.floor(y)*width+Math.floor(x))*4;
          if(pixels[index+3]>150)dots.push({homeX:x,homeY:y,x,y,vx:0,vy:0,heat:0,color:`rgb(${pixels[index]},${pixels[index+1]},${pixels[index+2]})`});
        }
        gap+=vivid ? .15 : .3;
      }while(dots.length>limit);
      canvas!.dataset.particleCount=String(dots.length);
      introduce();
    }
    function move(event:PointerEvent){
      if(event.pointerType!=="mouse"||motion.matches)return;
      const rect=title!.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;pointer.active=true;wake();
    }
    function tap(event:PointerEvent){
      if(event.pointerType!=="touch"||motion.matches)return;
      const rect=title!.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
      const radius=vivid?110:85;
      dots.forEach(p=>{const dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy);if(d<radius){const force=(1-d/radius)*(vivid?7:4);if(vivid)p.heat=1-d/radius;p.vx+=(d>.01?dx/d:1)*force;p.vy+=(d>.01?dy/d:-.4)*force;}});
      pointer.active=false;wake();
    }
    function leave(){pointer.active=false;wake();}
    function visibility(){if(document.hidden)reset();else if(visible)introduce();}
    const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)introduce();else reset();},{threshold:.15});
    const resize=new ResizeObserver(build),theme=new MutationObserver(build);
    intersection.observe(title);resize.observe(title);theme.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme","lang"]});
    title.addEventListener("pointermove",move,{passive:true});title.addEventListener("pointerleave",leave);title.addEventListener("pointerdown",tap,{passive:true});
    motion.addEventListener("change",build);document.addEventListener("visibilitychange",visibility);
    void document.fonts.ready.then(()=>{if(!disposed){fontsReady=true;build();}});
    return()=>{disposed=true;reset();intersection.disconnect();resize.disconnect();theme.disconnect();title.removeEventListener("pointermove",move);title.removeEventListener("pointerleave",leave);title.removeEventListener("pointerdown",tap);motion.removeEventListener("change",build);document.removeEventListener("visibilitychange",visibility);};
  },[effect]);
  return <I18nRegion><Heading id={id} className="particle-heading" ref={titleRef}>{children}<svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M50 3C54 33 67 46 97 50C67 54 54 67 50 97C46 67 33 54 3 50C33 46 46 33 50 3Z" fill="currentColor"/></svg><canvas className="intro-title-particles" ref={canvasRef} aria-hidden="true"/></Heading></I18nRegion>;
}

export function IntroTitle() {
  return <I18nRegion><ParticleHeading id="intro-title" effect="vivid"><span className="intro-title-ink intro-title-base">下一段奇遇，<br/></span><span className="intro-title-ink intro-title-accent">由此启程!</span></ParticleHeading></I18nRegion>;
}
