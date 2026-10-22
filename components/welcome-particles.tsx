"use client";
import { ParticleHeading } from "./intro-title";
export function WelcomeParticles() {
  return <div className="welcome-particle-title welcome-english-title">
    <span className="eyebrow">YOUR NEXT CHAPTER</span>
    <ParticleHeading id="explore-welcome-title" effect="vivid"><span className="intro-title-ink">Not all those who wander </span><span className="intro-title-ink welcome-quote-accent">are lost</span></ParticleHeading>
  </div>;
}
