// Inline lesson interactions run in an opaque-origin iframe, never in the app.
// Keep this sandbox in sync with HtmlReader; do not add allow-same-origin.
export const HTML_COURSE_SANDBOX='allow-scripts';
export const HTML_COURSE_CSP=[
  "default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline'",
  'img-src data: blob:', 'font-src data:', 'media-src data: blob:',
  "connect-src 'none'", "frame-src 'none'", "object-src 'none'",
  "base-uri 'none'", "form-action 'none'"
].join('; ');

export function buildHtmlCourseDocument(source) {
  // The policy comes before ALL author markup, including malformed full documents.
  // Later CSP tags can only further restrict it. No platform tokens enter this frame.
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${HTML_COURSE_CSP}"><meta name="referrer" content="no-referrer"><style>html{color-scheme:light}#lingo-course-link-note{position:fixed;bottom:16px;left:16px;right:16px;z-index:2147483647;padding:14px 18px;background:#17232c;color:#fff;border-radius:12px;font:14px/1.7 system-ui;box-shadow:0 8px 30px #0003}</style><script>
document.addEventListener('click',function(event){
  var link=event.target instanceof Element?event.target.closest('a,area'):null;
  if(!link)return;
  var href=link.getAttribute('href')||'';
  event.preventDefault();event.stopImmediatePropagation();
  if(href.startsWith('#')){
    try{var target=document.getElementById(decodeURIComponent(href.slice(1)));if(target)target.scrollIntoView({block:'start'});else if(href==='#')window.scrollTo(0,0)}catch{}
    return;
  }
  var note=document.getElementById('lingo-course-link-note');
  if(!note){note=document.createElement('div');note.id='lingo-course-link-note';note.setAttribute('role','status');document.body.appendChild(note)}
  note.textContent='请使用翎语课程目录或「下一节」切换课时。课件中的其他页面链接不会在此打开。';
  clearTimeout(window.lingoCourseNoteTimer);window.lingoCourseNoteTimer=setTimeout(function(){note.remove()},5000);
},true);
</script></head><body>${source}</body></html>`;
}
