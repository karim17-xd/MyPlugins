const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { bg: v('bg'), panel: v('panel'), raised: v('raised'), line: v('line'), fg: v('fg'), muted: v('muted'), accent: v('accent'), 'on-accent': v('on-accent'), danger: v('danger') },
    fontFamily: { sans: ['"IBM Plex Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'], mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'] } } },
  plugins: [],
};
