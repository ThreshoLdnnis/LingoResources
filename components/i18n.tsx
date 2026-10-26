"use client";

import {Children,cloneElement,createContext,isValidElement,useContext,useEffect,useState,type ReactElement,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {LOCALE_STORAGE_KEY,translateUi,validLocale} from '@/lib/i18n/translate.mjs';

export type Locale='zh-CN'|'en';
type LanguageContext={locale:Locale;setLocale:(locale:Locale)=>void;t:(message:string)=>string};
const Context=createContext<LanguageContext>({locale:'zh-CN',setLocale:()=>{},t:message=>message});
export const useI18n=()=>useContext(Context);

export function I18nProvider({children}:{children:ReactNode}){
  const [locale,setLanguage]=useState<Locale>('zh-CN');
  const pathname=usePathname();
  useEffect(()=>{
    try{setLanguage(validLocale(localStorage.getItem(LOCALE_STORAGE_KEY)))}catch{}
    const sync=(event:StorageEvent)=>{if(event.key===LOCALE_STORAGE_KEY)setLanguage(validLocale(event.newValue))};
    window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
  },[]);
  useEffect(()=>{
    document.documentElement.lang=locale;
    document.documentElement.dataset.locale=locale;
    const en=locale==='en';
    const titles:Record<string,string>={explore:'Explore',discover:'Discover',learn:'Learn',projects:'Projects',community:'Community',profile:'Your space',admin:'Admin'};
    const route=pathname.split('/').filter(Boolean)[0]||'';
    const title=en?(titles[route]?titles[route]+' · Lingo':'Lingo · Discover your next possibility'):'翎语 Lingo · Personal Growth OS';
    const description=en?'Go beyond what you know. Find opportunities, build skills, meet collaborators and turn ideas into real projects.':'走出信息边界，发现更多可能。发现机会，学习技能，寻找伙伴，参与实践。';
    const updateMetadata=()=>{if(document.title!==title)document.title=title;const meta=document.querySelector('meta[name="description"]');if(meta&&meta.getAttribute('content')!==description)meta.setAttribute('content',description)};
    updateMetadata();
    // Next may stream a route's static metadata after the client navigation.
    // Keep browser titles in the chosen language without changing route URLs.
    const metadata=new MutationObserver(updateMetadata);metadata.observe(document.head,{childList:true,subtree:true,characterData:true});return()=>metadata.disconnect();
  },[locale,pathname]);
  function setLocale(value:Locale){setLanguage(value);try{localStorage.setItem(LOCALE_STORAGE_KEY,value)}catch{}}
  return <Context.Provider value={{locale,setLocale,t:message=>translateUi(message,locale)}}>{children}</Context.Provider>;
}

// Translate rendered interface copy declaratively, leaving application values,
// handlers, keys, refs, form drafts, authored content and database values intact.
const textAttributes=['aria-label','aria-description','aria-valuetext','title','placeholder','alt'];
const verbatimElements=new Set(['script','style','pre','code','textarea','iframe']);
export function localizeUiNode(node:ReactNode,locale:Locale):ReactNode{
  if(typeof node==='string')return translateUi(node,locale);
  if(Array.isArray(node)){
    const result:ReactNode[]=[];let run:(string|number)[]=[];
    const flush=()=>{if(run.length){const text=run.join(''),translated=translateUi(text,locale);result.push(translated===text?run.map(part=>typeof part==='string'?translateUi(part,locale):part).join(''):translated);run=[]}};
    node.forEach((child,index)=>{
      if(typeof child==='string'||typeof child==='number')run.push(child);
      else{flush();const localized=localizeUiNode(child,locale);result.push(isValidElement(localized)&&localized.key===null?cloneElement(localized,{key:'i18n-'+index}):localized)}
    });flush();return result;
  }
  if(!isValidElement(node)||node.type===I18nRegion)return node;
  const element=node as ReactElement<Record<string,unknown>>;
  const props=element.props;
  const original=props.translate==='no'||props['data-original-content']!==undefined;
  if(original)return node;
  const next:Record<string,unknown>={};
  for(const attribute of textAttributes)if(typeof props[attribute]==='string')next[attribute]=translateUi(props[attribute],locale);
  if(element.type==='optgroup'&&typeof props.label==='string')next.label=translateUi(props.label,locale);
  if(!verbatimElements.has(String(element.type))&&props.children!==undefined){
    // An option without an explicit value derives its submission value from its
    // label. Freeze the ORIGINAL value before translating its visible label.
    if(element.type==='option'&&props.value===undefined&&Children.toArray(props.children as ReactNode).every(x=>typeof x==='string'||typeof x==='number'))next.value=Children.toArray(props.children as ReactNode).join('');
    next.children=localizeUiNode(props.children as ReactNode,locale);
  }
  if(Object.hasOwn(next,'children')){
    const children=next.children as ReactNode;
    // Preserve JSX's static-child semantics. Passing an entire new array only
    // as a prop makes React mistake formerly static siblings for an unkeyed list.
    if(Array.isArray(children)&&children.length>1)return cloneElement(element,next,...children);
    return cloneElement(element,next,children);
  }
  return cloneElement(element,next);
}

export function I18nRegion({children}:{children:ReactNode}){
  const {locale}=useI18n();
  // Use the same keyed tree in BOTH languages so switching never remounts a
  // form, modal or course iframe, even when English changes adjacent text runs.
  return localizeUiNode(children,locale);
}

export function LanguageToggle(){
  const {locale,setLocale}=useI18n();
  return <div className="language-switch" role="group" aria-label={locale==='en'?'Interface language':'界面语言'}>
    <button type="button" lang="zh-CN" aria-label="切换到中文" aria-pressed={locale==='zh-CN'} onClick={()=>setLocale('zh-CN')}>中</button>
    <button type="button" lang="en" aria-label="Switch to English" aria-pressed={locale==='en'} onClick={()=>setLocale('en')}>EN</button>
  </div>;
}

export function OriginalContentNote(){
  const {locale}=useI18n();
  return locale==='en'?<p className="original-content-note" role="note">Course materials, opportunities and community posts are shown in their original language.</p>:null;
}
