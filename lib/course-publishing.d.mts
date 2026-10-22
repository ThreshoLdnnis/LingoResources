import type {Resource} from './data';
export function courseStats(course:Resource):{lessons:number;minutes:number;files:number;pdfs:number};
export function courseIssues(course:Resource):string[];
export function prepareCourseSave(course:Resource,status:'draft'|'published'):Resource;
