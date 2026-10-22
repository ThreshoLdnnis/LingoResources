"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Bell,Check,CheckCheck,LoaderCircle,RefreshCw} from 'lucide-react';
import {useGrowth} from '@/lib/store';
import {accountNotifications,notificationKey} from '@/lib/notifications.mjs';
import {Modal} from './platform';
import {Pagination,usePagination} from './pagination';

export function Notifications() {
  const s=useGrowth();
  const [open,setOpen]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
  const rows=accountNotifications(s.applications,s.user?.id,s.connected);
  const unread=rows.filter(item=>!s.readNotifications.includes(notificationKey(item)));
  const paging=usePagination(rows,10,s.user?.id||'demo');
  const visibleKey=paging.items.map(notificationKey).join('|');
  useEffect(()=>{setOpen(false);setError('');setPending(false)},[s.user?.id]);
  useEffect(()=>{
    if(!open||s.loading||!paging.items.length)return;
    let cancelled=false;
    setError('');setPending(true);
    void s.markNotificationsRead(paging.items).catch(reason=>{if(!cancelled)setError((reason as Error).message)}).finally(()=>{if(!cancelled)setPending(false)});
    return()=>{cancelled=true};
    // Mark only the results actually shown; a newly loaded review has a new key.
    // The read-receipt state is deliberately not a dependency, avoiding retry loops.
  },[open,s.loading,s.user?.id,visibleKey]);
  async function retry(all=false){setPending(true);setError('');try{await s.markNotificationsRead(all?rows:paging.items)}catch(reason){setError((reason as Error).message)}finally{setPending(false)}}
  return <>
    <button type="button" className="icon-button notification-button" aria-label="查看通知" title={unread.length?`${unread.length} 条未读通知`:'暂无未读通知'} onClick={()=>{setOpen(true);if(s.connected)void s.reload()}}><Bell size={18}/>{!!unread.length&&<i aria-hidden="true"/>}</button>
    <Modal open={open} onOpenChange={setOpen} title="通知中心">
      <div className="notification-summary"><span role="status">{pending?<><LoaderCircle size={15} className="spin"/>正在同步已读…</>:unread.length?`${unread.length} 条未读`:<><CheckCheck size={16}/>全部已读</>}</span>{!!unread.length&&<button type="button" className="text-link" disabled={pending} onClick={()=>void retry(true)}>全部标为已读</button>}</div>
      <p className="notification-help">打开面板后，当前页通知会自动标为已读，历史消息仍会保留。</p>
      {error&&<div className="notification-sync-error" role="alert"><p>已读状态未能保存：{error}</p><button type="button" className="button secondary" disabled={pending} onClick={()=>void retry()}><RefreshCw size={14}/>重试同步</button></div>}
      <div ref={paging.anchor} className="pagination-anchor notification-items" tabIndex={-1}>{paging.items.map(item=>{
        const read=s.readNotifications.includes(notificationKey(item));
        const title=s.resources.find(resource=>resource.id===item.resource_id)?.title||s.posts.find(post=>post.id===item.post_id)?.title||'报名 / 组队申请';
        return <article className={'notification-item '+(read?'is-read':'is-unread')} key={notificationKey(item)}><span className="notification-result-icon"><Check size={18}/></span><div><div className="notification-item-heading"><h3>你的申请已{item.status==='approved'?'通过':'被拒绝'}</h3><span className="notification-read-state">{read?'已读':'未读'}</span></div><p>{title}</p><Link href="/profile/" onClick={()=>setOpen(false)}>查看申请记录<ArrowUpRight size={13}/></Link></div></article>;
      })}</div>
      {!rows.length&&<div className="empty-state"><Bell size={32}/><h3>暂时没有通知</h3><p>{s.connected&&!s.user?'登录后可查看报名与组队审核结果。':'报名与组队审核结果会保留在这里。'}</p></div>}
      <Pagination paging={paging} label="通知"/>
    </Modal>
  </>;
}
