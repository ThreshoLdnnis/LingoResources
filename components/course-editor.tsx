"use client";
import {I18nRegion} from "./i18n";

import {useEffect,useRef,useState} from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import {ArrowDown,ArrowUp,BookOpen,Check,Eye,FileText,LoaderCircle,Plus,Save,Send,Trash2,Upload} from 'lucide-react';
import {Modal} from './platform';
import {CourseLessonView} from './course-player';
import {CourseAttribution,CourseCoverPicker,courseCoverClass} from './course-appearance';
import {useGrowth} from '@/lib/store';
import {MATERIAL_ACCEPT,formatFileSize,validateMaterial,isArchiveMaterial} from '@/lib/course-materials.mjs';
import {courseIssues,courseStats,prepareCourseSave} from '@/lib/course-publishing.mjs';
import type {Lesson,Resource} from '@/lib/data';

export function CourseEditor({resource,onClose}:{resource:Resource|null;onClose:()=>void}) {
  const s=useGrowth();
  const [course,setCourse]=useState<Resource>(()=>resource?structuredClone(resource):{
    id:crypto.randomUUID(),kind:'course',title:'',subtitle:'',description:'',org:'',tags:[],location:'自学课程',deadline:null,
    featured:false,status:'draft',tone:'purple',mark:'课',meta:'0 节课',lessons:[],owner_id:s.user?.id||'demo',application_enabled:false
  });
  const [tab,setTab]=useState('details'),[tags,setTags]=useState(resource?.tags.join('，')||'');
  const [dirty,setDirty]=useState(false),[pending,setPending]=useState(false),[uploading,setUploading]=useState(''),[error,setError]=useState('');
  const [discard,setDiscard]=useState(false),[removeLesson,setRemoveLesson]=useState<string|null>(null);
  const uploadLock=useRef(false);
  const busy=pending||!!uploading;
  const lessons=course.lessons||[];
  const stats=courseStats(course),issues=courseIssues(course);
  useEffect(()=>{
    const leave=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue=''}};
    window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);
  },[dirty]);
  function patch(values:Partial<Resource>){setCourse(current=>({...current,...values}));setDirty(true);setError('')}
  function patchLesson(id:string,values:Partial<Lesson>){setCourse(current=>({...current,lessons:current.lessons?.map(item=>item.id===id?{...item,...values}:item)}));setDirty(true);setError('')}
  function close(){if(busy)return;if(dirty)setDiscard(true);else onClose()}
  function move(index:number,delta:number){const next=[...lessons];[next[index],next[index+delta]]=[next[index+delta],next[index]];patch({lessons:next})}
  async function upload(lessonId:string,files:File[]) {
    if(uploadLock.current||!files.length)return;
    setError('');
    try {
      if((lessons.find(item=>item.id===lessonId)?.files?.length||0)+files.length>8)throw new Error('每节课最多添加 8 份课件。');
      files.forEach(validateMaterial);uploadLock.current=true;setUploading(lessonId);
      for(const file of files) {
        const attachment=await s.uploadCourseFile(course.id,lessonId,file);
        setCourse(current=>({...current,lessons:current.lessons?.map(item=>item.id===lessonId?{...item,files:[...(item.files||[]),attachment]}:item)}));setDirty(true);
      }
    } catch(reason){setError((reason as Error).message)} finally{uploadLock.current=false;setUploading('')}
  }
  async function save(status:'draft'|'published') {
    if(busy||uploadLock.current)return;
    setError('');
    try {
      const next=prepareCourseSave({...course,tags:tags.split(/[,，]/)},status);
      setPending(true);await s.saveResource(next);setDirty(false);onClose();
    } catch(reason){setError((reason as Error).message)} finally{setPending(false)}
  }
  return <I18nRegion><>
    <Modal open onOpenChange={close} title={resource?'编辑课程':'新增课程'} wide>
      <form className="course-publisher form-stack" onSubmit={event=>{event.preventDefault();void save('draft')}}>
        <div className="course-editor-summary"><span className={'status '+course.status}>{course.status==='published'?'已发布':'草稿'}</span><span><BookOpen size={15}/>{stats.lessons} 节课 · {stats.minutes} 分钟</span><span><FileText size={15}/>{stats.files} 份课件</span>{dirty&&<small>有未保存的修改</small>}</div>
        <fieldset disabled={busy} className="course-editor-fields"><Tabs.Root value={tab} onValueChange={setTab}>
          <Tabs.List className="radix-tabs course-editor-tabs" aria-label="课程发布步骤">
            <Tabs.Trigger value="details" disabled={busy}>01 课程资料</Tabs.Trigger>
            <Tabs.Trigger value="lessons" disabled={busy}>02 课时与课件</Tabs.Trigger>
            <Tabs.Trigger value="preview" disabled={busy}><Eye size={15}/>03 预览与发布</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="details" className="course-editor-panel">
            <label>课程名称 <span className="required-mark">*</span><input value={course.title} maxLength={80} onChange={event=>patch({title:event.target.value})} placeholder="例如：AI 工具与高效学习"/></label>
            <label>一句话介绍<input value={course.subtitle} maxLength={150} onChange={event=>patch({subtitle:event.target.value})} placeholder="告诉同学，这门课能带来什么"/></label>
            <label>课程介绍<textarea value={course.description} minLength={15} maxLength={6000} onChange={event=>patch({description:event.target.value})} placeholder="介绍适合谁学、学习目标、包含哪些内容，以及学完能完成什么。发布时至少 15 个字。"/></label>
            <div className="form-columns"><label>授课人 <span className="required-mark">*</span><input value={course.org} maxLength={80} aria-label="授课人" onChange={event=>patch({org:event.target.value})} placeholder="填写讲师或课程制作人的署名"/><small className="field-help">会显示在课程卡片与学习页面；多人署名可用「、」分隔。</small></label><label>课程标签<input value={tags} maxLength={150} onChange={event=>{setTags(event.target.value);setDirty(true)}} placeholder="人工智能，效率，知识管理"/></label></div>
            <CourseCoverPicker tone={course.tone} onChange={tone=>patch({tone})}/>
            <label className="checkbox-label"><input type="checkbox" checked={course.featured} onChange={event=>patch({featured:event.target.checked})}/>设为精选内容</label>
            <button type="button" className="button soft course-next" onClick={()=>setTab('lessons')}>下一步：添加课时与课件<ArrowDown size={15}/></button>
          </Tabs.Content>
          <Tabs.Content value="lessons" className="course-editor-panel">
            <div className="course-upload-guide"><Upload size={21}/><div><strong>一节课，一份讲义，也可以是一份互动网页。</strong><p>HTML 互动课件、PDF、PPTX 可在线阅读并下载；也支持 PPT、Word、图片和 ZIP 代码 / 资料包。每份最多 20MB，每节最多 8 份。HTML 请上传自带样式、脚本和图片的单文件，外部依赖不会加载；多个章节请分别上传到对应课时。ZIP 下载后解压使用。上传后记得保存课程。</p></div></div>
            {!lessons.length&&<div className="course-lesson-empty"><BookOpen size={32}/><h3>从第一节课开始</h3><p>可先添加文字讲义，再上传课件或 ZIP 配套代码；也可直接以附件作为课程内容。</p></div>}
            {lessons.map((item,index)=><section className="course-lesson-editor" key={item.id} aria-label={'第 '+(index+1)+' 节编辑'}>
              <div className="lesson-edit-heading"><strong><span className="course-lesson-number">{String(index+1).padStart(2,'0')}</span>课时 {index+1}</strong><div className="table-actions">
                <button type="button" className="icon-button" aria-label={'上移第 '+(index+1)+' 节'} disabled={busy||index===0} onClick={()=>move(index,-1)}><ArrowUp size={16}/></button>
                <button type="button" className="icon-button" aria-label={'下移第 '+(index+1)+' 节'} disabled={busy||index===lessons.length-1} onClick={()=>move(index,1)}><ArrowDown size={16}/></button>
                <button type="button" className="icon-button" aria-label={'移除第 '+(index+1)+' 节'} disabled={busy} onClick={()=>setRemoveLesson(item.id)}><Trash2 size={16}/></button>
              </div></div>
              <div className="course-lesson-fields"><label>课时标题<input aria-label={'第 '+(index+1)+' 节标题'} value={item.title} maxLength={100} disabled={busy} onChange={event=>patchLesson(item.id,{title:event.target.value})} placeholder="例如：建立自己的 AI 学习工作流"/></label><label>预计时长（分钟）<input aria-label={'第 '+(index+1)+' 节分钟'} type="number" min={1} max={300} value={item.minutes||''} disabled={busy} onChange={event=>patchLesson(item.id,{minutes:Number(event.target.value)})}/></label></div>
              <label>文字讲义 / 学习任务<textarea aria-label={'第 '+(index+1)+' 节讲义'} value={item.body} maxLength={12000} disabled={busy} onChange={event=>patchLesson(item.id,{body:event.target.value})} placeholder="上传课件后可不填。你也可以补充导读、练习与参考资料。"/></label>
              <div className="lesson-attachments"><div className="lesson-attachment-heading"><strong><FileText size={16}/>本节附件 <small>{item.files?.length||0} / 8</small></strong><label className={'button secondary material-upload '+(busy?'is-disabled':'')}>{uploading===item.id?<LoaderCircle size={15} className="spin"/>:<Upload size={15}/>}<span>{uploading===item.id?'正在上传…':'上传 HTML / 课件 / ZIP'}</span><input type="file" multiple accept={MATERIAL_ACCEPT} aria-label={'上传第 '+(index+1)+' 节课件'} disabled={busy||(item.files?.length||0)>=8} onChange={event=>{const files=Array.from(event.currentTarget.files||[]);event.currentTarget.value='';void upload(item.id,files)}}/></label></div>
                {item.files?.map(file=><div className="attached-file" key={file.path}><span className="course-file-type">{file.name.split('.').at(-1)?.toUpperCase()}</span><div><strong>{file.name}</strong><small>{formatFileSize(file.size)} · {isArchiveMaterial(file)?'ZIP 压缩包 · 下载解压':file.mime==='text/html'?'HTML 互动课件 · 在线阅读 / 下载':['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(file.mime)||file.mime.startsWith('image/')?'在线阅读 / 下载':'下载阅读'}</small></div><button type="button" className="icon-button" disabled={busy} aria-label={'移除课件 '+file.name} onClick={()=>patchLesson(item.id,{files:item.files?.filter(attachment=>attachment.path!==file.path)})}><Trash2 size={16}/></button></div>)}
                {!item.files?.length&&<p className="field-help">上传 HTML、PDF、PPTX 等课件，或 ZIP 代码 / 资料包。保留原文件名，可在下一步检查互动、预览与下载效果。</p>}
              </div>
            </section>)}
            <div className="course-add-lesson"><button type="button" className="button secondary" disabled={busy||lessons.length>=60} onClick={()=>patch({lessons:[...lessons,{id:crypto.randomUUID(),title:'',body:'',minutes:15}]})}><Plus size={16}/>添加课时</button><span className="field-help">按上 / 下箭头调整学习顺序，最多 60 节。</span></div>
          </Tabs.Content>
          <Tabs.Content value="preview" className="course-editor-panel">
            <div className={'course-publish-check '+(!issues.length?'ready':'')}><div><Check size={20}/><strong>{issues.length?'发布前还需要完善':'课程已准备好，可以发布'}</strong></div>{issues.length?<ul>{issues.map(issue=><li key={issue}>{issue}</li>)}</ul>:<p>课程资料、课时内容已齐备。请再检查课件的阅读与下载效果。</p>}</div>
            <div className={'course-preview-cover '+courseCoverClass(course.tone)}><BookOpen size={32}/><div><small>{stats.lessons} 节课 · {stats.minutes} 分钟</small><h3 translate="no">{course.title||'你的课程名称'}</h3><p translate="no">{course.subtitle||'一句话介绍将显示在这里'}</p><CourseAttribution name={course.org}/></div></div>
            <p className="course-preview-note">以下为学生阅读预览，不会改变学习进度；尚未发布的内容仅管理员可见。</p>
            <CourseLessonView course={course} preview/>
          </Tabs.Content>
        </Tabs.Root></fieldset>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <div className="course-publish-footer"><span>{uploading?'课件上传中，请稍候…':resource?.status==='published'?'保存草稿会下架课程；保存并更新会立即生效。':'草稿不在学堂展示；发布后同学即可学习和下载课件。'}</span><div className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={close}>取消</button><button type="submit" className="button secondary" disabled={busy}><Save size={15}/>{pending?'保存中…':resource?.status==='published'?'保存并下架':'保存草稿'}</button><button type="button" className="button primary" disabled={busy} onClick={()=>void save('published')}><Send size={15}/>{resource?.status==='published'?'保存并更新':'发布课程'}</button></div></div>
      </form>
    </Modal>
    <AlertDialog.Root open={discard} onOpenChange={setDiscard}><AlertDialog.Portal><AlertDialog.Overlay className="modal-overlay"/><AlertDialog.Content className="modal-content"><AlertDialog.Title>放弃本次课程修改？</AlertDialog.Title><AlertDialog.Description className="muted">未保存的资料、课时顺序及课件关联不会发布。你也可以返回编辑器保存草稿。</AlertDialog.Description><div className="dialog-actions"><AlertDialog.Cancel className="button secondary">继续编辑</AlertDialog.Cancel><button type="button" className="button danger" onClick={()=>{setDirty(false);onClose()}}>放弃修改</button></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root>
    <AlertDialog.Root open={!!removeLesson} onOpenChange={()=>setRemoveLesson(null)}><AlertDialog.Portal><AlertDialog.Overlay className="modal-overlay"/><AlertDialog.Content className="modal-content"><AlertDialog.Title>从课程中移除这一节？</AlertDialog.Title><AlertDialog.Description className="muted">课时和它的课件入口会在保存课程后移除；其他课时保持原有顺序。</AlertDialog.Description><div className="dialog-actions"><AlertDialog.Cancel className="button secondary">保留课时</AlertDialog.Cancel><button type="button" className="button danger" onClick={()=>{patch({lessons:lessons.filter(item=>item.id!==removeLesson)});setRemoveLesson(null)}}>移除课时</button></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root>
  </></I18nRegion>;
}
