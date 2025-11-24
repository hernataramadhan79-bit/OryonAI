
export const getThemeHex = (themeClass: string = '') => {
  if (themeClass.includes('green')) return '#4ade80'; // green-400
  if (themeClass.includes('pink')) return '#f472b6'; // pink-400
  if (themeClass.includes('yellow')) return '#facc15'; // yellow-400
  if (themeClass.includes('purple')) return '#a855f7'; // purple-400
  return '#00f3ff'; // cyber-accent (Default)
};
