import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, {createRequire} from 'node:module';

test('account switch and sign-out clear cached private data even when resource loading fails', async () => {
 const project=path.resolve(import.meta.dirname,'..');
 const projectRequire=createRequire(path.join(project,'package.json'));
 const ts=projectRequire('typescript');
 const slots=[];let pointer=0;
 const hooks={createContext:()=>({Provider:'test-provider'}),useContext:()=>null,useEffect:()=>{},
  useRef:value=>{const index=pointer++;if(!Object.hasOwn(slots,index))slots[index]={current:value};return slots[index];},
  useState:initial=>{const index=pointer++;if(!Object.hasOwn(slots,index))slots[index]=typeof initial==='function'?initial():initial;
   return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];}};
 const a='41111111-1111-4111-8111-111111111101',b='41111111-1111-4111-8111-111111111102';
 let current={id:a},offline=false,fromCalls=0,blockedResource;
 const privateBlock={id:'71111111-1111-4111-8111-111111111101',kind:'note',title:'Private A',body:'A_PRIVATE',detail:'',url:'',date:'',imagePath:'',visible:false,wide:false};
 const client={auth:{getUser:async()=>({data:{user:current}})},from:table=>{
  fromCalls++;
  const result=()=>({error:offline&&table==='resources'?{message:'offline'}:null,data:
   table==='resources'?[{id:'A_PRIVATE_RESOURCE',status:'draft'}]:table==='profiles'?{name:'A_PRIVATE_NAME',school:'A_PRIVATE_SCHOOL',bio:'A_PRIVATE_BIO',interests:['A'],role:'admin',avatar_url:'A_PRIVATE_AVATAR',
    showcase:{version:1,theme:'rose',status:'A_PRIVATE_STATUS',tags:[],blocks:[privateBlock],published:false}}:
   table==='experiences'?[{id:'A_PRIVATE_EXPERIENCE'}]:table==='favorites'?[{resource_id:'A_PRIVATE_FAVORITE'}]:table==='lesson_progress'?[{lesson_id:'A_PRIVATE_LESSON'}]:table==='applications'?[{id:'A_PRIVATE_APPLICATION'}]:table==='application_notification_reads'?[{application_id:'A_PRIVATE_APPLICATION',notification_version:'A_PRIVATE_NOTIFICATION'}]:[]});
  const query={select:()=>query,order:()=>query,eq:()=>query,is:()=>query,single:async()=>result(),then:(resolve,reject)=>(table==='resources'&&blockedResource?blockedResource.then(result):Promise.resolve(result())).then(resolve,reject)};
  return query;
 }};
 function compile(file,overrides={}){
  const filename=path.join(project,file),module=new Module(filename);module.filename=filename;module.paths=Module._nodeModulePaths(path.dirname(filename));
  const sourceRequire=createRequire(filename);
  module.require=name=>Object.hasOwn(overrides,name)?overrides[name]:sourceRequire(name);
  module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
  return module.exports;
 }
 const model=compile('lib/showcase.ts');
 const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 try{
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.invalid';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test-only';
  const {GrowthProvider}=compile('lib/store.tsx',{'react':hooks,'@supabase/supabase-js':{createClient:()=>client},'./data':{resources:[],posts:[]},'./showcase':model});
  const render=()=>{pointer=0;return GrowthProvider({children:null}).props.value;};
  await render().reload();
  let state=render();assert.equal(state.profile.name,'A_PRIVATE_NAME');assert.equal(state.showcase.blocks.length,1);assert.equal(state.isAdmin,true);assert.equal(state.favorites.length,1);assert.equal(state.readNotifications.length,1);
  current={id:b};offline=true;await state.reload();state=render();
  assert.equal(state.user.id,b);assert.equal(state.isAdmin,false);assert.equal(state.avatarUrl,'');assert.equal(state.showcase.blocks.length,0);
  for(const key of ['resources','posts','favorites','completed','applications','experiences','readNotifications'])assert.deepEqual(state[key],[]);
  assert.doesNotMatch(JSON.stringify({profile:state.profile,showcase:state.showcase}),/A_PRIVATE/);
  assert.equal(state.error,'offline');
  current=null;await state.reload();state=render();assert.equal(state.user,null);assert.equal(state.showcase.published,false);assert.equal(state.avatarUrl,'');
  assert.doesNotMatch(JSON.stringify(state.profile),/A_PRIVATE/);
  fromCalls=0;await state.reload();assert.equal(fromCalls,0,'Guests must not request any platform tables');
  current={id:a};offline=false;await state.reload();state=render();
  let release;blockedResource=new Promise(resolve=>{release=resolve;});
  const stale=state.reload();await new Promise(resolve=>setImmediate(resolve));
  current=null;await state.reload();release();await stale;state=render();
  assert.equal(state.user,null);assert.equal(state.loading,false);
  for(const key of ['resources','posts','favorites','completed','applications','experiences','readNotifications'])assert.deepEqual(state[key],[],'A request begun before sign-out must not restore '+key);
 }finally{
  if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;
  if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=oldKey;
 }
});
