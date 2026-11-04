import React, { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';

interface RadioBroadcastProps {
  text: string;
}

// Bản tin radio đứt quãng. Chữ hiện dần như đang dò sóng (không chớp nháy, chỉ thêm chữ),
// các đoạn "..." và "[rè]" được tô mờ để gợi cảm giác mất tín hiệu.
export const RadioBroadcast: React.FC<RadioBroadcastProps> = ({ text }) => {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(text.length);
      return;
    }
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          window.clearInterval(id);
          return n;
        }
        return Math.min(text.length, n + 3);
      });
    }, 22);
    return () => window.clearInterval(id);
  }, [text]);

  const [header, ...rest] = text.split('\n\n');
  const body = rest.join('\n\n');
  const visible = text.slice(0, shown);
  const visibleHeader = visible.slice(0, header.length);
  const visibleBody = visible.length > header.length ? visible.slice(header.length + 2) : '';

  const parts = visibleBody.split(/(\.\.\.|\[rè\])/g);

  return (
    <div
      className="mb-4 rounded-xl border border-emerald-900/70 bg-gradient-to-b from-emerald-950/50 to-neutral-950/80 p-4 shadow-md"
      role="status"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-emerald-400">
        <Radio className="h-4 w-4" />
        <span>Bản tin radio · tín hiệu yếu</span>
      </div>
      <div className="text-[11px] font-mono text-emerald-300/80">{visibleHeader}</div>
      {body && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-emerald-100">
          {parts.map((p, i) =>
            p === '...' || p === '[rè]' ? (
              <span key={i} className="text-emerald-500/60">
                {p}
              </span>
            ) : (
              <span key={i}>{p}</span>
            ),
          )}
        </p>
      )}
    </div>
  );
};
