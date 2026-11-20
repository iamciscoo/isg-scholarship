// Shortcut: fixed TZS→USD rate; move it to settings when the rate needs to track the market.
const TZS_PER_USD = 2500;
export function usdQuote(tzs: number) {
  return Math.ceil(tzs / TZS_PER_USD / 10) * 10;
}
export function usdLabel(tzs: number) {
  return `USD ${usdQuote(tzs).toLocaleString("en")}`;
}
