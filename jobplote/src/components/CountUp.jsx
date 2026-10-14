import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';

export default function CountUp({ to = 0, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const from = Number(el.dataset.v || 0);
    const c = animate(from, to, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (v) => { el.textContent = Math.round(v); el.dataset.v = v; },
    });
    return () => c.stop();
  }, [to]);
  return <span ref={ref} className={className}>0</span>;
}