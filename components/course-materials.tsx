"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileArchive, FileText, LoaderCircle, Maximize, Minimize, Minus, Plus, RefreshCw } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { PresentationData, SlideData } from "@office-kit/pptx";
import type { renderSlideToSvg } from "@office-kit/pptx-preview";
import { useGrowth } from "@/lib/store";
import { formatFileSize, isArchiveMaterial } from "@/lib/course-materials.mjs";
import { buildHtmlCourseDocument, HTML_COURSE_SANDBOX } from "@/lib/html-course.mjs";
import type { CourseFile } from "@/lib/data";

function HtmlReader({url,name}:{url:string;name:string}) {
  const [source,setSource]=useState(''),[error,setError]=useState(''),[expanded,setExpanded]=useState(false),[notice,setNotice]=useState('');
  const reader=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let cancelled=false;
    void fetch(url).then(response=>response.text()).then(html=>{if(!cancelled)setSource(buildHtmlCourseDocument(html))}).catch(()=>{if(!cancelled)setError('HTML 课件暂时无法显示，可下载原文件阅读。')});
    return()=>{cancelled=true};
  },[url]);
  useEffect(()=>{
    const update=()=>setExpanded(document.fullscreenElement===reader.current);
    document.addEventListener('fullscreenchange',update);
    return()=>document.removeEventListener('fullscreenchange',update);
  },[]);
  async function toggleFullscreen(){
    try{setNotice('');if(document.fullscreenElement===reader.current)await document.exitFullscreen();else await reader.current?.requestFullscreen()}
    catch{setNotice('当前浏览器未开启全屏阅读，可继续在下方阅读课件。')}
  }
  return <div className="html-course-reader" ref={reader}>
    <div className="pdf-toolbar"><small>HTML 互动课件 · 可点击、答题与展开阅读</small><button type="button" className="button secondary" onClick={()=>void toggleFullscreen()}>{expanded?<Minimize size={15}/>:<Maximize size={15}/>} {expanded?'退出全屏':'全屏阅读'}</button></div>
    {notice&&<p className="field-help" role="status">{notice}</p>}
    {error?<p className="material-error" role="alert">{error}</p>:source?<iframe className="html-course-frame" title={'HTML 互动课件：'+name} sandbox={HTML_COURSE_SANDBOX} referrerPolicy="no-referrer" srcDoc={source}/>:<p className="material-loading" role="status"><LoaderCircle size={18} className="spin"/>正在打开互动课件…</p>}
    <p className="html-course-note">支持单文件 HTML 的内嵌样式和交互；外部资源不会加载。切换章节请使用课程目录。</p>
  </div>;
}

function PdfReader({url,name}:{url:string;name:string}) {
  const [doc,setDoc]=useState<PDFDocumentProxy|null>(null);
  const [page,setPage]=useState(1),[zoom,setZoom]=useState(1),[width,setWidth]=useState(600),[error,setError]=useState(""),[text,setText]=useState(""),[rendering,setRendering]=useState(true);
  const canvas=useRef<HTMLCanvasElement>(null),container=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let cancelled=false;let task:ReturnType<typeof import('pdfjs-dist').getDocument>|undefined;
    void import('pdfjs-dist').then(pdf=>{
      if(cancelled)return;
      pdf.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.min.js';
      task=pdf.getDocument({url,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/',useSystemFonts:true});
      return task.promise.then(document=>{if(!cancelled)setDoc(document)});
    }).catch(e=>{if(!cancelled){setError(e instanceof Error?e.message:'课件预览失败');setRendering(false)}});
    return()=>{cancelled=true;void task?.destroy()};
  },[url]);
  useEffect(()=>{
    const resize=new ResizeObserver(([entry])=>setWidth(Math.max(180,entry.contentRect.width-24)));
    if(container.current)resize.observe(container.current);
    return()=>resize.disconnect();
  },[]);
  useEffect(()=>{
    if(!doc||!canvas.current)return;
    let cancelled=false;let task:RenderTask|undefined;
    setRendering(true);setError("");setText("");
    void doc.getPage(page).then(async pdfPage=>{
      if(cancelled||!canvas.current)return;
      const base=pdfPage.getViewport({scale:1});
      const scale=Math.min(width/base.width,1.5)*zoom;
      const viewport=pdfPage.getViewport({scale});
      const dpr=Math.min(window.devicePixelRatio||1,2);
      const el=canvas.current;el.width=Math.floor(viewport.width*dpr);el.height=Math.floor(viewport.height*dpr);
      el.style.width=viewport.width+'px';el.style.height=viewport.height+'px';
      task=pdfPage.render({canvas:el,viewport,transform:dpr===1?undefined:[dpr,0,0,dpr,0,0]});
      await task.promise;
      if(!cancelled){setRendering(false);const content=await pdfPage.getTextContent();if(!cancelled)setText(content.items.map(item=>'str' in item?item.str:'').join(' '))}
    }).catch(e=>{if(!cancelled&&e?.name!=='RenderingCancelledException'){setError(e?.message||'本页暂时无法显示');setRendering(false)}});
    return()=>{cancelled=true;task?.cancel()};
  },[doc,page,zoom,width]);
  return <div className="pdf-reader">
    <div className="pdf-toolbar">
      <div><button type="button" className="icon-button" aria-label="课件上一页" disabled={page<=1||!doc} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={18}/></button><span role="status">{doc?`${page} / ${doc.numPages}`:'正在读取…'}</span><button type="button" className="icon-button" aria-label="课件下一页" disabled={!doc||page>=doc.numPages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={18}/></button></div>
      <div><button type="button" className="icon-button" aria-label="缩小课件" disabled={zoom<=.75} onClick={()=>setZoom(z=>Math.max(.75,z-.25))}><Minus size={16}/></button><span>{Math.round(zoom*100)}%</span><button type="button" className="icon-button" aria-label="放大课件" disabled={zoom>=2} onClick={()=>setZoom(z=>Math.min(2,z+.25))}><Plus size={16}/></button></div>
    </div>
    <div className="pdf-canvas-wrap" ref={container} aria-busy={rendering}>
      {rendering&&!error&&<p className="material-loading" role="status"><LoaderCircle size={18} className="spin"/>正在显示课件…</p>}
      {error&&<p className="form-error" role="alert">预览失败：{error}。可使用上方下载按钮阅读原文件。</p>}
      <canvas ref={canvas} aria-label={name+"，第 "+page+" 页"} role="img" style={{visibility:doc&&!error?'visible':'hidden'}}/>
    </div>
    {text&&<details className="pdf-text"><summary>查看本页文字</summary><p>{text}</p></details>}
  </div>;
}

function PptxReader({url,name}:{url:string;name:string}) {
  const [deck,setDeck]=useState<{presentation:PresentationData;slides:readonly SlideData[];render:typeof renderSlideToSvg;getText:(slide:SlideData)=>string}|null>(null);
  const [page,setPage]=useState(0),[image,setImage]=useState(""),[error,setError]=useState(""),[text,setText]=useState("");
  useEffect(()=>{
    let cancelled=false;
    void Promise.all([import('@office-kit/pptx'),import('@office-kit/pptx-preview'),fetch(url).then(r=>r.arrayBuffer())]).then(async([pptx,preview,bytes])=>{
      const presentation=await pptx.loadPresentation(bytes);const slides=pptx.getSlides(presentation);
      if(!slides.length)throw new Error('课件中没有可显示的幻灯片。');
      if(!cancelled)setDeck({presentation,slides,render:preview.renderSlideToSvg,getText:pptx.getSlideText});
    }).catch(e=>{if(!cancelled)setError(e?.message||'PPTX 预览失败')});
    return()=>{cancelled=true};
  },[url]);
  useEffect(()=>{
    if(!deck)return;let source="";
    try{
      const svg=deck.render(deck.presentation,deck.slides[page],{textLayout:'svg'});
      // SVG is displayed as an inert image; no slide HTML, scripts or external
      // document viewer is injected into the application document.
      source=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
      setImage(source);setText(deck.getText(deck.slides[page]));
    }catch(e){setError(e instanceof Error?e.message:'本页暂时无法显示')}
    return()=>{if(source)URL.revokeObjectURL(source)};
  },[deck,page]);
  return <div className="pptx-reader">
    <div className="pdf-toolbar"><div><button type="button" className="icon-button" aria-label="幻灯片上一页" disabled={!deck||page===0} onClick={()=>setPage(x=>x-1)}><ChevronLeft size={18}/></button><span role="status">{deck?`${page+1} / ${deck.slides.length}`:'正在读取…'}</span><button type="button" className="icon-button" aria-label="幻灯片下一页" disabled={!deck||page>=deck.slides.length-1} onClick={()=>setPage(x=>x+1)}><ChevronRight size={18}/></button></div><small>PPTX 在线阅读</small></div>
    {error?<p className="material-error" role="alert">预览失败：{error}。可下载原文件，或上传 PDF 版本。</p>:image?<div className="pptx-slide"><img src={image} alt={name+"，第 "+(page+1)+" 页"}/></div>:<p className="material-loading" role="status"><LoaderCircle size={18} className="spin"/>正在显示幻灯片…</p>}
    {text&&<details className="pdf-text"><summary>查看本页文字</summary><p>{text}</p></details>}
    <p className="pptx-preview-note">静态阅读预览；复杂动画、字体和部分特殊元素可能与原文件略有差异。</p>
  </div>;
}

export function CourseMaterials({files}:{files:CourseFile[]}) {
  const s=useGrowth();const [selected,setSelected]=useState(files[0]?.path||""),[loaded,setLoaded]=useState({path:"",url:""}),[error,setError]=useState(""),[retry,setRetry]=useState(0);
  const file=files.find(f=>f.path===selected)||files[0];
  const archive=!!file&&isArchiveMaterial(file);
  useEffect(()=>{
    if(!file)return;let cancelled=false;let url="";setError("");setLoaded({path:"",url:""});
    void s.readCourseFile(file).then(blob=>{if(cancelled)return;url=URL.createObjectURL(new Blob([blob],{type:file.mime}));setLoaded({path:file.path,url})}).catch(e=>{if(!cancelled)setError(e?.message||"课件暂时无法读取，请重试。")});
    return()=>{cancelled=true;if(url)URL.revokeObjectURL(url)};
  },[file?.path,retry]);
  if(!file)return null;
  const url=loaded.path===file.path?loaded.url:"";
  return <section className="course-materials" aria-label="课程课件">
    <div className="material-heading"><div>{archive?<FileArchive size={18}/>:<FileText size={18}/>}<strong>{archive?'代码 / 资料包':'本节课件'}</strong><small>{formatFileSize(file.size)}</small></div>{url&&<a className="button secondary" href={url} download={file.name}><Download size={15}/>{archive?'下载 ZIP 压缩包':'下载课件'}</a>}</div>
    {files.length>1?<select aria-label="选择课件" value={file.path} onChange={e=>setSelected(e.target.value)}>{files.map(f=><option key={f.path} value={f.path}>{f.name}</option>)}</select>:<p className="material-name">{file.name}</p>}
    {error?<div className="material-error" role="alert"><p>附件暂时无法读取：{error}</p><button className="button secondary" type="button" onClick={()=>setRetry(x=>x+1)}><RefreshCw size={15}/>重新读取</button></div>:!url?<p className="material-loading" role="status"><LoaderCircle size={18} className="spin"/>正在读取附件…</p>:archive?<div className="material-office material-archive"><FileArchive size={40}/><h4>{file.name}</h4><p>课程配套的代码或资料已打包为 ZIP。下载后在电脑上解压，即可查看完整文件。</p><a className="button primary" href={url} download={file.name}><Download size={16}/>下载原始 ZIP</a></div>:file.mime==='text/html'?<HtmlReader key={url} url={url} name={file.name}/>:file.mime==='application/pdf'?<PdfReader key={url} url={url} name={file.name}/>:file.mime==='application/vnd.openxmlformats-officedocument.presentationml.presentation'?<PptxReader key={url} url={url} name={file.name}/>:file.mime.startsWith('image/')?<img className="material-image" src={url} alt={file.name}/>:<div className="material-office"><FileText size={36}/><h4>{file.name}</h4><p>旧版 .ppt 请另存为 .pptx 或 PDF 后上传，即可在线阅读；Word 课件可下载阅读。</p><a className="button primary" href={url} download={file.name}><Download size={16}/>下载原课件</a></div>}
  </section>;
}
