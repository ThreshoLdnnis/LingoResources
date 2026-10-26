"use client";
import {I18nRegion} from "./i18n";

import {useEffect,useState} from 'react';
import {ImageOff} from 'lucide-react';
import {useGrowth} from '@/lib/store';

export function CompetitionCover({path,title,large=false}:{path:string;title:string;large?:boolean}) {
  const s=useGrowth();
  const [image,setImage]=useState({path:'',url:''}),[failed,setFailed]=useState(false);
  useEffect(()=>{let live=true;setImage({path:'',url:''});setFailed(false);
    void s.getCompetitionCoverUrl(path).then(url=>{if(live)setImage({path,url})}).catch(()=>{if(live)setFailed(true)});
    return()=>{live=false};
  },[path,s.user?.id]);
  const url=image.path===path?image.url:'';
  return <I18nRegion><div className={'competition-cover '+(large?'large':'')}>
    {url?<img src={url} alt={title+' · 官方封面'} loading="lazy" onError={()=>setFailed(true)} hidden={failed}/>:null}
    {failed?<span className="cover-placeholder"><ImageOff size={22}/>封面暂时无法显示</span>:!url?<span className="cover-placeholder">正在加载封面…</span>:null}
    {large&&url&&!failed&&<a className="cover-original" href={url} target="_blank" rel="noopener noreferrer">查看原图 ↗</a>}
  </div></I18nRegion>;
}
