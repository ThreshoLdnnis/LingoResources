export const COVER_ACCEPT='.png,.jpg,.jpeg,.webp';
export const COVER_LIMIT=5*1024*1024;
export function validateCompetitionCover(file) {
  const extension=file.name.split('.').at(-1)?.toLowerCase();
  const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
  if(!Object.hasOwn(types,extension)||!file.size||file.size>COVER_LIMIT)throw new Error('请选择 5MB 内的 PNG、JPEG 或 WebP 封面图片。');
  if(file.type&&file.type!==types[extension])throw new Error('图片格式与文件扩展名不一致，请重新选择。');
  return {extension,mime:types[extension]};
}
export function competitionRecruitment(resource) {
  if(resource?.kind!=='competition'||resource.status!=='published')throw new Error('只能转发已发布的赛事活动。');
  return {resource_id:resource.id,type:'recruitment',title:('一起参加｜'+resource.title).slice(0,100),tags:[...new Set([...resource.tags,'组队'])].filter(tag=>tag.length<=24).slice(0,12)};
}
