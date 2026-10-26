"use client";
import {I18nRegion,LanguageToggle} from "./i18n";


import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Bookmark, BookOpen, Check, ChevronDown, Code2, Compass, FileText, FolderOpen, GraduationCap, Layers, Menu, MessageCircle, Moon, Play, Plus, Search, Sparkles, Sun, Trophy, Users, X } from "lucide-react";
import { brand } from "@/lib/brand";
import { useGrowth } from "@/lib/store";
import { AuthDialog } from "./auth-dialog";
import { MemberLink } from "./member-access";
import { Logo, Reveal } from "./platform";
import { IntroTitle, ParticleHeading } from "./intro-title";
import { CosmicBackdrop } from "./cosmic-backdrop";
import { ExplorationOrbit } from "./exploration-orbit";

import { IntroDeck, introDoors as doors } from "./intro-deck";

function Spark({className=""}:{className?:string}) {
  return <I18nRegion><svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M50 3C54 33 67 46 97 50C67 54 54 67 50 97C46 67 33 54 3 50C33 46 46 33 50 3Z" fill="currentColor"/></svg></I18nRegion>;
}

function DiscoveryScene() {
  return <I18nRegion><div className="intro-scene intro-discovery" role="img" aria-label="机会发现功能示意：搜索方向、筛选类型、收藏感兴趣的机会">
    <div className="intro-browser"><div className="intro-browser-bar"><span><i/><i/><i/></span><small>lingozm.cn / discover</small><Search size={13}/></div>
      <div className="intro-mini-search"><Search size={17}/><span>下一次，我想试试什么？</span><span className="intro-key">↵</span></div>
      <div className="intro-mini-filters"><b>全部机会</b><span>赛事活动</span><span>工作实习</span></div>
      <div className="intro-opportunity"><span className="intro-scene-icon"><Trophy size={24}/></span><div><small>赛事活动 · 示例</small><strong>把校园里的好点子，做成作品</strong><p>创新创业　跨学科　组队</p></div><Bookmark size={18}/></div>
      <div className="intro-opportunity is-secondary"><span className="intro-scene-icon"><Code2 size={23}/></span><div><small>项目实践 · 示例</small><strong>你的第一个 AI 小项目</strong><p>从一个真实的小问题开始</p></div><ArrowUpRight size={18}/></div>
    </div><div className="intro-float-note"><Bookmark size={17}/><span>感兴趣？先放进收藏夹。</span><Check size={15}/></div><Spark className="intro-scene-spark"/>
  </div></I18nRegion>;
}

function LearningScene() {
  return <I18nRegion><div className="intro-scene intro-learning" role="img" aria-label="学习成长功能示意：学习课程、阅读课件、下载资料、实践输出">
    <div className="intro-lesson-window"><div className="intro-lesson-top"><span><BookOpen size={17}/>学习空间</span><small>一步一步，也很了不起</small></div><div className="intro-lesson-art"><span>01</span><Play size={28}/><Spark/></div><div className="intro-lesson-body"><small>从好奇开始 / 示例课程</small><strong>把想法，变成第一个作品</strong><div className="intro-materials"><span><FileText size={15}/>讲义.pdf</span><span><FolderOpen size={15}/>项目代码.zip</span></div></div></div>
    <div className="intro-skill-card"><span className="intro-skill-icon"><Sparkles size={22}/></span><div><small>今天的新技能</small><strong>少一点“以后再学”</strong></div></div>
    <div className="intro-lesson-check"><Check size={17}/>学一点，用起来。</div>
  </div></I18nRegion>;
}

function CommunityScene() {
  return <I18nRegion><div className="intro-scene intro-community" role="img" aria-label="社区组队功能示意：转发赛事、发布招募、评论交流，认识不同技能的伙伴">
    <div className="intro-team-post"><div className="intro-post-author"><span className="intro-avatar">Hi</span><div><strong>一个正在行动的同学</strong><small>组队帖示意</small></div><span>···</span></div><h3>这个比赛，一起试试？</h3><p>想把一个关于校园生活的点子做出来。<br/>寻找设计、开发，和同样好奇的你。</p><div className="intro-shared-event"><Trophy size={24}/><div><small>转发的赛事</small><strong>从同一个机会，开始认识</strong></div><ArrowUpRight size={17}/></div><div className="intro-post-meta"><span><MessageCircle size={15}/>把想法聊清楚</span><span>再一起出发 ↗</span></div></div>
    <div className="intro-reply intro-reply-one"><span>设计</span>我来画原型！<Sparkles size={15}/></div><div className="intro-reply intro-reply-two"><span>开发</span>一起把它做出来。<Code2 size={17}/></div>
  </div></I18nRegion>;
}

function ProfileScene() {
  return <I18nRegion><div className="intro-scene intro-profile" role="img" aria-label="个人空间功能示意：自定义个人介绍、技能标签、项目作品与获奖记录">
    <div className="intro-profile-card"><div className="intro-profile-cover"><span className="intro-profile-monogram">我</span><Spark/></div><div className="intro-profile-info"><small>YOUR SPACE, YOUR STORY</small><strong>你好，这是正在探索的我。</strong><p>喜欢的事，做过的事，还有想尝试的事。</p><div><span>好奇心</span><span>行动派</span><span>持续更新中</span></div></div></div>
    <div className="intro-project-note"><Layers size={20}/><small>我的作品</small><strong>从 0 到 1 的一次尝试</strong><ArrowUpRight size={18}/></div><div className="intro-award-note"><Trophy size={21}/><small>CERTIFICATE</small><strong>值得纪念的小成就</strong><span>每一步，都算数。</span></div>
  </div></I18nRegion>;
}

const faqs = [
  ["翎语适合谁？","适合正在探索方向的大学生和年轻人。想找一个比赛、学会一个工具、认识项目伙伴，或者整理自己的经历，都可以从这里开始。"],
  ["现在需要内测码吗？","平台介绍页无需登录。资源、课程、项目与社区内容需注册并登录后查看。首次注册需要邀请人提供的 8 位内测码，每个码仅限创建一个账号；已有账号直接登录即可。"],
  ["参加赛事或申请实习，需要怎么做？","赛事和实习信息会提供对应的官方链接，具体规则与申请以主办方或招聘方为准。你也可以把赛事转发到社区寻找队友。仅对平台明确开放站内报名的活动，才能在站内提交申请。"],
  ["需要下载 App 吗？","当前使用浏览器就能打开翎语，电脑和手机都可以访问。登录后即可浏览资源、阅读课件、记录学习进度或参与社区交流。"],
];

export default function Landing() {
  const s=useGrowth(),router=useRouter();
  const [menu,setMenu]=useState(false),[dark,setDark]=useState(false),[auth,setAuth]=useState(false),[mode,setMode]=useState<"login"|"signup">("login"),[deckOrder,setDeckOrder]=useState([0,1,2,3]);
  const root=useRef<HTMLDivElement>(null);
  const door=deckOrder[0],current=doors[door];
  function selectDoor(index:number){setDeckOrder(order=>{const slot=order.indexOf(index);if(slot<=0)return order;const next=[...order];[next[0],next[slot]]=[next[slot],next[0]];return next;});}
  useEffect(()=>{setDark(document.documentElement.dataset.theme==="dark");const elements=root.current?.querySelectorAll<HTMLElement>("[data-intro-motion]");if(!elements||!('IntersectionObserver' in window))return;const observer=new IntersectionObserver(entries=>entries.forEach(entry=>(entry.target as HTMLElement).dataset.active=String(entry.isIntersecting)),{threshold:.1});elements.forEach(element=>observer.observe(element));return()=>observer.disconnect();},[]);
  function toggleTheme(){const value=!dark;setDark(value);document.documentElement.dataset.theme=value?"dark":"light";localStorage.setItem("zongmen-theme",value?"dark":"light");}
  function openAuth(next:"login"|"signup"){setMode(next);setMenu(false);setAuth(true);}
  const join=s.user?<MemberLink className="intro-button intro-button-dark" href="/explore/">回到我的平台<ArrowUpRight size={18}/></MemberLink>:<button className="intro-button intro-button-dark" onClick={()=>openAuth("signup")}>有内测码？加入翎语<ArrowUpRight size={18}/></button>;
  return <I18nRegion><div className="intro-page" ref={root}>
    <a href="#intro-main" className="skip-link">跳到正文</a>
    <header className="intro-header"><div className="intro-nav-wrap"><Link className="intro-brand" href="/" aria-label="翎语 Lingo 官网首页"><Logo/><span><b>{brand.englishName}</b><small>{brand.name}</small></span></Link>
      <nav aria-label="官网导航" className={menu?"is-open":""}><a href="#why-lingo" onClick={()=>setMenu(false)}>认识翎语</a><a href="#possibilities" onClick={()=>setMenu(false)}>发现可能</a><a href="#get-started" onClick={()=>setMenu(false)}>如何开始</a></nav>
      <div className="intro-header-actions"><LanguageToggle/><button className="intro-theme" onClick={toggleTheme} aria-label={dark?"切换浅色模式":"切换深色模式"}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button>{s.user?<MemberLink className="intro-login" href="/explore/">进入平台<ArrowUpRight size={16}/></MemberLink>:<><button className="intro-login" onClick={()=>openAuth("login")}>登录<ArrowUpRight size={16}/></button><button className="intro-header-join" onClick={()=>openAuth("signup")}>受邀注册</button></>}<button className="intro-menu" aria-label="切换官网导航" aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X size={21}/>:<Menu size={21}/>}</button></div>
    </div></header>
    <main id="intro-main">
      <section className="intro-hero intro-container" aria-labelledby="intro-title">
        <div className="intro-hero-copy"><span className="intro-eyebrow"><i/>为好奇而来，为可能出发</span><IntroTitle/><p>走出信息边界，发现更多可能。<br/>翎语把机会、技能与伙伴连接起来，<br className="intro-desktop-break"/>陪你把“我想试试”，变成“这件事，我做过”。</p><div className="intro-hero-actions"><MemberLink href="/explore/" className="intro-button intro-button-dark">在浏览器中打开翎语<ArrowUpRight size={19}/></MemberLink><button className="intro-button intro-button-light" onClick={()=>openAuth(s.user?"login":"signup")}>{s.user?"管理我的账号":"使用内测码注册"}<Plus size={17}/></button></div><span className="intro-hero-footnote">为大学生打造的 Personal Growth OS</span></div>
        <div className={"intro-hero-visual intro-tone-"+current.tone} data-intro-motion data-active="false"><div className="intro-orbit intro-orbit-one"/><div className="intro-orbit intro-orbit-two"/><span className="intro-orbit-label">GO BEYOND WHAT YOU KNOW</span><Spark className="intro-orbit-star"/>
          <IntroDeck order={deckOrder} onSelect={selectDoor}/><div className="intro-floating-label"><i/><span>你的下一种可能，正在展开。</span></div>
        </div>
        <div className="intro-doors" role="group" aria-label="选择想了解的模块">{doors.map((item,i)=><button key={item.label} className={door===i?"is-selected":""} aria-pressed={door===i} onClick={()=>selectDoor(i)}><span>0{i+1}</span><item.icon size={18}/>{item.label}<ArrowUpRight size={16}/></button>)}</div>
      </section>

      <section id="why-lingo" className="intro-manifesto intro-container"><Reveal><span className="intro-eyebrow">A LITTLE LESS LOST. A LOT MORE POSSIBLE.</span><h2>优质的资源，<br/>值得每一位主动探索的王子和公主享受！</h2><p>进入大学，面对海量信息，还是不知道从哪里开始？想参加高含金量的赛事与项目，却在寻找和错过之间焦虑、内耗？<br/>不必再在几十个群聊里翻找，也不必等到机会结束才听说。<br/>在翎语，把时间留给探索，把想法交给行动。</p><a href="#possibilities" className="intro-scroll-link">看看你的可能性<ArrowDown size={17}/></a></Reveal><ExplorationOrbit/></section>

      <div id="possibilities" className="intro-container intro-stories">
        <section className="intro-story"><Reveal className="intro-story-art"><DiscoveryScene/></Reveal><Reveal className="intro-story-copy"><span className="intro-eyebrow">01 / FIND YOUR NEXT THING</span><h2>把信息差，<br/>变成出发点。</h2><p>赛事、活动、实习与项目，不再散落在不同角落。按兴趣、地点和方向筛选，收藏值得投入的机会，再去官方页面了解详情。</p><p className="intro-story-note">还没想好？让智能发现帮你梳理目标，找到适合开始的站内资源。</p><MemberLink href="/discover/" className="intro-text-link">发现一个新机会<ArrowUpRight size={18}/></MemberLink></Reveal></section>
        <section className="intro-story intro-story-reverse"><Reveal className="intro-story-art"><LearningScene/></Reveal><Reveal className="intro-story-copy"><span className="intro-eyebrow">02 / LEARN IT. MAKE IT.</span><h2>别只收藏，<br/>试着做出来。</h2><p>从一节课、一个工具、一次练习开始。在线阅读课件、下载项目资料，把刚学到的知识，用在下一次尝试里。</p><p className="intro-story-note">课程、工具箱与成长路线放在一起，让“我想学”有一个具体的下一步。</p><MemberLink href="/learn/" className="intro-text-link">今天学点新招<ArrowUpRight size={18}/></MemberLink></Reveal></section>
        <section className="intro-story"><Reveal className="intro-story-art"><CommunityScene/></Reveal><Reveal className="intro-story-copy"><span className="intro-eyebrow">03 / GOOD IDEAS NEED GOOD COMPANY</span><h2>总有同频共振，<br/>总有不谋而合~</h2><p>把想参加的赛事转发到社区，写下你的点子、技能和期待。聊一聊，认识不同专业的伙伴，一起把“如果可以”变成“我们试试”。</p><p className="intro-story-note">从一条评论，到一次组队，再到一个真实的项目。</p><MemberLink href="/community/" className="intro-text-link">认识一起出发的人<ArrowUpRight size={18}/></MemberLink></Reveal></section>
        <section className="intro-story intro-story-reverse"><Reveal className="intro-story-art"><ProfileScene/></Reveal><Reveal className="intro-story-copy"><span className="intro-eyebrow">04 / YOUR STORY IS STILL UNFOLDING</span><h2>把自己放在宇宙中心，<br/>您的成长轨迹自成星系！</h2><p>用自己的配色、标签和展示模块，DIY 一张有个性的个人名片。作品、经历、获奖记录，都可以成为介绍你的一部分。</p><p className="intro-story-note">收藏和学习记录留给自己，想展示的经历留给未来的伙伴。</p><MemberLink href="/profile/" className="intro-text-link">打开我的个人空间<ArrowUpRight size={18}/></MemberLink></Reveal></section>
        <p className="intro-illustration-note">以上为功能示意，实际内容以平台内发布为准。</p>
      </div>

      <section id="get-started" className="intro-start intro-container"><Reveal><span className="intro-eyebrow">SMALL STARTS. REAL POSSIBILITIES.</span><h2>不用准备好一切，<br/>先迈出有意思的一步。</h2></Reveal><ol className="intro-steps"><li><span>01</span><Compass size={24}/><h3>认识翎语</h3><p>看看平台介绍，找到让你好奇的方向。</p></li><li><span>02</span><GraduationCap size={24}/><h3>留下自己的起点</h3><p>用内测码注册并确认邮箱，登录后开始探索。</p></li><li><span>03</span><ArrowUpRight size={24}/><h3>然后，去做点什么</h3><p>学个新技能，认识新伙伴，完成新作品。</p></li></ol></section>

      <section className="intro-faq intro-container" aria-labelledby="intro-faq-title"><div><span className="intro-eyebrow">GOOD QUESTIONS</span><h2 id="intro-faq-title">出发前，<br/>你可能想知道。</h2><Spark/></div><div className="intro-faq-list">{faqs.map(([question,answer])=><details key={question}><summary>{question}<ChevronDown size={19}/></summary><p>{answer}</p></details>)}</div></section>

      <section className="intro-finale intro-container" aria-labelledby="intro-finale-title"><div className="intro-finale-inner">
        <CosmicBackdrop/>
        <div className="intro-finale-content"><span className="intro-eyebrow"><i/>THERE’S MORE OUT THERE.</span>
          <ParticleHeading as="h2" id="intro-finale-title"><span className="intro-title-ink intro-finale-line">束高贵之翎，</span><span className="intro-title-ink intro-finale-line intro-finale-line-strong">听未言之语，</span><span className="intro-title-ink intro-finale-line intro-finale-line-last">让未至，渐成可及。</span></ParticleHeading>
          <p className="intro-finale-quote">我渴求的，无非是将心中脱颖欲出的本性付诸生活。<span>—— 赫尔曼·黑塞</span></p>
          <div className="intro-finale-actions"><MemberLink className="intro-button intro-button-white" href="/explore/">进入翎语，开始探索<ArrowUpRight size={19}/></MemberLink>{join}</div>
        </div>
        <div className="intro-finale-bottom"><span>LINGO / 翎语</span><span>{brand.tagline}</span><ArrowUpRight size={17} aria-hidden="true"/></div>
      </div></section>
    </main>
    <footer className="intro-footer intro-container"><div><Link className="intro-brand" href="/" aria-label="翎语 Lingo 官网首页"><Logo/><span><b>{brand.englishName}</b><small>{brand.name}</small></span></Link><p>让优秀的资源，不再只属于少数知道的人。</p></div><div className="intro-footer-links"><a href="#why-lingo">认识翎语</a><MemberLink href="/explore/">进入平台</MemberLink><MemberLink href="/community/">社区组队</MemberLink><MemberLink href="/admin/">运营后台</MemberLink><button onClick={()=>openAuth("login")}>{s.user?"账户管理":"登录 / 注册"}</button></div><span className="intro-copyright footer-credits"><span>© {new Date().getFullYear()} {brand.title} · {brand.descriptor}</span><span className="footer-founder">{brand.founder}</span></span></footer>
    <AuthDialog open={auth} onOpenChange={setAuth} initialMode={mode} onAuthenticated={()=>router.push("/explore/")}/><div className={"toast "+(s.message?"show":"")} role="status"><Check size={17}/>{s.message}</div>
  </div></I18nRegion>;
}
