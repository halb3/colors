
/* spellchecker: disable */

import { GLclampf3, GLclampf4 } from "@haeley/math";

/* spellchecker: enable */


/**
 * Converts the RGB-based rgba to a gray value using the specified algorithm.
 * @param algorithm - The algorithm used for rgba to gray conversion.
 */
export function grayscale(rgba: GLclampf3 | GLclampf4,
    algorithm: GrayscaleAlgorithm = GrayscaleAlgorithm.LinearLuminance): GLclampf3 | GLclampf4 {

    let gray: GLclampf = 0.0;
    // eslint-disable-next-line default-case
    switch (algorithm) {

        /* Does not represent shades of grayscale w.r.t. human perception of luminosity. */
        case GrayscaleAlgorithm.Average:
            gray = (rgba[0] + rgba[1] + rgba[2]) / 3.0;
            break;
        /* flat (reduced contrast) and dark grayscale */

        case GrayscaleAlgorithm.LeastSaturatedVariant:
            gray = (Math.max(rgba[0], rgba[1], rgba[2])
                - Math.min(rgba[0], rgba[1], rgba[2])) * 0.5;
            break;

        /* provides a darker grayscale */
        case GrayscaleAlgorithm.MinimumDecomposition:
            gray = Math.min(rgba[0], rgba[1], rgba[2]);
            break;

        /* provides a brighter grayscale */
        case GrayscaleAlgorithm.MaximumDecomposition:
            gray = Math.max(rgba[0], rgba[1], rgba[2]);
            break;

        case GrayscaleAlgorithm.LinearLuminance:
            gray = rgba[0] * 0.2126 + rgba[1] * 0.7152 + rgba[2] * 0.0722;
            break;
    }

    return rgba.length === 4 ? [gray, gray, gray, rgba[3]] : [gray, gray, gray];
}

export enum GrayscaleAlgorithm {
    Average = 'average',
    LinearLuminance = 'linear-luminance', /* CIE1931 */
    LeastSaturatedVariant = 'least-saturated-variant',
    MinimumDecomposition = 'minimum-decomposition',
    MaximumDecomposition = 'maximum-decomposition',
}
