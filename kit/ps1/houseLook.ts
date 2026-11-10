// The channel's locked PS1 look. Components default to these; scenes override per prop.
export const HOUSE_LOOK = {
  snapHeight: 180, // snap grid height; width follows 4:3 (see snapResolutionFor)
  affine: true,
  fogColor: "#2a332e", // per-scene setting
  fogNear: 7,
  fogFar: 17,
  postFX: true,
  ditherScale: 3,
  ambient: 0.15,
  lightIntensity: 12,
  lightDistance: 6,
  lightY: 1.9,
};

export const snapResolutionFor = (snapHeight: number): [number, number] => [
  Math.round((snapHeight * 4) / 3),
  snapHeight,
];
