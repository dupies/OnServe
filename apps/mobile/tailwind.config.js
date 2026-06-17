/** @type {import('tailwindcss').Config} */
const { sharedTailwindConfig } = require('@onserve/ui-tokens');

module.exports = {
  ...sharedTailwindConfig,
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
};
