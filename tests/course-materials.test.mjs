import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMaterial,MATERIAL_LIMIT,MATERIAL_ACCEPT,isArchiveMaterial} from '../lib/course-materials.mjs';
test('course uploads normalize supported extensions and enforce file limits',()=>{
  assert.deepEqual(validateMaterial({name:'课程.PDF',size:1024}),{extension:'pdf',mime:'application/pdf'});
  assert.equal(validateMaterial({name:'课程.pptx',size:MATERIAL_LIMIT}).mime,'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  assert.throws(()=>validateMaterial({name:'程序.exe',size:1024}),/请选择/);
  assert.throws(()=>validateMaterial({name:'课程.pdf',size:0}),/不能为空/);
  assert.throws(()=>validateMaterial({name:'课程.pdf',size:MATERIAL_LIMIT+1}),/20MB/);
  assert.throws(()=>validateMaterial({name:'a'.repeat(141)+'.pdf',size:1024}),/140/);
});
test('single-file HTML lessons accept both extensions regardless of browser MIME',()=>{
  for(const name of ['n8n_lesson0_why.html','课件.HTM'])for(const type of ['','text/html','application/octet-stream']) {
    assert.deepEqual(validateMaterial({name,size:14763,type}),{extension:name.split('.').at(-1).toLowerCase(),mime:'text/html'});
  }
  for(const ext of ['.html','.htm'])assert.ok(MATERIAL_ACCEPT.split(',').includes(ext));
  assert.throws(()=>validateMaterial({name:'课件.html',size:0}),/不能为空/);
  assert.throws(()=>validateMaterial({name:'课件.html',size:MATERIAL_LIMIT+1}),/20MB/);
  assert.throws(()=>validateMaterial({name:'课件.html.exe',size:1024}),/请选择/);
});
test('ZIP course packages accept browser MIME variations and retain the existing limits',()=>{
  for(const type of ['', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream']) {
    assert.deepEqual(validateMaterial({name:'课程配套代码.ZIP',size:1024,type}),{extension:'zip',mime:'application/zip'});
  }
  assert.ok(MATERIAL_ACCEPT.split(',').includes('.zip'));
  assert.equal(isArchiveMaterial({mime:'application/zip'}),true);
  assert.equal(isArchiveMaterial({mime:'application/pdf'}),false);
  assert.equal(validateMaterial({name:'代码.zip',size:MATERIAL_LIMIT}).mime,'application/zip');
  assert.throws(()=>validateMaterial({name:'代码.zip',size:0}),/不能为空/);
  assert.throws(()=>validateMaterial({name:'代码.zip',size:MATERIAL_LIMIT+1}),/20MB/);
  assert.throws(()=>validateMaterial({name:'代码.zip.exe',size:1024}),/请选择/);
});
