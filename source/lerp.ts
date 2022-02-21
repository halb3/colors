
/* spellchecker: disable */

import { vec4, mix } from '@haeley/math';

import { Color } from './color';
import { ColorSpace } from './encoding';


/* spellchecker: enable */


/**
 * Performs a linear interpolation between x and y using a to weight between them within the specified color space.
 * @param x - First color stop for lerp/linear interpolation.
 * @param y - Second color stop for lerp/linear interpolation.
 * @param a - Specify the value to use to interpolate between x and y.
 * @param space - The color space that is to be used for linear interpolation of two colors.
 */
export function lerp(x: Color, y: Color, a: number, space: ColorSpace = ColorSpace.lab): Color {

    if (a <= 0.0) {
        return new Color(x.rgba);
    } else if (a >= 1.0) {
        return new Color(y.rgba);
    }

    const result = vec4.create();
    // eslint-disable-next-line default-case
    switch (space) {
        case ColorSpace.cmyk: {
            vec4.lerp(result, x.cmyk, y.cmyk, a);
            const alpha = mix(x.a, y.a, a);
            return new Color().fromCMYK(result[0], result[1], result[2], result[3], alpha);
        }

        case ColorSpace.lab:
            vec4.lerp(result, x.laba, y.laba, a);
            return new Color().fromLAB(result[0], result[1], result[2], result[3]);

        case ColorSpace.hsl:
            vec4.lerp(result, x.hsla, y.hsla, a);
            return new Color().fromHSL(result[0], result[1], result[2], result[3]);

        case ColorSpace.rgb:
            vec4.lerp(result, x.rgba, y.rgba, a);
            return new Color().fromRGB(result[0], result[1], result[2], result[3]);
    }
}
