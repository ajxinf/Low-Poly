// Image imports resolve to a URL string (Remotion's bundler serves them).
declare module "*.png" {
  const src: string;
  export default src;
}
