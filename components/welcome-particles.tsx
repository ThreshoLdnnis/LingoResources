"use client";
import {I18nRegion} from "./i18n";

import { ParticleHeading } from "./intro-title";
export function WelcomeParticles() {
  return <I18nRegion><div className="welcome-particle-title welcome-english-title">
    <span className="eyebrow">YOUR NEXT CHAPTER</span>
    <ParticleHeading id="explore-welcome-title" effect="vivid"><span className="intro-title-ink">Not all those who wander </span><span className="intro-title-ink welcome-quote-accent">are lost</span></ParticleHeading>
  </div></I18nRegion>;
}
