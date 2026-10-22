export const domesticCities = ["北京","上海","广州","深圳","香港","澳门","杭州","南京","重庆"];
export const internationalCities = ["新加坡","东京","纽约","华盛顿","洛杉矶","旧金山","伦敦","巴黎","莫斯科","首尔"];
export const discoveryInterests = ["人工智能","产品设计","编程","数据分析","创新创业","内容运营","知识管理","视觉设计","视频创作","办公效率","学术研究","语言学习"];
const cityAliases = {
  北京:["北京","beijing","peking"],上海:["上海","shanghai"],广州:["广州","廣州","guangzhou","canton"],
  深圳:["深圳","shenzhen"],香港:["香港","hong kong","hongkong"],澳门:["澳门","澳門","macau","macao"],
  杭州:["杭州","hangzhou"],南京:["南京","nanjing"],重庆:["重庆","重慶","chongqing"],
  新加坡:["新加坡","singapore"],东京:["东京","東京","tokyo"],纽约:["纽约","紐約","new york","nyc"],
  华盛顿:["华盛顿","華盛頓","washington","d.c."],洛杉矶:["洛杉矶","洛杉磯","los angeles"],
  旧金山:["旧金山","舊金山","三藩市","san francisco"],伦敦:["伦敦","倫敦","london"],
  巴黎:["巴黎","paris"],莫斯科:["莫斯科","moscow"],首尔:["首尔","首爾","seoul"]
};
const topicAliases = {
  人工智能:["人工智能","ai","大模型","机器学习","深度学习","chatbot","智能体","aigc"],
  产品设计:["产品设计","产品经理","ui","ux","原型","交互","用户体验","figma","framer","作品集"],
  编程:["编程","代码","程序","开发","前端","后端","python","react","github","javascript","coding"],
  数据分析:["数据分析","数据科学","数学建模","量化","图表","统计","可视化","excel","数据挖掘"],
  创新创业:["创新创业","创业","创新","商业","创客","路演"],
  内容运营:["内容运营","新媒体","写作","文案","营销","公众号","小红书"],
  知识管理:["知识管理","笔记","知识库","阅读","notion","obsidian"],
  视觉设计:["视觉设计","平面设计","插画","绘画","图像","图片","海报","3d","建模","设计素材"],
  视频创作:["视频创作","视频","剪辑","音频","音乐","播客","配音"],
  办公效率:["办公效率","办公","效率","ppt","pptx","演示文稿","幻灯片","自动化"],
  学术研究:["学术研究","学术","研究","论文","文献","科研"],
  语言学习:["语言学习","英语","日语","外语","翻译","口语"]
};
const goalWeights = {
  internship:{internship:20,project:10,course:8,tool:6,competition:3},
  competition:{competition:20,project:8,course:8,tool:7,internship:1},
  skill:{course:20,tool:18,project:7,competition:3,internship:1},
  project:{project:20,tool:14,course:12,competition:8,internship:2}
};
const goalLabels = {internship:"寻找实习",competition:"参加赛事",skill:"学习技能",project:"完成作品"};
const opportunityKinds = new Set(["competition","internship","project"]);
const unique = xs => [...new Set(xs)];
const norm = s => String(s || "").normalize("NFKC").toLowerCase().trim();
function contains(text, phrase) {
  const value=norm(phrase),source=norm(text);
  if(!value)return false;
  if(/^[a-z0-9 .+_-]+$/.test(value)) {
    const safe=value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    return new RegExp(`(^|[^a-z0-9])${safe}($|[^a-z0-9])`,"i").test(source);
  }
  return source.includes(value);
}
function hasAlias(text, aliases) { return aliases.some(x=>contains(text,x)); }
function searchable(r) {return [r.title,r.subtitle,r.org,r.description,r.meta,...(r.tags||[])].join(" ");}
export function matchesLocation(resourceLocation, selected) {
  if(!selected||selected==="全部")return true;
  if(selected==="线上")return /线上|線上|在线|自学|自學|网课|online|virtual|webinar|e-learning/i.test(resourceLocation||"");
  if(selected==="远程")return /远程|遠程|remote/i.test(resourceLocation||"");
  return hasAlias(resourceLocation,cityAliases[selected]||[selected]);
}
function accessibleOnline(r) {return matchesLocation(r.location,"线上")||matchesLocation(r.location,"远程");}
function dayString(now=new Date()) {
  const date=now instanceof Date?now:new Date(now);
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
function deadlineDay(value) {
  const s=String(value||"").slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
  const date=new Date(s+"T00:00:00Z");
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===s?s:null;
}
function daysBetween(from,to) {return Math.round((Date.parse(to+"T00:00:00Z")-Date.parse(from+"T00:00:00Z"))/86400000);}
function topicMatches(r, topic) {
  const aliases=topicAliases[topic]||[topic];
  const direct=[r.title,r.subtitle,...(r.tags||[])].join(" ");
  return hasAlias(direct,aliases)?2:hasAlias(r.description,aliases)?1:0;
}
function freeStatus(r) {
  const text=searchable(r);
  return /免费|免費|开源|開源|\bfree\b|零费用/i.test(text)&&!/不免费|非免费|免费试用|免费额度|部分免费|免费版|限时免费|套餐|订阅|付费|收费|freemium|free trial|subscription/i.test(text);
}
function levelStatus(r) {
  const text=[r.title,r.subtitle,...(r.tags||[]),r.description].join(" ");
  if(/进阶|高级|高阶|资深|熟练|专业基础|advanced|senior/i.test(text)&&!/零基础|零门槛|无经验|从\s*0\s*到/i.test(text))return "advanced";
  if(/零基础|零门槛|入门|初学|无经验|第一次|从\s*0\s*到|beginner/i.test(text))return "beginner";
  return "unknown";
}
function requestKeywords(source) {
  let rest=source;
  const known=unique([...Object.values(topicAliases).flat(),...Object.values(cityAliases).flat()]).sort((a,b)=>b.length-a.length);
  for(const word of known){
    const safe=norm(word).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    rest=rest.replace(new RegExp(/^[a-z0-9 .+_-]+$/i.test(word)?`(?<![a-z0-9])${safe}(?![a-z0-9])`:safe,"gi")," ");
  }
  rest=rest.replace(/未来\s*\d+\s*[天日]|\d+\s*[天日]|三个月|一个月|零基础|没有基础|初学|刚开始|零预算|不花钱|不限费用|付费也可以|高阶|进阶|高级|线上|在线|远程|免费|开源|报名|截止|实习|求职|找工作|竞赛|比赛|赛事|黑客松|作品|项目|网站|完成|参加|寻找|找到|想要|想学|学会|学习|技能|资源|工具|活动|推荐|优先|希望|相关|适合|能用|入门|最近|现在|准备|尝试|提升|可用|支持|一个季度|一个|一项|一次|一些|一份|一门|帮我|我想|我要|可以|以内|之内|天内|我的|同时|了解/g," ");
  const words=typeof Intl.Segmenter==="function"?[...new Intl.Segmenter("zh-CN",{granularity:"word"}).segment(rest)].filter(x=>x.isWordLike).map(x=>x.segment):rest.split(/[\s，。；,;]+/);
  return unique(words.map(norm).filter(w=>w.length>=2&&/[a-z\u4e00-\u9fff]/i.test(w)&&!/^([我想要只在用学做找能还更再将并且有去很请帮给也这那的与和及或以内到])+$/u.test(w))).slice(0,6);
}
export function understandRequest(text) {
  const source=norm(text).slice(0,600), excluded=[];
  for(const [topic,aliases] of Object.entries(topicAliases)) {
    if(aliases.some(a=>source.includes("不想"+norm(a))||source.includes("不要"+norm(a))||source.includes("不学"+norm(a))||source.includes("不考虑"+norm(a))))excluded.push(topic);
  }
  const clean=source.replace(/(?:不想|不要|不学|不考虑)[^，。；,;\n]{0,12}/g,"");
  const tags=Object.entries(topicAliases).filter(([t,a])=>!excluded.includes(t)&&hasAlias(clean,a)).map(([t])=>t);
  const goals=[[/实习|求职|找工作|internship/,"internship"],[/比赛|竞赛|赛事|黑客松|hackathon/,"competition"],[/做.{0,6}作品|作品集|做.{0,6}项目|完成.{0,6}项目|开发.{0,6}网站/,"project"],[/学习|学会|入门|技能|工具/,"skill"]];
  const goal=goals.find(([pattern])=>pattern.test(clean))?.[1];
  const cities=Object.keys(cityAliases).filter(city=>hasAlias(clean,cityAliases[city]));
  const location=cities[0]||(matchesLocation(clean,"远程")?"远程":matchesLocation(clean,"线上")?"线上":undefined);
  const level=/零基础|初学|刚开始|没有基础|入门/.test(clean)?"beginner":/进阶|高阶|高级/.test(clean)?"advanced":undefined;
  const horizon=/30\s*(?:天|日)|一个月/.test(clean)?"30":/90\s*(?:天|日)|三个月|一个季度/.test(clean)?"90":undefined;
  const freeOnly=/免费|开源|零预算|不花钱|\bfree\b/.test(clean)&&!/不需要免费|不限费用|付费也可以/.test(clean);
  return {goal,tags,location,cities,level,horizon,freeOnly,excluded,keywords:requestKeywords(clean)};
}
export function recommendResources(resources, preferences={}, context={}) {
  const intent=understandRequest(preferences.text||"");
  const goal=preferences.goal&&preferences.goal!=="auto"?preferences.goal:intent.goal||"skill";
  const location=preferences.location&&preferences.location!=="auto"?preferences.location:intent.location||"全部";
  const level=preferences.level&&preferences.level!=="auto"?preferences.level:intent.level||"any";
  const horizon=preferences.horizon&&preferences.horizon!=="auto"?preferences.horizon:intent.horizon||"any";
  const freeOnly=preferences.price==="free"||(preferences.price!=="any"&&intent.freeOnly);
  const explicit=unique([...(preferences.tags||[]),...intent.tags]).filter(x=>!intent.excluded.includes(x));
  const personal=preferences.personalize===false?[]:unique(context.interests||[]);
  const today=dayString(context.now),favorites=new Set(context.favorites||[]),completed=new Set(context.completed||[]),seen=new Set();
  const excluded={expired:0,location:0,time:0,price:0,level:0,interest:0},rows=[];
  for(const r of resources) {
    if(r.status!=="published"||seen.has(r.id))continue;
    seen.add(r.id);
    const date=deadlineDay(r.deadline),days=date?daysBetween(today,date):null;
    if(opportunityKinds.has(r.kind)&&days!==null&&days<0){excluded.expired++;continue;}
    if(!matchesLocation(r.location,location)&&!(preferences.includeOnline!==false&&location!=="线上"&&location!=="远程"&&accessibleOnline(r))){excluded.location++;continue;}
    if(horizon!=="any"&&opportunityKinds.has(r.kind)&&(days===null||days>Number(horizon))){excluded.time++;continue;}
    if(freeOnly&&!freeStatus(r)){excluded.price++;continue;}
    const resourceLevel=levelStatus(r);
    if(level==="beginner"&&resourceLevel==="advanced"){excluded.level++;continue;}
    if(intent.excluded.some(t=>(r.tags||[]).some(tag=>hasAlias(tag,topicAliases[t]||[t])))){excluded.interest++;continue;}
    const matched=explicit.filter(t=>topicMatches(r,t)),personalMatched=personal.filter(t=>topicMatches(r,t));
    const named=preferences.text&&contains(preferences.text,r.title)&&norm(r.title).length>=2;
    if(explicit.length&&!matched.length&&!named){excluded.interest++;continue;}
    if(intent.keywords.length&&!intent.keywords.every(t=>contains(searchable(r),t))){excluded.interest++;continue;}
    let score=(goalWeights[goal]||goalWeights.skill)[r.kind]||0;
    const reasons=[],notes=[];
    if(matched.length){score+=matched.reduce((n,t)=>n+topicMatches(r,t)*7,0);reasons.push("匹配方向："+matched.slice(0,3).join("、"));}
    if(named){score+=24;reasons.push("你在需求中提到了这项资源");}
    if(intent.keywords.length){score+=intent.keywords.length*5;reasons.push("内容提及："+intent.keywords.join("、"));}
    if(personalMatched.length){score+=Math.min(personalMatched.length*2,6);if(!matched.length)reasons.push("与你的兴趣相符："+personalMatched.slice(0,2).join("、"));}
    if(["internship","competition","project"].includes(goal)&&r.kind===goal)reasons.push("可用于"+goalLabels[goal]);
    else if(goal==="skill"&&["course","tool"].includes(r.kind))reasons.push(r.kind==="course"?"通过课程系统学习":"用工具把技能用起来");
    else if(["course","tool"].includes(r.kind))reasons.push(r.kind==="course"?"为目标补齐知识":"为实践准备工具");
    else if(r.kind==="project")reasons.push("可积累作品与实践经历");
    if(location!=="全部") {
      if(matchesLocation(r.location,location)){score+=5;reasons.push("地点符合："+location);}
      else reasons.push("可在线参与，不受所选城市限制");
    }
    if(level!=="any") {
      if(resourceLevel===level){score+=6;reasons.push(level==="beginner"?"内容标注了入门或零基础":"内容标注了进阶要求");}
      else if(resourceLevel==="unknown")notes.push("基础要求未注明，请查看详情");
    }
    if(days!==null&&opportunityKinds.has(r.kind)) {
      if(days===0)notes.push("今天截止，请先核对官方报名时间");
      else if(days<=7)notes.push("距截止还有 "+days+" 天，建议尽快查看");
      if(days<=30)score+=2;
    }else if(opportunityKinds.has(r.kind))notes.push("截止日期未注明，请核对官方信息");
    if(freeOnly)reasons.push("资源说明标注了免费或开源");
    if(!r.location||/以.{0,8}公告|待定|未注明/.test(r.location))notes.push("具体地点待核实");
    if(favorites.has(r.id)){score-=2;notes.push("你已收藏这项资源");}
    if(r.kind==="course"&&r.lessons?.length&&r.lessons.every(l=>completed.has(l.id))){score-=6;notes.push("这门课程的课时已全部完成");}
    rows.push({resource:r,score,matched,reasons:unique(reasons).slice(0,3),notes:unique(notes).slice(0,2)});
  }
  rows.sort((a,b)=>b.score-a.score||Number(b.resource.featured)-Number(a.resource.featured)||a.resource.title.localeCompare(b.resource.title,"zh-CN")||a.resource.id.localeCompare(b.resource.id));
  const first=kinds=>rows.find(x=>kinds.includes(x.resource.kind))||null;
  const path=[
    {title:"先补齐知识",description:"从一门相关课程开始",match:first(["course"])},
    {title:"再用工具动手",description:"把想法做成一次小练习",match:first(["tool"])},
    {title:goal==="internship"?"积累职业经历":goal==="competition"?"走向赛事舞台":"留下实践作品",description:"让学习成为可展示的经历",match:first(goal==="internship"?["internship"]:goal==="competition"?["competition"]:["project","competition"])}
  ];
  return {rows,path,excluded,preferences:{goal,location,level,horizon,freeOnly,tags:explicit},intent,today};
}
export function rankResources(resources,goal,interests) {
  return recommendResources(resources,{goal,tags:interests,includeOnline:true,personalize:false}).rows;
}
export function filterResources(resources,query,kind,location,sort) {
  const terms=norm(query).split(/\s+/).filter(Boolean);
  return resources.filter(r=>r.status==="published"&&(!kind||kind==="all"||r.kind===kind)&&matchesLocation(r.location,location)&&terms.every(t=>norm(searchable(r)).includes(t))).sort((a,b)=>sort==="deadline"?(deadlineDay(a.deadline)||"9999").localeCompare(deadlineDay(b.deadline)||"9999"):Number(b.featured)-Number(a.featured));
}
