import test from 'node:test';
import assert from 'node:assert/strict';
import {selectBeginnerEvents} from '../lib/beginner-events.mjs';

const event = (id, extra = {}) => ({id,kind:'competition',status:'published',beginner_recommended:true,featured:false,deadline:'2026-11-10',...extra});
const now = new Date('2026-10-29T08:00:00Z');

test('beginner recommendations require an explicitly selected published event, independent of featured', () => {
  const selected = event('selected');
  const resources = [selected,event('not-selected',{beginner_recommended:false}),event('legacy',{beginner_recommended:undefined}),
    event('draft',{status:'draft'}),event('featured-only',{featured:true,beginner_recommended:false}),
    ...['internship','course','tool','project'].map(kind=>event(kind,{kind}))];
  assert.deepEqual(selectBeginnerEvents(resources,now),[selected]);
});

test('deadlines expire at Shanghai midnight while events without deadlines remain visible', () => {
  const resources = [event('yesterday',{deadline:'2026-10-28'}),event('today',{deadline:'2026-10-29'}),
    event('tomorrow',{deadline:'2026-10-30'}),event('no-date',{deadline:null}),event('missing-date',{deadline:undefined})];
  assert.deepEqual(selectBeginnerEvents(resources,new Date('2026-10-29T15:59:59.999Z')).map(r=>r.id),['today','tomorrow','no-date','missing-date']);
  assert.deepEqual(selectBeginnerEvents(resources,new Date('2026-10-29T16:00:00.000Z')).map(r=>r.id),['tomorrow','no-date','missing-date']);
});

test('malformed or impossible dates cannot keep an expired recommendation visible', () => {
  const resources = ['2026-13-01','2026-02-30','2026-1-30','2026-10-29T08:00:00Z','later',42,'0000-12-31'].map((deadline,i)=>event(String(i),{deadline}));
  assert.deepEqual(selectBeginnerEvents(resources,now),[]);
  assert.equal(selectBeginnerEvents([event('leap',{deadline:'2028-02-29'})],now).length,1);
});

test('selection preserves editorial source order and does not mutate resources', () => {
  const first = Object.freeze(event('z')), second = Object.freeze(event('a',{featured:true}));
  const resources = Object.freeze([first,second]);
  const selected = selectBeginnerEvents(resources,now);
  assert.deepEqual(selected,[first,second]);
  assert.equal(selected[0],first);
  assert.notEqual(selected,resources);
});
