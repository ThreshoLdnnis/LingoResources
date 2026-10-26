"use client";
import {I18nRegion} from "./i18n";

import {useEffect,useState} from 'react';
import {BookOpen,Check,FileText} from 'lucide-react';
import {CourseMaterials} from './course-materials';
import {CourseAttribution} from './course-appearance';
import {Modal} from './platform';
import {useGrowth} from '@/lib/store';
import type {Resource} from '@/lib/data';

export function CourseLessonView({course,preview=false,initialLesson=0}:{course:Resource;preview?:boolean;initialLesson?:number}) {
  const s=useGrowth();
  const [lesson,setLesson]=useState(initialLesson),[pending,setPending]=useState(false);
  const lessons=course.lessons||[];
  const index=Math.min(lesson,Math.max(0,lessons.length-1));
  const current=lessons[index];
  return <I18nRegion><div className="lesson-layout">
    <aside className="lesson-list" aria-label="课程目录">{lessons.map((item,i)=><button type="button" className={index===i?'active':''} aria-current={index===i?'step':undefined} onClick={()=>setLesson(i)} key={item.id}>
      <span className={!preview&&s.completed.includes(item.id)?'lesson-check done':'lesson-check'}>{!preview&&s.completed.includes(item.id)?<Check size={13}/>:i+1}</span>
      <span><span translate={item.title?"no":undefined}>{item.title||'未命名课时'}</span><small>{item.minutes} 分钟{item.files?.length?` · ${item.files.length} 份课件`:''}</small></span>
    </button>)}</aside>
    <div className="lesson-reader">{current?<>
      <span className="eyebrow">第 {index+1} 节 / {lessons.length} 节</span><h3 translate={current.title?"no":undefined}>{current.title||'未命名课时'}</h3>
      {!!current.files?.length&&<p className="course-reader-hint"><FileText size={15}/>HTML 互动课件、PDF、PPTX 可在线阅读；ZIP 代码 / 资料包请下载后解压。</p>}
      {current.body&&<p translate="no">{current.body}</p>}
      <CourseMaterials key={current.id} files={current.files||[]}/>
      {!preview&&<div className="lesson-actions"><button type="button" className="button primary" disabled={pending||s.completed.includes(current.id)} onClick={async()=>{setPending(true);try{await s.complete(current.id)}catch(error){s.notify((error as Error).message)}finally{setPending(false)}}}><Check size={16}/>{s.completed.includes(current.id)?'本节已完成':pending?'保存中…':'完成本节学习'}</button>{index<lessons.length-1&&<button type="button" className="button secondary" onClick={()=>setLesson(index+1)}>下一节</button>}</div>}
      {preview&&index<lessons.length-1&&<button type="button" className="button secondary" onClick={()=>setLesson(index+1)}>预览下一节</button>}
    </>:<div className="empty-state"><BookOpen/><h3>还没有课时</h3><p>在「课时与课件」中添加第一节课。</p></div>}</div>
  </div></I18nRegion>;
}

export function CoursePlayer({course,onClose,preview=false}:{course:Resource|null;onClose:()=>void;preview?:boolean}) {
  const s=useGrowth();
  const [start,setStart]=useState(0);
  useEffect(()=>{if(course)setStart(Math.max(0,course.lessons?.findIndex(item=>!s.completed.includes(item.id))||0))},[course?.id]);
  return <I18nRegion><Modal open={!!course} onOpenChange={onClose} title={<>{preview&&'课程预览 · '}<span translate={course?.title?'no':undefined}>{course?.title||'课程'}</span></>} wide>{course&&<>
    {preview&&<p className="course-preview-note">学生视角预览 · 不计入学习进度；草稿只对管理员可见。</p>}
    <CourseAttribution name={course.org}/>
    <CourseLessonView key={course.id+':'+start} course={course} preview={preview} initialLesson={start}/>
  </>}</Modal></I18nRegion>;
}
