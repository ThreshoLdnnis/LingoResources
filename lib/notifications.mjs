export function notificationKey(application) {
  return application.id+':'+(application.notification_version||'demo-'+application.status);
}
export function accountNotifications(applications,userId,connected=true) {
  if(connected&&!userId)return [];
  return applications.filter(item=>['approved','rejected'].includes(item.status)&&(connected?item.user_id===userId:!item.user_id||item.user_id===userId)).slice().reverse();
}
