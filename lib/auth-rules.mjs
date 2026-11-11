export function authErrorMessage(error) {
 const code=error?.code||'',message=error?.message||'';
 if(code==='email_not_confirmed'||/email not confirmed/i.test(message))return '账户已创建，请先确认邮箱后登录。';
 if(code==='user_already_exists'||/already registered/i.test(message))return '该邮箱已注册，请直接登录；未收到确认邮件时可在登录后提示中重新发送。';
 if(/over_.*rate_limit|rate limit|too many requests|only request this after/i.test(code+' '+message))return '请求过于频繁，请至少等待 60 秒后重试，避免重复提交。';
 if(/email address not authorized|error sending confirmation/i.test(message)||code==='email_address_not_authorized')return '注册确认邮件暂时无法发送，请稍后重试或联系运营。';
 if(/invalid login credentials/i.test(message)||code==='invalid_credentials')return '邮箱或密码不正确，请检查后重试。';
 if(/BETA_INVITE_INVALID|database error saving new user/i.test(message)||code==='unexpected_failure')return '注册服务暂时异常，账户创建未完成。请稍后重试或联系运营，避免重复提交。';
 return message||'暂时无法连接，请稍后重试。';
}
export function signupOutcome(data) {
 if(data?.session)return 'signed-in';
 if(Array.isArray(data?.user?.identities)&&data.user.identities.length===0)return 'existing';
 return 'check-email';
}
