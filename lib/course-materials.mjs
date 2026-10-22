export const MATERIAL_LIMIT=20*1024*1024;
export const MATERIAL_TYPES={
  pdf:'application/pdf',ppt:'application/vnd.ms-powerpoint',
  pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',zip:'application/zip',
  html:'text/html',htm:'text/html'
};
export const MATERIAL_ACCEPT=Object.keys(MATERIAL_TYPES).map(x=>'.'+x).join(',');
export function validateMaterial(file) {
  const extension=file.name.split('.').at(-1)?.toLowerCase();
  if(!extension||!Object.hasOwn(MATERIAL_TYPES,extension))throw new Error('请选择 HTML、PDF、PPT、Word、PNG/JPEG/WebP 图片或 ZIP 压缩包。');
  if(!file.size||file.size>MATERIAL_LIMIT)throw new Error('课件文件需要在 20MB 以内，且不能为空。');
  if(file.name.length>140)throw new Error('文件名请控制在 140 个字符以内。');
  return {extension,mime:MATERIAL_TYPES[extension]};
}
export function isArchiveMaterial(file) {
  return file.mime==='application/zip';
}
export function formatFileSize(bytes) {
  return bytes>=1024*1024?(bytes/1024/1024).toFixed(1)+' MB':Math.max(1,Math.ceil(bytes/1024))+' KB';
}
