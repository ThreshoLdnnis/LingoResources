export function normalizeInviteCode(value) {
 return String(value||'').replace(/[０-９]/g,c=>String(c.charCodeAt(0)-0xff10)).replace(/[\s-]/g,'');
}
export function inviteInputError(value) {
 return /^[1-9][0-9]{7}$/.test(normalizeInviteCode(value))?'':'请输入邀请人提供的 8 位数字内测码。旧版长码和带省略号的标识已停用。';
}
export function authErrorMessage(error) {
 const code=error?.code||'',message=error?.message||'';
 if(code==='email_not_confirmed'||/email not confirmed/i.test(message))return '账户已创建，请先确认邮箱，无需重新填写内测码注册。';
 if(code==='user_already_exists'||/already registered/i.test(message))return '该邮箱已注册，请直接登录；未收到确认邮件时可在登录后提示中重新发送。';
 if(/over_.*rate_limit|rate limit|too many requests|only request this after/i.test(code+' '+message))return '请求过于频繁，请至少等待 60 秒后重试。不要重复注册或更换内测码。';
 if(/email address not authorized|error sending confirmation/i.test(message)||code==='email_address_not_authorized')return '注册确认邮件暂时无法发送，请稍后重试或联系运营。请保留当前内测码。';
 if(/invalid login credentials/i.test(message)||code==='invalid_credentials')return '邮箱或密码不正确，请检查后重试。';
 if(/BETA_INVITE_INVALID/i.test(message))return '内测码不可用，请联系邀请人核对是否已使用或停用。';
 if(/database error saving new user/i.test(message)||code==='unexpected_failure')return '注册未完成，可能是内测码不可用或系统暂时异常。请联系邀请人核对，暂时不要反复提交。';
 return message||'暂时无法连接，请稍后重试。';
}
export function signupOutcome(data) {
 if(data?.session)return 'signed-in';
 if(Array.isArray(data?.user?.identities)&&data.user.identities.length===0)return 'existing';
 return 'check-email';
}
