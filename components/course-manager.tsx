"use client";
import {I18nRegion} from "./i18n";

import {useState} from 'react';
import {BookOpen,ChevronRight,Eye,FileText,Pencil,Plus,Search,Send,Trash2,Upload,Archive} from 'lucide-react';
import {useGrowth} from '@/lib/store';
import {courseStats,prepareCourseSave} from '@/lib/course-publishing.mjs';
import type {Resource} from '@/lib/data';
import {CourseEditor} from './course-editor';
import {courseCoverClass} from './course-appearance';
import {CoursePlayer} from './course-player';
import {DeleteConfirm} from './editor';
import {Pagination,usePagination} from './pagination';

export function CourseManager() {
  const s=useGrowth();
  const [editing,setEditing]=useState(false),[edit,setEdit]=useState<Resource|null>(null),[preview,setPreview]=useState<Resource|null>(null),[del,setDel]=useState<Resource|null>(null);
  const [query,setQuery]=useState(''),[status,setStatus]=useState('all'),[pending,setPending]=useState(''),[error,setError]=useState('');
  const courses=s.resources.filter(item=>item.kind==='course');
  const rows=courses.filter(item=>(status==='all'||item.status===status)&&[item.title,item.org,...item.tags].join(' ').toLowerCase().includes(query.toLowerCase()));
  const paging=usePagination(rows,12,JSON.stringify([query,status,s.user?.id]));
  if(s.connected&&!s.isAdmin)return null;
  function open(course:Resource|null){setEdit(course);setEditing(true);setError('')}
  async function toggle(course:Resource) {
    if(pending)return;
    setPending(course.id);setError('');
    try{await s.saveResource(prepareCourseSave(course,course.status==='published'?'draft':'published'))}
    catch(reason){setError((reason as Error).message)}finally{setPending('')}
  }
  return <I18nRegion><section className="course-manager" aria-label="课程管理">
    <div className="course-manager-heading"><div><span className="eyebrow">MAKE ROOM FOR LEARNING</span><h2><BookOpen size={25}/>课程工作台</h2><p>把你的知识，整理成同学可以学习、收藏和下载的课程。</p></div><button className="button primary" onClick={()=>open(null)}><Plus size={17}/>新增课程</button></div>
    <div className="course-workflow" aria-label="课程发布流程">{[[BookOpen,'01','填写课程资料'],[Upload,'02','添加课时与课件'],[Eye,'03','预览并发布']].map(([Icon,n,title])=>{const Symbol=Icon as typeof BookOpen;return <div key={String(n)}><Symbol size={20}/><span><small>STEP {String(n)}</small><strong>{String(title)}</strong></span><ChevronRight size={17}/></div>})}</div>
    <div className="course-manager-metrics"><span>共 <strong>{courses.length}</strong> 门课程</span><span><i className="course-dot published"/>已发布 <strong>{courses.filter(item=>item.status==='published').length}</strong></span><span><i className="course-dot draft"/>草稿 / 已下架 <strong>{courses.filter(item=>item.status==='draft').length}</strong></span><span><FileText size={15}/>PDF 课件 <strong>{courses.reduce((sum,item)=>sum+courseStats(item).pdfs,0)}</strong> 份</span></div>
    <div ref={paging.anchor} tabIndex={-1} className="pagination-anchor">
      <div className="discovery-toolbar"><div className="search-field"><Search size={18}/><input value={query} aria-label="搜索课程" placeholder="搜索课程名称、讲师或标签" onChange={event=>setQuery(event.target.value)}/></div><select value={status} aria-label="筛选课程状态" onChange={event=>setStatus(event.target.value)}><option value="all">全部课程状态</option><option value="published">已发布</option><option value="draft">草稿 / 已下架</option></select></div>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="course-admin-grid">{paging.items.map(course=>{const stats=courseStats(course);return <article className="course-admin-card" key={course.id}>
        <div className={'course-admin-cover '+courseCoverClass(course.tone)}><BookOpen size={30} strokeWidth={1.4}/><span title={course.org}>授课人：<span translate={course.org?"no":undefined}>{course.org||'待补充'}</span></span><span className={'status '+course.status}>{course.status==='published'?'已发布':'草稿'}</span></div>
        <div className="course-admin-info"><h3 translate="no">{course.title}</h3><p translate={course.subtitle?"no":undefined}>{course.subtitle||'还没有填写一句话介绍'}</p><div className="course-admin-meta"><span><BookOpen size={14}/>{stats.lessons} 节课 · {stats.minutes} 分钟</span><span><FileText size={14}/>{stats.files} 份课件</span></div><div className="course-admin-actions">
          <button type="button" className="button soft" onClick={()=>open(course)}><Pencil size={15}/>编辑课程</button><button type="button" className="button secondary" onClick={()=>setPreview(course)} aria-label={'预览 '+course.title}><Eye size={15}/>预览</button>
          <button type="button" className="icon-button" disabled={!!pending} onClick={()=>void toggle(course)} aria-label={(course.status==='published'?'下架 ':'发布 ')+course.title} title={course.status==='published'?'下架为草稿':'发布课程'}>{course.status==='published'?<Archive size={17}/>:<Send size={17}/>}</button>
          <button type="button" className="icon-button" disabled={pending===course.id} onClick={()=>setDel(course)} aria-label={'删除课程 '+course.title}><Trash2 size={17}/></button>
        </div></div>
      </article>})}</div>
      {!rows.length&&<div className="empty-state"><BookOpen size={38}/><h3>{courses.length?'没有匹配的课程':'你的第一门课，从这里开始'}</h3><p>{courses.length?'调整搜索或发布状态筛选。':'先保存草稿，再慢慢补齐课时和 PDF 课件。'}</p><button className="button secondary" onClick={()=>courses.length?(setQuery(''),setStatus('all')):open(null)}>{courses.length?'重置筛选':'新增课程'}</button></div>}
      <Pagination paging={paging} label="后台课程管理"/>
    </div>
    <p className="course-manager-tip">下架会关闭课程与课件的新访问，学习记录保留。仅在确实不再需要时删除课程。</p>
    {editing&&<CourseEditor key={s.user?.id+':'+(edit?.id||'new')} resource={edit} onClose={()=>setEditing(false)}/>}
    <CoursePlayer course={preview?s.resources.find(item=>item.id===preview.id)||null:null} onClose={()=>setPreview(null)} preview/>
    <DeleteConfirm resource={del} onClose={()=>setDel(null)}/>
  </section></I18nRegion>;
}
