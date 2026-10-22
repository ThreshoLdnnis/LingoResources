import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildHtmlCourseDocument,HTML_COURSE_CSP,HTML_COURSE_SANDBOX} from '../lib/html-course.mjs';

test('interactive HTML is sandboxed without sharing platform origin or navigation permissions',async()=>{
  assert.equal(HTML_COURSE_SANDBOX,'allow-scripts');
  const component=await readFile(new URL('../components/course-materials.tsx',import.meta.url),'utf8');
  assert.match(component,/sandbox=\{HTML_COURSE_SANDBOX\}/);
  assert.match(component,/srcDoc=\{source\}/);
  assert.doesNotMatch(component,/dangerouslySetInnerHTML|allow-same-origin/);
  assert.ok(HTML_COURSE_CSP.includes("connect-src 'none'"));
  assert.ok(HTML_COURSE_CSP.includes("default-src 'none'"));
  assert.ok(HTML_COURSE_CSP.includes("form-action 'none'"));
});

test('the restrictive policy precedes author code while preserving inline interactions and Chinese text',()=>{
  const original='<!doctype html><html><head><style>.answer{color:purple}</style></head><body><h1>为什么需要工作流</h1><button onclick="this.textContent=\'答对了\'">选择答案</button><script>window.lessonReady=true</script></body></html>';
  const output=buildHtmlCourseDocument(original);
  assert.ok(output.indexOf('Content-Security-Policy')<output.indexOf('<script>'));
  assert.ok(output.endsWith(original+'</body></html>'));
  assert.ok(output.includes("script-src 'unsafe-inline'"));
  assert.ok(output.includes('event.preventDefault();event.stopImmediatePropagation()'));
  assert.ok(output.includes("href.startsWith('#')"));
});
