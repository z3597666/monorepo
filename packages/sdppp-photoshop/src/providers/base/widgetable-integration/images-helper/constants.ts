// 从 ps-common 导入 checkerboard SVG
import { checkerboardSvg } from '@sdppp/common/checkerboard.ts';

// 将 SVG 字符串转换为 base64 data URL
export const checkerboardDataUrl = `data:image/svg+xml;base64,${btoa(checkerboardSvg)}`;