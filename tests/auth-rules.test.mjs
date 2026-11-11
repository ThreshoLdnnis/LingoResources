import test from 'node:test';
import assert from 'node:assert/strict';
import {authErrorMessage,signupOutcome} from '../lib/auth-rules.mjs';

test('Open email signup distinguishes confirmation, existing accounts, throttling and service failures',()=>{
 assert.match(authErrorMessage({code:'email_not_confirmed'}),/账户已创建/);
 assert.match(authErrorMessage({code:'over_email_send_rate_limit'}),/60 秒/);
 assert.match(authErrorMessage({message:'Database error saving new user'}),/注册服务暂时异常/);
 assert.match(authErrorMessage({message:'BETA_INVITE_INVALID'}),/注册服务暂时异常/);
 assert.match(authErrorMessage({code:'invalid_credentials'}),/邮箱或密码/);
 assert.match(authErrorMessage({code:'email_address_not_authorized'}),/邮件/);
 assert.match(authErrorMessage({code:'user_already_exists'}),/已注册/);
 for(const error of [{code:'email_not_confirmed'},{code:'over_email_send_rate_limit'},
  {code:'email_address_not_authorized'},{code:'unexpected_failure'},{message:'BETA_INVITE_INVALID'}]){
  assert.doesNotMatch(authErrorMessage(error),/内测|邀请码|邀请人/);
 }
 assert.equal(authErrorMessage(null),'暂时无法连接，请稍后重试。');
 assert.equal(authErrorMessage({message:'A network connection was lost'}),'A network connection was lost');
});
test('Signup outcome keeps email confirmation required until an authenticated session exists',()=>{
 assert.equal(signupOutcome({session:{},user:{}}),'signed-in');
 assert.equal(signupOutcome({session:null,user:{identities:[]}}),'existing');
 assert.equal(signupOutcome({session:null,user:{identities:[{}]}}),'check-email');
 assert.equal(signupOutcome(null),'check-email');
});
