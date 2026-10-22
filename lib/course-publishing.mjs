export function courseStats(course) {
  const lessons=course.lessons||[];
  const files=lessons.flatMap(lesson=>lesson.files||[]);
  return {lessons:lessons.length,minutes:lessons.reduce((sum,lesson)=>sum+(Number(lesson.minutes)||0),0),files:files.length,pdfs:files.filter(file=>file.mime==='application/pdf').length};
}

export function courseIssues(course) {
  const issues=[];
  if(!course.title.trim())issues.push('填写课程名称');
  if(!course.subtitle.trim())issues.push('填写一句话介绍');
  if(course.description.trim().length<15)issues.push('课程介绍至少填写 15 个字');
  if(!course.org.trim())issues.push('填写授课人署名');
  if(course.org.trim().length>80)issues.push('授课人署名最多 80 个字');
  if(!course.lessons?.length)issues.push('至少添加一个课时');
  for(const [index,lesson] of (course.lessons||[]).entries()) {
    if(!lesson.title.trim())issues.push(`第 ${index+1} 节需要课时标题`);
    if(!Number.isInteger(lesson.minutes)||lesson.minutes<1||lesson.minutes>300)issues.push(`第 ${index+1} 节的预计时长应为 1–300 分钟`);
    if(!lesson.body.trim()&&!lesson.files?.length)issues.push(`第 ${index+1} 节需要讲义或课件`);
  }
  return issues;
}

export function prepareCourseSave(course,status) {
  if(course.kind!=='course')throw new Error('只能在课程管理中保存课程。');
  if(!['draft','published'].includes(status))throw new Error('课程状态无效。');
  if(!course.title.trim()||course.title.trim().length>80)throw new Error('课程名称请填写 1–80 个字。');
  if(status==='published') {
    const issues=courseIssues(course);
    if(issues.length)throw new Error('发布前请完成：'+issues.join('；')+'。');
  }
  const lessons=(course.lessons||[]).map(lesson=>({...lesson,title:lesson.title.trim(),body:lesson.body.trim()}));
  const stats=courseStats({...course,lessons});
  return {...course,title:course.title.trim(),subtitle:course.subtitle.trim(),description:course.description.trim(),org:course.org.trim(),tags:course.tags.map(tag=>tag.trim()).filter(Boolean),location:'自学课程',deadline:null,application_enabled:false,status,lessons,meta:`${stats.lessons} 节课 · 约 ${stats.minutes} 分钟`};
}
