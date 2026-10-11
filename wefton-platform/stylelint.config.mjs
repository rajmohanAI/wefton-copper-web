/** @type {import('stylelint').Config} */
const config = {
  plugins: ['./stylelint/no-unlayered-rules.mjs'],
  rules: {
    'wefton/no-unlayered-rules': true,
  },
};

export default config;
