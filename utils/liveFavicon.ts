/**
 * ライブ配信中を示すアニメーションfaviconを制御するユーティリティ
 * HTMLCanvasで描画した画像を使ってfaviconをアニメーションさせます
 */

/* eslint-env browser */

// 定数定義
const CANVAS_SIZE = 64; // faviconのサイズ（64x64）
const SMOOTH_ANIMATION_INTERVAL = 90; // アニメーション更新間隔（ms）
const ROTATION_STEP_RAD = Math.PI / 30; // 1フレームごとの回転量（6度）

// 秒針の色
const HAND_COLOR = '#ff0000';

// アニメーションパラメータ
const ANIMATION_PARAMS = {
  RING_PADDING: 6, // 針が収まる余白
  HAND_WIDTH: 15, // 針の太さ
} as const;

// 通常のfaviconパス（Next.jsのデフォルトfavicon）
const NORMAL_FAVICON_PATH = '/favicon.ico';

// モジュール内の状態管理
// eslint-disable-next-line no-undef
let canvas: HTMLCanvasElement | null = null;
// eslint-disable-next-line no-undef
let ctx: CanvasRenderingContext2D | null = null;
let animationTimer: ReturnType<typeof setInterval> | null = null;
let rotationAngle = 0; // 秒針の現在角度（ラジアン）

/**
 * Canvasとコンテキストを初期化
 */
function initCanvas(): void {
  if (typeof document === 'undefined') return;

  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    ctx = canvas.getContext('2d', { alpha: true });
  }
}

/**
 * faviconのlink要素を取得または作成
 */
// eslint-disable-next-line no-undef
function getOrCreateFaviconLink(): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null;

  // 既存のfavicon link要素をすべて削除（複数のパターンに対応）
  const existingLinks = document.querySelectorAll(
    "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
  );
  existingLinks.forEach((link) => link.remove());

  // 新しいfavicon link要素を作成
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  document.head.appendChild(link);

  return link;
}

/**
 * Canvasからfaviconを更新
 */
function setFaviconFromCanvas(): void {
  if (!canvas || !ctx || typeof document === 'undefined') return;

  try {
    const dataURL = canvas.toDataURL('image/png');
    const link = getOrCreateFaviconLink();

    if (link) {
      // タイムスタンプを追加してキャッシュを回避
      const timestamp = Date.now();
      link.href = `${dataURL}#${timestamp}`;

      // 強制的に再読み込みさせるため、一度削除して再追加
      const parent = link.parentNode;
      if (parent) {
        parent.removeChild(link);
        parent.appendChild(link);
      }
    }
  } catch (error) {
    console.error('Failed to update favicon:', error);
  }
}

/**
 * アニメーションフレームを描画
 */
function drawFrame(): void {
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  rotationAngle = (rotationAngle + ROTATION_STEP_RAD) % (Math.PI * 2);
  const angle = rotationAngle - Math.PI / 2;

  const center = CANVAS_SIZE / 2;
  const radius = center - ANIMATION_PARAMS.RING_PADDING;

  // 秒針
  ctx.strokeStyle = HAND_COLOR;
  ctx.lineWidth = ANIMATION_PARAMS.HAND_WIDTH;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(center, center);
  ctx.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
  ctx.stroke();

  // faviconを更新
  setFaviconFromCanvas();
}

/**
 * ライブfaviconのアニメーションを開始
 */
export function startLiveFavicon(): void {
  if (typeof document === 'undefined') return;

  // 既にアニメーションが実行中の場合は何もしない
  if (animationTimer !== null) {
    return;
  }

  // Canvasを初期化
  initCanvas();

  if (!canvas || !ctx) {
    console.error('Failed to initialize canvas for live favicon');
    return;
  }

  // 回転角度を初期化
  rotationAngle = 0;

  // 最初のフレームを即座に描画
  drawFrame();

  // アニメーションループを開始
  animationTimer = setInterval(() => {
    drawFrame();
  }, SMOOTH_ANIMATION_INTERVAL);

  // デバッグ用（開発時のみ）
  if (process.env.NODE_ENV === 'development') {
    console.debug('Live favicon animation started');
  }
}

/**
 * ライブfaviconのアニメーションを停止し、通常のfaviconに戻す
 */
export function stopLiveFavicon(): void {
  if (typeof document === 'undefined') return;

  // アニメーションタイマーを停止
  if (animationTimer !== null) {
    clearInterval(animationTimer);
    animationTimer = null;
  }

  // 既存のfavicon link要素をすべて削除
  const existingLinks = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']");
  existingLinks.forEach((link) => link.remove());

  // 通常のfaviconを再作成
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = NORMAL_FAVICON_PATH;
  document.head.appendChild(link);

  // 回転角度をリセット
  rotationAngle = 0;

  // デバッグ用（開発時のみ）
  if (process.env.NODE_ENV === 'development') {
    console.debug('Live favicon animation stopped');
  }
}
