'use client';

import { useEffect, useState } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { Box } from '@mui/material';

/**
 * 日本時間で現在時刻が夜かどうかを判定
 * 18:01-7:59 は夜（on）、8:00-18:00 は昼（off）
 */
function isNightTime(): boolean {
  // 日本時間を取得
  const now = new Date();
  const jstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const hours = jstTime.getHours();
  const minutes = jstTime.getMinutes();

  // 18:01以降または8:00未満は夜
  if (hours > 18 || (hours === 18 && minutes >= 1)) {
    return true;
  }
  if (hours < 8) {
    return true;
  }
  return false;
}

export function RiveBackground() {
  const [isNight, setIsNight] = useState(isNightTime);

  const { rive, RiveComponent } = useRive({
    src: '/nature.riv',
    stateMachines: 'Start',
    autoplay: true,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
  });

  // State machine input（on/off = 夜テーマ）
  const nightInput = useStateMachineInput(rive, 'Start', 'on/off');

  // 時間帯チェックを定期的に実行（1分ごと）
  useEffect(() => {
    const checkTime = () => {
      setIsNight(isNightTime());
    };

    // 初回実行
    checkTime();

    // 1分ごとにチェック
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // isNightが変化したらRiveに反映
  useEffect(() => {
    if (nightInput) {
      // Rive APIの標準的な使い方: StateMachineInputのvalueを直接設定
      // eslint-disable-next-line react-hooks/immutability -- Rive APIのStateMachineInputは外部ライブラリのオブジェクトであり、valueの直接設定が必要
      nightInput.value = isNight;
    }
  }, [isNight, nightInput]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </Box>
  );
}
