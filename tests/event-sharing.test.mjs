import test from 'node:test';
import assert from 'node:assert/strict';
import {competitionRecruitment,validateCompetitionCover,COVER_LIMIT} from '../lib/event-sharing.mjs';

test('only published event resources can become a linked recruitment draft',()=>{
 const event={id:'event',kind:'competition',status:'published',title:'校园 AI 黑客松',tags:['编程','组队']};
 const draft=competitionRecruitment(event);
 assert.equal(draft.resource_id,'event');assert.equal(draft.type,'recruitment');
 assert.ok(draft.title.includes(event.title));assert.deepEqual(draft.tags,['编程','组队']);
 assert.equal(Object.hasOwn(draft,'body'),false,'the author writes their own recruitment message');
 for(const kind of ['course','tool','internship','project'])assert.throws(()=>competitionRecruitment({...event,kind}),/赛事活动/);
 assert.throws(()=>competitionRecruitment({...event,status:'draft'}),/赛事活动/);
 assert.throws(()=>competitionRecruitment(null),/赛事活动/);
});

test('official posters accept common image formats but reject non-images and oversized files',()=>{
 assert.deepEqual(validateCompetitionCover({name:'海报.JPG',type:'image/jpeg',size:COVER_LIMIT}),{extension:'jpg',mime:'image/jpeg'});
 assert.equal(validateCompetitionCover({name:'封面.webp',type:'',size:1024}).mime,'image/webp');
 for(const file of [{name:'海报.svg',type:'image/svg+xml',size:1024},{name:'封面.png',type:'image/png',size:COVER_LIMIT+1},{name:'封面.png',type:'image/png',size:0}])assert.throws(()=>validateCompetitionCover(file),/5MB/);
 assert.throws(()=>validateCompetitionCover({name:'封面.png',type:'text/html',size:1024}),/不一致/);
});
