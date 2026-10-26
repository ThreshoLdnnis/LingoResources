import {messages} from './en.mjs';

export const LOCALE_STORAGE_KEY='lingo-locale';
export const supportedLocales=['zh-CN','en'];
export function validLocale(value){return value==='en'?'en':'zh-CN'}
export function normalizeMessage(value){return value.replace(/\s+/g,' ').trim()}
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const countGrammar=value=>value.replace(/\b1 (lessons|resources|materials|users|courses|files|days|applicants|comments)\b/g,(_,noun)=>'1 '+noun.slice(0,-1)).replace(/\b1 matches\b/g,'1 match');
const patterns=Object.entries(messages).filter(([key])=>/\{\d+\}/.test(key)).sort(([a],[b])=>b.replace(/\{\d+\}/g,'').length-a.replace(/\{\d+\}/g,'').length).map(([key,text])=>{
  const slots=[];let source='',last=0;
  for(const match of key.matchAll(/\{(\d+)\}/g)){source+=escape(key.slice(last,match.index))+'([\\s\\S]+?)';slots.push(Number(match[1]));last=match.index+match[0].length}
  return {pattern:new RegExp('^'+source+escape(key.slice(last))+'$','u'),text,slots};
});

export function translateUi(value,locale='zh-CN'){
  if(typeof value!=='string'||locale!=='en'||!/[\u3400-\u9fff]/.test(value))return value;
  const key=normalizeMessage(value),leading=value.match(/^\s*/)?.[0]||'',trailing=value.match(/\s*$/)?.[0]||'';
  if(Object.hasOwn(messages,key))return leading+messages[key]+trailing;
  const month=key.match(/^(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月$/);
  if(month&&Number(month[2])>=1&&Number(month[2])<=12)return leading+new Intl.DateTimeFormat('en-GB',{month:'long',...(month[1]?{year:'numeric'}:{}),timeZone:'UTC'}).format(new Date(Date.UTC(Number(month[1]||2000),Number(month[2])-1,1)))+trailing;
  const inline=text=>text.split('、').map(part=>messages[part.trim()]??part).join(', ');
  for(const {pattern,text,slots} of patterns){const match=key.match(pattern);if(!match)continue;const values={};slots.forEach((slot,i)=>values[slot]=inline(match[i+1]));return leading+countGrammar(text.replace(/\{(\d+)\}/g,(_,slot)=>values[slot]??''))+trailing}
  return value;
}

export function localeDate(value,locale='zh-CN',options={}){
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return new Intl.DateTimeFormat(locale==='en'?'en-GB':'zh-CN',{timeZone:'Asia/Shanghai',...options}).format(date);
}
