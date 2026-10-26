
import {I18nRegion} from "./i18n";
import {BookOpen,UserRound} from 'lucide-react';
import {themeLabels,type ShowcaseDoc} from '@/lib/showcase';

// Reuse the existing persisted resource tones and the personal-card palette.
const toneForTheme={rose:'pink',orange:'yellow',sky:'blue',sand:'neutral',lavender:'purple'} as const;
export function courseCoverTheme(tone:string):ShowcaseDoc['theme'] {
  return (Object.keys(toneForTheme) as ShowcaseDoc['theme'][]).find(theme=>toneForTheme[theme]===tone)||'sky';
}
export function courseCoverClass(tone:string) {return 'course-palette profile-theme-'+courseCoverTheme(tone)}

export function CourseAttribution({name}:{name:string}) {
  return <I18nRegion><div className="course-attribution"><UserRound size={15} aria-hidden="true"/><span className="course-attribution-label">授课人</span><span translate={name.trim()?"no":undefined}>{name.trim()||'待补充'}</span></div></I18nRegion>;
}

export function CourseCoverPicker({tone,onChange}:{tone:string;onChange:(tone:string)=>void}) {
  const selected=courseCoverTheme(tone);
  return <I18nRegion><fieldset className="showcase-themes course-cover-picker"><legend>封面配色</legend>
    <p className="field-help">与个人名片使用相同配色，只调整课程卡片顶部的封面区域。</p>
    <div>{Object.entries(themeLabels).map(([theme,label])=><button type="button" key={theme} className={'theme-swatch swatch-'+theme+(selected===theme?' chosen':'')} aria-pressed={selected===theme} onClick={()=>onChange(toneForTheme[theme as ShowcaseDoc['theme']])}><span aria-hidden="true"/>{label}</button>)}</div>
    <div className={'course-cover-sample '+courseCoverClass(tone)} aria-label={'封面预览：'+themeLabels[selected]}><div><strong>01</strong><small>课程封面预览</small></div><BookOpen size={38} strokeWidth={1.3} aria-hidden="true"/></div>
  </fieldset></I18nRegion>;
}
