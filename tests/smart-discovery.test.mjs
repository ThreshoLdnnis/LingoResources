import test from 'node:test';
import assert from 'node:assert/strict';
import {domesticCities,internationalCities,matchesLocation,filterResources,understandRequest,recommendResources} from '../lib/matching.mjs';
const now='2026-10-14T04:00:00Z';
const row=(id,extra={})=>({id,kind:'tool',title:'AI工具 '+id,subtitle:'入门',description:'免费使用',org:'测试',tags:['人工智能'],location:'在线工具',status:'published',featured:false,deadline:null,...extra});
const ids=result=>result.rows.map(x=>x.resource.id);

test('city lists include all requested cities; aliases and online classifications work',()=>{
  assert.equal(domesticCities.length,9);assert.equal(internationalCities.length,10);
  assert.ok(matchesLocation('Macau / Hong Kong','澳门'));assert.ok(matchesLocation('New York, USA','纽约'));
  assert.ok(matchesLocation('London / Remote','伦敦'));assert.ok(matchesLocation('在线工具','线上'));assert.ok(matchesLocation('自学课程','线上'));
  assert.equal(matchesLocation('Paris, France','上海'),false);
  const rows=[row('a',{location:'Seoul'}),row('b',{org:'Seoul University',location:'Paris'})];
  assert.deepEqual(filterResources(rows,'','all','首尔','featured').map(r=>r.id),['a']);
});
test('natural-language request recognizes goal, city, topic, level and rolling deadline',()=>{
  const intent=understandRequest('零基础，想在深圳参加编程比赛，30天内报名');
  assert.equal(intent.goal,'competition');assert.equal(intent.location,'深圳');assert.equal(intent.level,'beginner');assert.equal(intent.horizon,'30');assert.ok(intent.tags.includes('编程'));assert.deepEqual(intent.keywords,[]);
  assert.deepEqual(understandRequest('想用免费工具做 PPT 和图表').keywords,[]);
  assert.ok(!understandRequest('email 效率工具').tags.includes('人工智能'));
});
test('deadline exclusion uses Shanghai day, retains today, rejects past/draft, and applies horizon',()=>{
  const rows=[row('past',{kind:'competition',deadline:'2026-10-13'}),row('today',{kind:'competition',deadline:'2026-10-14'}),row('future',{kind:'competition',deadline:'2026-12-14'}),row('unknown',{kind:'competition'}),row('draft',{status:'draft'}),row('prep')];
  const result=recommendResources(rows,{goal:'competition',horizon:'30'},{now});
  assert.deepEqual(new Set(ids(result)),new Set(['today','prep']));assert.ok(result.rows.find(x=>x.resource.id==='today').notes.some(x=>x.includes('今天截止')));
  assert.equal(result.excluded.expired,1);
  assert.equal(recommendResources([row('late',{kind:'competition',deadline:'2026-10-14'})],{}, {now:'2026-10-14T17:00:00Z'}).rows.length,0);
});
test('city restriction is strict unless online alternatives are selected; overrides beat inferred city',()=>{
  const rows=[row('local',{location:'深圳'}),row('online'),row('other',{location:'北京'})];
  assert.deepEqual(ids(recommendResources(rows,{location:'深圳',includeOnline:false},{now})),['local']);
  assert.deepEqual(new Set(ids(recommendResources(rows,{location:'深圳',includeOnline:true},{now}))),new Set(['local','online']));
  assert.deepEqual(ids(recommendResources(rows,{text:'想在深圳学 AI',location:'北京',includeOnline:false},{now})),['other']);
});
test('free-only recommendations never infer free from missing prices or limited trials',()=>{
  const rows=[row('free'),row('trial',{description:'免费试用后收费'}),row('unknown',{description:'请查看官方价格'}),row('open',{description:'开源项目'}),row('paid',{description:'付费软件'})];
  assert.deepEqual(new Set(ids(recommendResources(rows,{price:'free'},{now}))),new Set(['free','open']));
  assert.ok(recommendResources(rows,{price:'free'},{now}).rows.every(x=>x.reasons.some(r=>r.includes('免费或开源'))));
});
test('unknown levels are labelled, advanced resources excluded for beginners, explanations follow source',()=>{
  const rows=[row('beginner'),row('advanced',{subtitle:'高级',description:'适合专业基础'}),row('unknown',{subtitle:'资料',description:'免费工具'})];
  const result=recommendResources(rows,{level:'beginner',tags:['人工智能']},{now});
  assert.ok(!ids(result).includes('advanced'));
  assert.ok(result.rows.find(x=>x.resource.id==='unknown').notes.some(n=>n.includes('未注明')));
  assert.ok(result.rows.find(x=>x.resource.id==='beginner').reasons.some(n=>n.includes('入门')));
});
test('explicit interests constrain results; private context only boosts relevant public resources',()=>{
  const rows=[row('code',{tags:['编程'],title:'Python编程'}),row('design',{title:'Figma原型',tags:['产品设计']}),row('draft',{status:'draft',tags:['编程']})];
  const result=recommendResources(rows,{tags:['编程']},{now,interests:['产品设计'],favorites:['design']});
  assert.deepEqual(ids(result),['code']);
  assert.ok(!result.rows[0].reasons.some(r=>r.includes('产品设计')));
  assert.equal(recommendResources([row('design')],{personalize:false},{now,interests:['人工智能']}).rows[0].reasons.some(r=>r.includes('你的兴趣')),false);
});
test('unrecognised subject keywords do not return unrelated resources, and negation is respected',()=>{
  const rows=[row('science',{title:'医学研究工具',tags:['研究']}),row('code',{title:'Python编程',tags:['编程']}),row('design',{title:'设计工具',tags:['产品设计']})];
  assert.deepEqual(ids(recommendResources(rows,{text:'我想找医学相关工具'},{now})),['science']);
  const result=recommendResources(rows,{text:'不想编程，只想学习产品设计'},{now});
  assert.ok(!ids(result).includes('code'));assert.ok(ids(result).includes('design'));
});
test('path contains only matching published resources; gaps remain empty and IDs are unique',()=>{
  const a=row('tool'),b=row('course',{kind:'course'});
  const result=recommendResources([a,b,a,row('private',{kind:'project',status:'draft'})],{tags:['人工智能']},{now});
  assert.equal(result.rows.length,2);assert.equal(result.path[2].match,null);
  assert.equal(result.path[0].match.resource.id,'course');assert.equal(result.path[1].match.resource.id,'tool');
});
