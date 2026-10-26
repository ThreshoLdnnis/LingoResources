import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {translateUi,validLocale,localeDate} from '../lib/i18n/translate.mjs';
import {messages} from '../lib/i18n/en.mjs';
import {understandRequest,filterResources,recommendResources} from '../lib/matching.mjs';

test('English UI catalog, dynamic counts and dates preserve values; Chinese and unknown content are unchanged',()=>{
 assert.ok(Object.keys(messages).length>1300);
 assert.equal(translateUi('登录','en'),'Log in');
 assert.equal(translateUi('登录','zh-CN'),'登录');
 assert.equal(translateUi('用户自写的独特课程标题','en'),'用户自写的独特课程标题');
 assert.equal(translateUi('共 42 条 · 第 13–24 条','en'),'42 total · Showing 13–24');
 assert.equal(translateUi('第 2 页','en'),'Page 2');
 assert.equal(translateUi('1 节课','en'),'1 lesson');
 assert.equal(translateUi('11 节课','en'),'11 lessons');
 assert.equal(translateUi('2026 年 10 月','en'),'October 2026');
 assert.equal(translateUi('匹配方向：人工智能、编程','en'),'Matching interests: Artificial intelligence, Coding');
 assert.equal(validLocale(null),'zh-CN');assert.equal(validLocale('en'),'en');assert.equal(validLocale('fr'),'zh-CN');
 assert.equal(localeDate('invalid','en'),'');assert.match(localeDate('2026-10-26T00:00:00Z','en',{month:'long',day:'numeric'}),/26 October/);
 for(const [key,value] of Object.entries(messages))assert.ok(value.length>0,key);
});

function loadRegion(){
 const filename=path.resolve(import.meta.dirname,'../components/i18n.tsx'),require=createRequire(filename),ts=require('typescript');
 const module=new Module(filename);module.filename=filename;module.paths=Module._nodeModulePaths(path.dirname(filename));
 module.require=name=>name==='next/navigation'?{usePathname:()=>'/learn/'}:name==='@/lib/i18n/translate.mjs'?require('../lib/i18n/translate.mjs'):require(name);
 module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
 return module.exports;
}
test('Translation keeps original option values, authored content, form drafts, handlers, keys and component types',()=>{
 const {localizeUiNode}=loadRegion();const click=()=>{};
 const tree=React.createElement('form',{onSubmit:click},
  React.createElement('select',{key:'select',name:'location',defaultValue:'上海'},React.createElement('optgroup',{key:'group',label:'国内城市'},React.createElement('option',{key:'city'},'上海'))),
  React.createElement('input',{key:'draft',name:'title',defaultValue:'登录',placeholder:'课程标题',onChange:click}),
  React.createElement('h2',{key:'original',translate:'no'},'登录'),
  React.createElement('textarea',{key:'textarea',defaultValue:'私人草稿'}),
  React.createElement('button',{key:'next',onClick:click,'aria-label':'第 2 页'},'下一页'));
 const localized=localizeUiNode(tree,'en');
 assert.equal(localized.type,tree.type);assert.equal(localized.props.onSubmit,click);
 const children=localized.props.children;
 assert.equal(children[0].props.defaultValue,'上海');assert.equal(children[0].props.children.props.label,'Cities in China');
 assert.equal(children[0].props.children.props.children.props.value,'上海');
 assert.equal(children[0].props.children.props.children.props.children,'Shanghai');
 assert.equal(children[1].key,localizeUiNode(tree,'zh-CN').props.children[1].key);assert.equal(children[1].props.defaultValue,'登录');assert.equal(children[1].props.onChange,click);
 assert.equal(children[2].props.children,'登录');assert.equal(children[3].props.defaultValue,'私人草稿');
 assert.equal(children[4].props['aria-label'],'Page 2');assert.equal(children[4].props.children,'Next');
 const html=renderToStaticMarkup(localized);assert.match(html,/value="上海"/);assert.match(html,/value="登录"/);
});
test('English discovery uses the same stored interests and matching rules as Chinese',()=>{
 const intent=understandRequest('I want to join a programming competition in Shenzhen within 30 days');
 assert.equal(intent.goal,'competition');assert.equal(intent.location,'深圳');assert.equal(intent.horizon,'30');assert.deepEqual(intent.tags,['编程']);assert.deepEqual(intent.keywords,[]);
 const rows=[{id:'a',kind:'competition',status:'published',title:'编程挑战赛',description:'初学者免费活动',tags:['编程'],location:'深圳',deadline:'2026-11-01'},
 {id:'private',kind:'competition',status:'draft',title:'私人编程赛',tags:['编程'],location:'深圳'}];
 assert.deepEqual(filterResources(rows,'programming','all','全部','featured').map(r=>r.id),['a']);
 assert.deepEqual(recommendResources(rows,{text:'I want to join a programming competition in Shenzhen within 30 days'},{now:'2026-10-26'}).rows.map(x=>x.resource.id),['a']);
});
