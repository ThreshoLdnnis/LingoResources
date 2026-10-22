import type {Application} from './data';
export function notificationKey(application:Pick<Application,'id'|'status'|'notification_version'>):string;
export function accountNotifications(applications:Application[],userId?:string,connected?:boolean):Application[];
