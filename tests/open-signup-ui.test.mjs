import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import React from 'react';
import {authErrorMessage,signupOutcome} from '../lib/auth-rules.mjs';
import {translateUi} from '../lib/i18n/translate.mjs';

// Execute the real dialog handlers with scoped browser and hook adapters. This
// checks the outgoing Auth payload without creating accounts or sending mail.
function dialogHarness({mode='signup',signUp,signIn,resend}={}){
 const filename=path.resolve(import.meta.dirname,'../components/auth-dialog.tsx'),localRequire=createRequire(filename),ts=localRequire('typescript');
 const slots=[];let cursor=0,dirty=false,effects=[],tree,closed=0,authenticated=0,reloads=0;
 const setSlot=(index,value)=>{const next=typeof value==='function'?value(slots[index]):value;if(!Object.is(next,slots[index])){slots[index]=next;dirty=true;}};
 const hooks={...React,
  useState(initial){const index=cursor++;if(!(index in slots))slots[index]=initial;return[slots[index],value=>setSlot(index,value)];},
  useRef(initial){const index=cursor++;if(!(index in slots))slots[index]={current:initial};return slots[index];},
  useEffect(effect,deps){const index=cursor++,previous=slots[index];if(!previous||deps.some((v,i)=>!Object.is(v,previous[i]))){slots[index]=deps;effects.push(effect);}}
 };
 const s={connected:true,user:null,client:{auth:{signUp:signUp||(async()=>({data:{session:null,user:{identities:[{}]}},error:null})),
  signInWithPassword:signIn||(async()=>({data:{session:{}},error:null})),resend:resend||(async()=>({error:null}))}},
  reload:async()=>{reloads++;},notify:()=>{}};
 const mocks={'react':hooks,'@/lib/store':{useGrowth:()=>s},'@/lib/auth-rules.mjs':{authErrorMessage,signupOutcome},
  './i18n':{I18nRegion:({children})=>children,LanguageToggle:()=>null}};
 const module=new Module(filename);module.filename=filename;module.paths=Module._nodeModulePaths(path.dirname(filename));
 module.require=name=>Object.hasOwn(mocks,name)?mocks[name]:localRequire(name);
 const environment=`const window={location:{origin:'https://lingo.example'}};const setTimeout=()=>1;const clearTimeout=()=>{};class FormData{constructor(values){this.values=values;}get(name){return this.values[name]??null;}};`;
 module._compile(environment+ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
 const render=()=>{for(let n=0;n<8;n++){cursor=0;dirty=false;effects=[];tree=module.exports.AuthDialog({open:true,initialMode:mode,onOpenChange:open=>{if(!open)closed++;},onAuthenticated:()=>{authenticated++;}});for(const effect of effects)effect();if(!dirty)return tree;}throw Error('Hook adapter did not settle');};
 const walk=(node,result=[])=>{if(Array.isArray(node))node.forEach(n=>walk(n,result));else if(React.isValidElement(node)){result.push(node);walk(node.props.children,result);}return result;};
 const text=node=>Array.isArray(node)?node.map(text).join(''):React.isValidElement(node)?text(node.props.children):typeof node==='string'||typeof node==='number'?String(node):'';
 const nodes=()=>walk(render());
 return{nodes,text:()=>text(render()),form:()=>nodes().find(n=>n.type==='form'),
  button:label=>nodes().find(n=>n.type==='button'&&text(n).includes(label)),
  submit:values=>nodes().find(n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:values}),
  counts:()=>({closed,authenticated,reloads})};
}

test('Email signup submits only email and password, then waits for confirmation before granting entry',async()=>{
 const calls=[],h=dialogHarness({signUp:async payload=>{calls.push(payload);return{data:{session:null,user:{identities:[{}]}},error:null};}});
 const inputs=h.nodes().filter(n=>n.type==='input');
 assert.deepEqual(inputs.map(n=>n.props.name),['email','password']);
 assert.ok(inputs.every(n=>n.props.required));assert.equal(inputs[1].props.minLength,8);
 assert.doesNotMatch(h.text(),/内测|受邀|邀请码/);
 await h.submit({email:' member@example.invalid ',password:'valid-password'});
 assert.deepEqual(calls,[{email:'member@example.invalid',password:'valid-password',options:{emailRedirectTo:'https://lingo.example/explore/'}}]);
 assert.match(h.text(),/还差一步：确认邮箱/);assert.match(h.text(),/账户已创建/);
 assert.equal(h.form(),undefined);assert.equal(h.button('秒后可重发').props.disabled,true);
 assert.deepEqual(h.counts(),{closed:0,authenticated:0,reloads:0});
 h.button('我已确认，返回登录').props.onClick();
 assert.match(h.text(),/欢迎回到翎语/);assert.equal(h.nodes().find(n=>n.type==='input'&&n.props.name==='password').props.autoComplete,'current-password');
});

test('Repeated submit is locked and only a returned session completes registration',async()=>{
 let finish;const calls=[],result=new Promise(resolve=>{finish=resolve;}),h=dialogHarness({signUp:payload=>{calls.push(payload);return result;}});
 const first=h.submit({email:'member@example.invalid',password:'valid-password'});
 await h.submit({email:'second@example.invalid',password:'another-password'});
 assert.equal(calls.length,1);assert.equal(h.nodes().find(n=>n.type==='input').props.disabled,true);
 finish({data:{session:{access_token:'test-only'},user:{}},error:null});await first;
 assert.deepEqual(h.counts(),{closed:1,authenticated:1,reloads:1});
});

test('Existing signup goes to login; unconfirmed login can resend its own confirmation email',async()=>{
 const resent=[],h=dialogHarness({signUp:async()=>({data:{session:null,user:{identities:[]}},error:null}),
  signIn:async()=>({data:{session:null},error:{code:'email_not_confirmed'}}),resend:async payload=>{resent.push(payload);return{error:null};}});
 await h.submit({email:'member@example.invalid',password:'valid-password'});
 assert.match(h.text(),/该邮箱可能已经注册/);assert.match(h.text(),/欢迎回到翎语/);
 await h.submit({email:'member@example.invalid',password:'valid-password'});
 const resendButton=h.button('没收到邮件？重新发送');assert.equal(resendButton.props.disabled,false);
 resendButton.props.onClick();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(resent,[{type:'signup',email:'member@example.invalid',options:{emailRedirectTo:'https://lingo.example/explore/'}}]);
 assert.match(h.text(),/确认邮件已重新发送/);assert.deepEqual(h.counts(),{closed:0,authenticated:0,reloads:0});
});

test('Email signup and confirmation copy have English translations',()=>{
 for(const source of ['邮箱注册','注册账号','还没有账号？邮箱注册','如何注册并开始探索？',
  '账户已创建，请确认邮箱后登录，无需再次注册。','使用已有账号登录，或用邮箱注册新账号。']){
  const english=translateUi(source,'en');assert.notEqual(english,source);assert.doesNotMatch(english,/invite|beta/i);
 }
});
