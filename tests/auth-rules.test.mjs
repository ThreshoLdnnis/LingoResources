import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeInviteCode,inviteInputError,authErrorMessage,signupOutcome} from '../lib/auth-rules.mjs';

test('Eight-digit invitations normalize full-width digits and copied spacing; old hints are rejected',()=>{
 assert.equal(normalizeInviteCode(' １２３４-５６７８\n'),'12345678');
 assert.equal(inviteInputError('１２３４ ５６７８'),'');
 for(const value of ['',null,'ZM-DC7D…CAC2','1234567','123456789','abcdefgh','01234567'])assert.ok(inviteInputError(value));
});
test('Unconfirmed and existing accounts are distinguished from invitation and service failures',()=>{
 assert.match(authErrorMessage({code:'email_not_confirmed'}),/账户已创建/);
 assert.match(authErrorMessage({code:'over_email_send_rate_limit'}),/60 秒/);
 assert.match(authErrorMessage({message:'Database error saving new user'}),/可能.*系统/);
 assert.match(authErrorMessage({message:'BETA_INVITE_INVALID'}),/内测码不可用/);
 assert.match(authErrorMessage({code:'invalid_credentials'}),/邮箱或密码/);
 assert.match(authErrorMessage({code:'email_address_not_authorized'}),/邮件/);
 assert.equal(signupOutcome({session:{},user:{}}),'signed-in');
 assert.equal(signupOutcome({session:null,user:{identities:[]}}),'existing');
 assert.equal(signupOutcome({session:null,user:{identities:[{}]}}),'check-email');
});
