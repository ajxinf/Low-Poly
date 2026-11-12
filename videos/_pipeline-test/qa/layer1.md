# QA layer 1: PipelineTest
3 shot(s), scene checks ran on 3.

| Check | Result |
|---|---|
| Camera clearance | pass |
| Feet on the ground | pass |
| Card penetration | pass (1 intended) |
| Props through props | pass (13 intended) |
| Camera curve | pass |
| Subject in frame | pass |
| Caption vs face | pass |
| Reaction timing | pass |
| Light continuity | pass |
| Shadows | pass |

- (intended) **Props through props** `setup` f0: building at s -4.2 left vs building at s 3.0 left (GROCER): boxes intersect by more than 1 cm (a corner is 0 cm inside); parts 7.55x12.84x8.00 m at (0.00, 6.42, 0.00) and 6.90x9.86x8.00 m at (0.00, 4.93, 0.00) (terrace left: built to meet)
- (intended) **Props through props** `setup` f0: building at s 3.0 left (GROCER) vs building at s 10.2 left: boxes intersect by more than 1 cm (a corner is 11 cm inside); parts 7.20x0.25x8.40 m at (0.00, 9.98, 0.00) and 7.86x3.44x8.70 m at (0.00, 9.30, -0.00) (terrace left: built to meet)
- (intended) **Props through props** `setup` f0: building at s 24.3 left vs building at s 30.7 left: boxes intersect by more than 1 cm (edges cross); parts 5.17x9.93x8.00 m at (0.00, 4.97, -0.00) and 7.79x0.30x8.50 m at (0.00, 6.88, 0.00) (terrace left: built to meet)
- (intended) **Props through props** `setup` f0: building at s 30.7 left vs building at s 37.4 left: boxes intersect by more than 1 cm (edges cross); parts 7.79x0.30x8.50 m at (0.00, 6.88, 0.00) and 6.02x12.97x8.00 m at (0.00, 6.48, -0.00) (terrace left: built to meet)
- (intended) **Props through props** `setup` f0: building at s -4.9 right vs building at s 1.1 right (GROCER): boxes intersect by more than 1 cm (a corner is 0 cm inside); parts 6.22x13.05x8.00 m at (0.00, 6.52, 0.00) and 5.79x6.86x8.00 m at (0.00, 3.43, 0.00) (terrace right: built to meet)
- (intended) **Props through props** `setup` f0: building at s 1.1 right (GROCER) vs building at s 7.7 right (GROCER): boxes intersect by more than 1 cm (a corner is 1 cm inside); parts 5.79x6.86x8.00 m at (0.00, 3.43, 0.00) and 7.43x13.26x8.00 m at (0.00, 6.63, 0.00) (terrace right: built to meet)
- (intended) **Props through props** `setup` f0: building at s 7.7 right (GROCER) vs building at s 14.3 right (TEA ROOM): boxes intersect by more than 1 cm (a corner is 1 cm inside); parts 7.43x13.26x8.00 m at (0.00, 6.63, 0.00) and 5.80x12.98x8.00 m at (0.00, 6.49, -0.00) (terrace right: built to meet)
- (intended) **Props through props** `setup` f0: building at s 14.3 right (TEA ROOM) vs building at s 20.1 right: boxes intersect by more than 1 cm (a corner is 0 cm inside); parts 5.80x12.98x8.00 m at (0.00, 6.49, -0.00) and 5.65x10.15x8.00 m at (0.00, 5.08, -0.00) (terrace right: built to meet)
- (intended) **Props through props** `setup` f0: building at s 20.1 right vs building at s 25.6 right (TEA ROOM): boxes intersect by more than 1 cm (a corner is 0 cm inside); parts 5.65x10.15x8.00 m at (0.00, 5.08, -0.00) and 5.45x7.15x8.00 m at (0.00, 3.57, 0.00) (terrace right: built to meet)
- (intended) **Props through props** `setup` f0: building at s 25.6 right (TEA ROOM) vs building at s 31.3 right (TEA ROOM): boxes intersect by more than 1 cm (a corner is 1 cm inside); parts 5.45x7.15x8.00 m at (0.00, 3.57, 0.00) and 5.91x6.81x8.00 m at (0.00, 3.41, 0.00) (terrace right: built to meet)
- (intended) **Props through props** `setup` f0: building at s 31.3 right (TEA ROOM) vs building at s 38.0 right: boxes intersect by more than 1 cm (a corner is 1 cm inside); parts 5.91x6.81x8.00 m at (0.00, 3.41, 0.00) and 7.55x9.72x8.00 m at (0.00, 4.86, -0.00) (terrace right: built to meet)
- (intended) **Props through props** `setup` f0: closing building x -8 vs closing building x 0: boxes intersect by more than 1 cm (edges cross); parts 8.00x13.16x8.00 m at (0.00, 6.58, 0.00) and 8.04x0.60x8.10 m at (0.00, 0.30, 0.00) (closing row: built to meet)
- (intended) **Props through props** `setup` f0: closing building x 0 vs closing building x 8: boxes intersect by more than 1 cm (a corner is 0 cm inside); parts 8.00x13.10x8.00 m at (-0.00, 6.55, -0.00) and 8.00x13.09x8.00 m at (-0.00, 6.54, 0.00) (closing row: built to meet)
- (intended) **Card penetration** `_pipeline-test/S3-crane-orbit` f232-449: "friend" vs ladder: card footprint overlaps it (friend stands on a ladder tread, between the rails (intended))
