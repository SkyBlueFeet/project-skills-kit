/**
 * 将文本统一成 LF，避免不同操作系统的换行差异干扰比较结果。
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeText(value) {
  return value.replace(/\r\n/g, "\n");
}
