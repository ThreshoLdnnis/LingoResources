import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('Protected routes never render member content while signed out or checking a session; the introduction stays public',()=>{
 const filename=path.resolve(import.meta.dirname,'../components/member-access.tsx'),localRequire=createRequire(filename);
 const ts=localRequire('typescript');let pathname='/',state={user:null,loading:false};
 const module=new Module(filename);module.filename=filename;module.paths=Module._nodeModulePaths(path.dirname(filename));
 const mocks={'next/navigation':{usePathname:()=>pathname,useRouter:()=>({push:()=>{}})},'@/lib/store':{useGrowth:()=>state},
  './auth-dialog':{AuthDialog:()=>null},'./i18n':{I18nRegion:({children})=>children,LanguageToggle:()=>null},'next/link':{__esModule:true,default:({children,href,...props})=>React.createElement('a',{href,...props},children)}};
 module.require=name=>Object.hasOwn(mocks,name)?mocks[name]:localRequire(name);
 module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
 const Boundary=module.exports.MemberBoundary;
 const render=()=>renderToStaticMarkup(React.createElement(Boundary,null,React.createElement('div',null,'MEMBER_ONLY_LESSON_BODY')));
 assert.match(render(),/MEMBER_ONLY_LESSON_BODY/);
 for(const route of ['explore','discover','learn','projects','community','profile','admin']){
  pathname='/'+route+'/';state={user:null,loading:false};
  assert.doesNotMatch(render(),/MEMBER_ONLY_LESSON_BODY/);assert.match(render(),/邮箱注册/);
  state={user:null,loading:true};assert.doesNotMatch(render(),/MEMBER_ONLY_LESSON_BODY/);assert.match(render(),/确认登录状态/);
  state={user:{id:'member'},loading:false};assert.match(render(),/MEMBER_ONLY_LESSON_BODY/);
 }
});
