import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, {createRequire} from 'node:module';

test('editorial flag updates merge independently, require admin, and cannot restore another account cache', async () => {
 const project=path.resolve(import.meta.dirname,'..');
 const ts=createRequire(path.join(project,'package.json'))('typescript');
 const slots=[];let pointer=0;
 const hooks={createContext:()=>({Provider:'test-provider'}),useContext:()=>null,useEffect:()=>{},
  useRef:value=>{const index=pointer++;if(!Object.hasOwn(slots,index))slots[index]={current:value};return slots[index];},
  useState:initial=>{const index=pointer++;if(!Object.hasOwn(slots,index))slots[index]=typeof initial==='function'?initial():initial;
   return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];}};
 const admin='41111111-1111-4111-8111-111111111103',member='41111111-1111-4111-8111-111111111102';
 let current={id:admin};
 let serverRows=[{id:'event',kind:'competition',title:'Original title',status:'published',featured:false,beginner_recommended:false}];
 const writes=[];
 const client={auth:{getUser:async()=>({data:{user:current}})},from:table=>{
  let write=null;
  const result=()=>({error:null,data:table==='resources'?(current?.id===admin?serverRows.map(row=>({...row})):[]):
   table==='profiles'?{name:'Fixture',school:'Test',bio:'',interests:[],role:current?.id===admin?'admin':'member',showcase:{}}:[]});
  const query={select:()=>query,order:()=>query,eq:(key,value)=>{if(write)write.filters[key]=value;return query;},is:()=>query,
   update:payload=>{write={table,payload:{...payload},filters:{},resolve:null};writes.push(write);return query;},
   single:()=>write?new Promise(resolve=>{write.resolve=resolve;}):Promise.resolve(result()),
   then:(resolve,reject)=>Promise.resolve(result()).then(resolve,reject)};
  return query;
 }};
 function compile(file,overrides={}){
  const filename=path.join(project,file),module=new Module(filename);module.filename=filename;module.paths=Module._nodeModulePaths(path.dirname(filename));
  const sourceRequire=createRequire(filename);
  module.require=name=>Object.hasOwn(overrides,name)?overrides[name]:sourceRequire(name);
  module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
  return module.exports;
 }
 const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 try{
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.invalid';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test-only';
  const {GrowthProvider}=compile('lib/store.tsx',{'react':hooks,'@supabase/supabase-js':{createClient:()=>client},'./data':{resources:[],posts:[]},'./showcase':compile('lib/showcase.ts')});
  const render=()=>{pointer=0;return GrowthProvider({children:null}).props.value;};
  await render().reload();let state=render();
  assert.equal(state.isAdmin,true);
  const featured=state.setResourceFlag('event','featured',true);
  const beginner=state.setResourceFlag('event','beginner_recommended',true);
  assert.equal(writes.length,2);
  assert.deepEqual(writes.map(write=>write.payload),[{featured:true},{beginner_recommended:true}]);
  assert.ok(writes.every(write=>write.table==='resources'&&write.filters.id==='event'));
  // A refresh may bring newer content while the independent flag writes are pending.
  serverRows=[{...serverRows[0],title:'Updated while flags were saving'}];
  await state.reload();
  writes[1].resolve({error:null,data:{id:'event'}});await beginner;
  writes[0].resolve({error:null,data:{id:'event'}});await featured;
  state=render();
  assert.equal(state.resources[0].title,'Updated while flags were saving');
  assert.equal(state.resources[0].featured,true);assert.equal(state.resources[0].beginner_recommended,true);

  const late=state.setResourceFlag('event','featured',false);
  current={id:member};await state.reload();state=render();
  assert.equal(state.isAdmin,false);assert.deepEqual(state.resources,[]);
  const before=writes.length;
  await assert.rejects(()=>state.setResourceFlag('event','beginner_recommended',true),/管理员|administrator/i);
  assert.equal(writes.length,before,'non-admin changes never issue a database write');
  writes[2].resolve({error:null,data:{id:'event'}});await late;state=render();
  assert.equal(state.user.id,member);assert.deepEqual(state.resources,[],'the previous admin request cannot repopulate another account cache');
 }finally{
  if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;
  if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=oldKey;
 }
});
