import test from 'node:test';
import assert from 'node:assert/strict';
import {courseIssues,courseStats,prepareCourseSave} from '../lib/course-publishing.mjs';

const course=()=>({id:'c',kind:'course',title:'  测试课程  ',subtitle:'学会把知识做成一份可以分享的作品',description:'这门课程通过真实的小练习，带领同学建立自己的学习方法。',org:'宗门学堂',tags:[' 人工智能 ',''],tone:'purple',status:'draft',featured:false,location:'自学课程',deadline:null,mark:'课',meta:'',lessons:[{id:'keep-progress-id',title:'第一节',minutes:15,body:'导读与实践任务',files:[]}]});

test('incomplete courses can remain private drafts but cannot be published',()=>{
  const draft={...course(),subtitle:'',description:'',org:'',lessons:[]};
  assert.equal(prepareCourseSave(draft,'draft').status,'draft');
  assert.throws(()=>prepareCourseSave(draft,'published'),/至少添加一个课时/);
  assert.throws(()=>prepareCourseSave({...draft,title:'  '},'draft'),/课程名称/);
});
test('PDF-only lessons are publishable, without inventing a text lecture',()=>{
  const file={path:'c/l/f.pdf',name:'讲义.pdf',mime:'application/pdf',size:1024};
  const doc={...course(),lessons:[{id:'pdf-lesson',title:'PDF 学习',minutes:20,body:'',files:[file]}]};
  assert.deepEqual(courseIssues(doc),[]);
  assert.deepEqual(courseStats(doc),{lessons:1,minutes:20,files:1,pdfs:1});
  assert.equal(prepareCourseSave(doc,'published').lessons[0].files[0],file);
});
test('publication checks every lesson and keeps ordering and progress identifiers',()=>{
  const doc=course();
  doc.lessons.push({id:'second-progress-id',title:'第二节',minutes:25,body:'第二节的内容'});
  doc.lessons.reverse();
  const saved=prepareCourseSave(doc,'published');
  assert.deepEqual(saved.lessons.map(lesson=>lesson.id),['second-progress-id','keep-progress-id']);
  assert.equal(saved.meta,'2 节课 · 约 40 分钟');
  assert.equal(saved.title,'测试课程');
  assert.deepEqual(saved.tags,['人工智能']);
  assert.equal(saved.application_enabled,false);
  assert.throws(()=>prepareCourseSave({...doc,lessons:[{id:'bad',title:'',minutes:0,body:''}]},'published'),/第 1 节/);
  assert.throws(()=>prepareCourseSave({...doc,lessons:[{id:'bad',title:'标题',minutes:1.5,body:'讲义'}]},'published'),/1–300/);
});
test('a lesson can publish its ZIP package and preserve the original attachment details',()=>{
  const file={path:'c/l/f.zip',name:'配套代码.zip',mime:'application/zip',size:1024};
  const doc={...course(),lessons:[{id:'zip-lesson',title:'代码练习',minutes:20,body:'',files:[file]}]};
  assert.deepEqual(courseIssues(doc),[]);
  assert.equal(prepareCourseSave(doc,'published').lessons[0].files[0],file);
});
