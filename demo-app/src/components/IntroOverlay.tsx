import React, { useEffect, useRef, useState } from 'react';

const SLIDES = [
  {
    eyebrow: 'Issue 01 — May 14, 2026',
    title: 'The 2026 World Cup, as one connected market.',
    body: 'Most apps show you one contract at a time. We think the more interesting question is which contracts move together.',
  },
  {
    eyebrow: '15 markets · 4 storylines',
    title: 'Every dot is a real market. Every color is a story.',
    body: 'We curated this graph by hand. Tournament mechanics, the legacy arc, the creator economy, and the travel echo — four neighborhoods of the same event.',
  },
  {
    eyebrow: 'Every line is a real reason',
    title: 'Click a market to read why it moves.',
    body: 'No charts in a vacuum. Each market sits inside a story — the players, the moments, and the other markets that move with it.',
  },
] as const;

interface Props {
  onStageChange: (stage: number) => void;
  onDone: () => void;
}

export function IntroOverlay({ onStageChange, onDone }: Props) {
  const [stage, setStage] = useState(0);
  // displayStage lags behind stage during cross-fade
  const [displayStage, setDisplayStage] = useState(0);
  const [transitionOut, setTransitionOut] = useState(false);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep stable refs so timer callbacks always read the latest values
  const onStageChangeRef = useRef(onStageChange);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onStageChangeRef.current = onStageChange; }, [onStageChange]);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const clearTimer = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  // Cross-fade: when stage advances, animate out → swap content → animate in
  useEffect(() => {
    if (stage === displayStage) return;
    setTransitionOut(true);
    transRef.current = setTimeout(() => {
      setDisplayStage(stage);
      setTransitionOut(false);
    }, 220);
    return () => { if (transRef.current) clearTimeout(transRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const done = () => {
    clearTimer();
    setFading(true);
    onStageChangeRef.current(SLIDES.length); // stage 3 → fully on
    setTimeout(() => onDoneRef.current(), 600);
  };

  // Notify parent of current stage whenever it changes
  useEffect(() => {
    onStageChangeRef.current(stage);
  }, [stage]);

  // Auto-advance: restart timer on every stage change
  useEffect(() => {
    if (fading) return;
    timerRef.current = setTimeout(() => {
      if (stage < SLIDES.length - 1) setStage(s => s + 1);
      else done();
    }, 7000);
    return clearTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, fading]);

  const handleNext = () => {
    clearTimer();
    if (stage < SLIDES.length - 1) setStage(s => s + 1);
    else done();
  };

  const handleSkip = () => {
    clearTimer();
    const last = SLIDES.length - 1;
    setStage(last);
    onStageChangeRef.current(last);
    setTimeout(done, 100);
  };

  const isLast = stage >= SLIDES.length - 1;
  const current = SLIDES[Math.min(displayStage, SLIDES.length - 1)];

  return (
    <div className="pg-intro-overlay" data-fading={fading ? 'true' : 'false'}>
      <div
        className="pg-intro-card"
        style={{
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(-8px)' : 'translateY(0)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        {/* Content cross-fades on each stage change */}
        <div
          key={displayStage}
          className={transitionOut ? 'pg-intro-content-out' : 'pg-intro-content-in'}
        >
          {current.eyebrow && (
            <div className="pg-intro-card__eyebrow">{current.eyebrow}</div>
          )}
          <h1 className="pg-intro-card__title">{current.title}</h1>
          <p className="pg-intro-card__body">{current.body}</p>
        </div>

        {/* Pips and actions track stage directly — no transition delay */}
        <div className="pg-intro-card__progress">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="pg-intro-card__pip"
              data-state={i < stage ? 'done' : i === stage ? 'active' : 'idle'}
            />
          ))}
        </div>

        <div className="pg-intro-card__actions">
          {!isLast && (
            <button className="pg-intro-btn" onClick={handleSkip}>Skip</button>
          )}
          <button
            className={'pg-intro-btn' + (isLast ? ' pg-intro-btn--primary' : '')}
            onClick={handleNext}
          >
            {isLast ? 'Enter the graph →' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
