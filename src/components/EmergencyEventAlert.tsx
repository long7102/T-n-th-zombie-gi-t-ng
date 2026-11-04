import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Skull } from 'lucide-react';
import { sound } from '../utils/audio';

interface EmergencyEventAlertProps {
  secondsLeft: number;
  totalSeconds: number;
  onTimeout: () => void;
}

export const EmergencyEventAlert: React.FC<EmergencyEventAlertProps> = ({
  secondsLeft,
  totalSeconds,
  onTimeout,
}) => {
  const [hasWarned, setHasWarned] = useState(false);

  useEffect(() => {
    // Start procedural heartbeat sound
    sound.startHeartbeat(120);
    return () => {
      sound.stopHeartbeat();
    };
  }, []);

  useEffect(() => {
    if (secondsLeft <= 5 && !hasWarned) {
      sound.playAlarm();
      setHasWarned(true);
    }
  }, [secondsLeft, hasWarned]);

  const percentage = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));

  return (
    <div className="w-full bg-red-950/85 border border-red-600/80 rounded-xl p-4 sm:p-5 shadow-lg mb-6 select-none">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-600 text-white rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest uppercase bg-red-600 text-white px-2 py-0.5 rounded">
                BIẾN CỐ THỜI GIAN THỰC KHẨN CẤP
              </span>
              <Skull className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xs sm:text-sm text-red-200 mt-1 font-medium">
              Tình huống nguy cấp! Hãy phản ứng trước khi đồng hồ đếm ngược kết thúc.
            </p>
          </div>
        </div>

        {/* Digital Ticker (Solid, clean typography) */}
        <div className="flex items-center gap-2 bg-black/80 border border-red-600/60 px-4 py-2 rounded-lg font-mono">
          <Clock className="w-5 h-5 text-red-400" />
          <span className="text-2xl sm:text-3xl font-black text-red-500 tracking-wider tabular-nums">
            00:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
          </span>
        </div>
      </div>

      {/* Progress Bar (Smooth, linear transition) */}
      <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden p-0.5 border border-red-800/80">
        <div
          className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-red-500 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
