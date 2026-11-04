import React, { useEffect } from 'react';
import { AlertTriangle, Skull } from 'lucide-react';
import { sound } from '../utils/audio';

// Cảnh báo tình huống nguy cấp. Không còn đồng hồ đếm ngược: người chơi được tự do cân nhắc,
// quyết định nào cũng có hậu quả riêng và sẽ được nhớ lại về sau.
export const EmergencyEventAlert: React.FC = () => {
  useEffect(() => {
    sound.startHeartbeat(66);
    return () => sound.stopHeartbeat();
  }, []);

  return (
    <div className="mb-6 w-full select-none rounded-xl border border-red-700/70 bg-red-950/70 p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-red-700 p-2.5 text-white">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-red-700 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest text-white">TÌNH HUỐNG NGUY CẤP</span>
            <Skull className="h-4 w-4 text-red-400" />
          </div>
          <p className="mt-1 text-xs font-medium text-red-200 sm:text-sm">
            Không có giới hạn thời gian. Hãy cân nhắc thật kỹ, vì mỗi lựa chọn đều để lại hậu quả sẽ theo bạn về sau.
          </p>
        </div>
      </div>
    </div>
  );
};
