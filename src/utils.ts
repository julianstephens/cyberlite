export const assign = (dest: object, src: object) => {
  Object.keys(src).forEach((k) => (dest[k] = src[k]));
};
