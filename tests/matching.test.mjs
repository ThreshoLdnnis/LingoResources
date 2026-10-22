import test from 'node:test';
import assert from 'node:assert/strict';
import {rankResources,filterResources} from '../lib/matching.mjs';
const rows=[
{id:'a',kind:'internship',title:'设计实习',subtitle:'体验',org:'例',description:'测试',tags:['产品设计'],location:'上海 / 远程',featured:true,status:'published',deadline:'2026-11-30'},
{id:'b',kind:'competition',title:'AI 比赛',subtitle:'实验',org:'例',description:'测试',tags:['人工智能','组队'],location:'线上',featured:true,status:'published',deadline:'2026-10-28'},
{id:'c',kind:'course',title:'课程',subtitle:'学习',org:'例',description:'测试',tags:['知识管理'],location:'自学',featured:false,status:'published',deadline:null},
{id:'d',kind:'project',title:'私有草稿',subtitle:'秘密',org:'例',description:'测试',tags:['产品设计'],location:'线上',featured:true,status:'draft',deadline:null}
];
test('search combines query, kind and location and never returns drafts',()=>{assert.deepEqual(filterResources(rows,'设计','internship','远程','featured').map(x=>x.id),['a']);assert.equal(filterResources(rows,'私有','all','全部','featured').length,0);});
test('deadline ordering keeps undated resources after dated opportunities',()=>{assert.deepEqual(filterResources(rows,'','all','全部','deadline').map(x=>x.id),['b','a','c']);});
test('matching considers explicit goals and provides matched tags',()=>{const result=rankResources(rows,'internship',['产品设计']);assert.equal(result[0].resource.id,'a');assert.deepEqual(result[0].matched,['产品设计']);assert.ok(!result.some(x=>x.resource.id==='d'));});
test('skill target prioritizes a course even when interest is absent',()=>{assert.equal(rankResources(rows,'skill',[])[0].resource.id,'c');});
test('whitespace-only search shows all published rows',()=>{assert.equal(filterResources(rows,'   ','all','全部','featured').length,3);});
