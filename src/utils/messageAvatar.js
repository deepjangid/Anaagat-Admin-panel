const avatarThemes = [
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-fuchsia-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
];

export const getAvatarTheme = (name = '') => {
  const seed = String(name || '')
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return avatarThemes[seed % avatarThemes.length];
};
