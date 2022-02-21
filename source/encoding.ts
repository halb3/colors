
/* spellchecker: disable */

import {
    GLclampf3, GLclampf4, GLclampf5
} from '@haeley/math';

import { GLubyte } from '.';

/* spellchecker: enable */

/**
 * Color encodings covered by this library.
 */
export enum ColorEncoding {
    rgb = 'rgb',
    rgba = 'rgba',
    RGB = 'RGB',
    RGBA = 'RGBA',
    RGBa = 'RGBa',
    hsl = 'hsl',
    hsla = 'hsla',
    lab = 'lab',
    laba = 'laba',
    cmyk = 'cmyk',
    cmyka = 'cmyka',
    hex = 'hex',
    hexa = 'hexa'
}

/**
 * Check if the alpha channel is encoded within a given color encoding.
 * @param encoding - Color encoding to check if alpha is included.
 * @returns - True, if alpha is encoded.
 */
export function encodesAlhpa(encoding: ColorEncoding): boolean {
    switch (encoding) {
        case ColorEncoding.rgb:
        case ColorEncoding.RGB:
        case ColorEncoding.hsl:
        case ColorEncoding.lab:
        case ColorEncoding.cmyk:
        case ColorEncoding.hex:
            return false;
        default:
            return true;
    }
}

/**
 * Check if the given encoding uses clamped floating values.
 * @param encoding - Color encoding to check if values are in [0.0, 1.0].
 * @returns - True, if encoding is in [0.0, 1.0]. False, if encoding is in [0, 255].
 */
export function usesClampedFloats(encoding: ColorEncoding): boolean {
    switch (encoding) {
        case ColorEncoding.RGB:
        case ColorEncoding.RGBA:
        case ColorEncoding.RGBa:
            return false;
        default:
            return true;
    }
}

/**
 * Color spaces covered by this library.
 */
export enum ColorSpace {
    rgb = 'rgb',
    hsl = 'hsl',
    lab = 'lab',
    cmyk = 'cmyk'
}

/**
 * Utility function to derive a fitting color encoding for a given color space.
 * @param space - Space to create a appropriate encoding for.
 * @param alpha - Whether or not to include the alpha channel.
 * @returns - Best matching color encoding.
 */
export function getEncodingFromSpace(space: ColorSpace, alpha: boolean): ColorEncoding {

    switch (space) {
        case ColorSpace.rgb:
            return alpha ? ColorEncoding.rgba : ColorEncoding.rgb;
        case ColorSpace.hsl:
            return alpha ? ColorEncoding.hsla : ColorEncoding.hsl;
        case ColorSpace.lab:
            return alpha ? ColorEncoding.laba : ColorEncoding.lab;
        case ColorSpace.cmyk:
            return alpha ? ColorEncoding.cmyka : ColorEncoding.cmyk;
    }
}

export type ColorTuple = GLclampf3 | GLclampf4 | GLclampf5
    | [GLubyte, GLubyte, GLubyte]
    | [GLubyte, GLubyte, GLubyte, GLubyte | GLclampf];
