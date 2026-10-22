import test from 'node:test';
import assert from 'node:assert/strict';
import {accountNotifications,notificationKey} from '../lib/notifications.mjs';
test('notification reads are scoped to an account and to an individual review version',()=>{
 const rows=[{id:'a',user_id:'one',status:'approved',notification_version:'v1'},{id:'b',user_id:'two',status:'rejected',notification_version:'v2'},{id:'c',user_id:'one',status:'pending',notification_version:'v3'}];
 assert.deepEqual(accountNotifications(rows,'one').map(item=>item.id),['a']);
 assert.deepEqual(accountNotifications(rows,undefined),[]);
 const read=new Set([notificationKey(rows[0])]);
 assert.equal(read.has(notificationKey({...rows[0],notification_version:'new-review'})),false);
 assert.equal(read.has(notificationKey(rows[0])),true);
 assert.deepEqual(accountNotifications([{id:'d',status:'approved'}],undefined,false).map(item=>item.id),['d']);
});
