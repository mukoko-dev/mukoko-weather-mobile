/**
 * Side-effect + module CSS imports — Metro / Expo Router resolve these at
 * bundle time. Stubbed here so tsc doesn't choke on the template's web
 * scaffolding (animated-icon.module.css, global.css).
 */

declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [className: string]: string };
  export default classes;
}
