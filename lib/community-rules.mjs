export function canRegisterResource(resource, today = new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Shanghai' }).format(new Date())) {
  return resource?.application_enabled === true && ['competition','project'].includes(resource.kind)
    && resource.status === 'published' && (!resource.deadline || resource.deadline >= today);
}
export function ownsContent(ownerId, userId, connected) {
  return !!ownerId && ownerId === (connected ? userId : 'demo');
}
export function postDraft(form) {
  const title=String(form.get('title')||'').trim(), body=String(form.get('body')||'').trim();
  const type=String(form.get('type'));
  const tags=[...new Set(String(form.get('tags')||'').split(/[,，]/).map(t=>t.trim()).filter(Boolean))];
  if (!title || title.length>100) throw new Error('请填写 100 字以内的标题。');
  if (body.length<20 || body.length>5000) throw new Error('正文需要 20–5000 字。');
  if (!['recruitment','discussion'].includes(type)) throw new Error('请选择有效的发布类型。');
  if (tags.length>12 || tags.some(t=>t.length>24)) throw new Error('最多 12 个标签，每个不超过 24 字。');
  return {title,body,type,tags};
}
