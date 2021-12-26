
/* spellchecker: disable */

import { assert, log, LogLevel } from 'haeley-auxiliaries';
import {
    clampf3, clampf4, GLclampf3, GLclampf4
} from 'haeley-math';

import { Color } from './color';

/* spellchecker: enable */


// /** @todo remove this when webgl types are working again. */
// export type GLubyte = number;


/**
 * Converts a hue value into an rgb value.
 */
export function hue2rgb(p: GLfloat, q: GLfloat, t: GLfloat): GLfloat {
    assert(t >= -1.0 && t <= 2.0, `t is expected to be between -1 and 2`);
    if (t < 0.0) {
        t += 1.0;
    } else if (t > 1.0) {
        t -= 1.0;
    }

    if ((6.0 * t) < 1.0) {
        return p + (q - p) * 6.0 * t;
    }
    if ((2.0 * t) < 1.0) {
        return q;
    }
    if ((3.0 * t) < 2.0) {
        return p + (q - p) * 6.0 * (2.0 / 3.0 - t);
    }
    return p;
}

/**
 * Converts a float value to two-character HEX code.
 * @param value - A float value in [0.0, 1.0].
 * @returns - Two-character hexadecimal representation in [00, FF].
 */
export function to2CharHexCode(value: number): string {
    return (value < 15.5 / 255.0 ? '0' : '') + Math.round(value * 255.0).toString(16);
}

/**
 * Converts a color from HSL space to RGB space.
 * @param hsl - HSL color tuple: hue, saturation, and lightness, each in [0.0, 1.0].
 * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0].
 */
export function hsl2rgb(hsl: GLclampf3): GLclampf3 {
    const hslF = clampf3(hsl, 'HSL input');

    if (hslF[1] === 0.0) {
        return [hslF[2], hslF[2], hslF[2]];
    }

    const q = hslF[2] < 0.5 ? hslF[2] * (1.0 + hslF[1]) : (hslF[2] + hslF[1]) - (hslF[1] * hslF[2]);
    const p = 2.0 * hslF[2] - q;

    return [hue2rgb(p, q, hslF[0] + (1.0 / 3.0))
        , hue2rgb(p, q, hslF[0]), hue2rgb(p, q, hslF[0] - (1.0 / 3.0))];
}

/**
 * Converts a color from HSL space to RGB space.
 * @param rgb - RGB color tuple: red, green, and blue, each in [0.0, 1.0].
 * @returns - HSL color tuple: hue, saturation, and lightness, each in [0.0, 1.0].
 */
export function rgb2hsl(rgb: GLclampf3): GLclampf3 {
    const rgbF = clampf3(rgb, 'RGB input');
    const hsl: GLclampf3 = [0.0, 0.0, 0.0];

    const min = Math.min(rgbF[0], rgbF[1], rgbF[2]);
    const max = Math.max(rgbF[0], rgbF[1], rgbF[2]);
    const delta = max - min;

    hsl[2] = (max + min) * 0.5;

    if (delta === 0.0) {
        return hsl;
    }

    hsl[1] = hsl[2] < 0.5 ? delta / (max + min) : delta / (2.0 - max - min);

    const deltaR = (((max - rgbF[0]) / 6.0) + (delta / 2.0)) / delta;
    const deltaG = (((max - rgbF[1]) / 6.0) + (delta / 2.0)) / delta;
    const deltaB = (((max - rgbF[2]) / 6.0) + (delta / 2.0)) / delta;

    if (rgbF[0] === max) {
        hsl[0] = deltaB - deltaG;
    } else if (rgbF[1] === max) {
        hsl[0] = deltaR - deltaB + (1.0 / 3.0);
    } else { // if (rgbF[2] === max) {
        hsl[0] = deltaG - deltaR + (2.0 / 3.0);
    }
    return hsl;
}

/**
 * Converts a color from LAB space to XYZ space (D65/2° illuminant)
 * @param lab - LAB color tuple: lightness, greenRed, and blueYellow, each in [0.0, 1.0].
 * @returns - XYZ color tuple: x, y, and z, each in [0.0, 1.0].
 */
export function lab2xyz(lab: GLclampf3): GLclampf3 {
    const labF = clampf3(lab, 'LAB input');

    /** The following computation assumes the value ranges:
     *  L: [0, 100], a: [-128, 127], b: [-128, 127]
     */
    const yr = (100.0 * labF[0] + 16.0) / 116.0;
    const xr = (256.0 * labF[1] - 128.0) / 500.0 + yr;
    const zr = yr - (256.0 * labF[2] - 128.0) / 200.0;

    const xr3 = Math.pow(xr, 3.0);
    const yr3 = Math.pow(yr, 3.0);
    const zr3 = Math.pow(zr, 3.0);

    /* D65/2° illuminant for XYZ conversion */
    const x = 0.95047 * (xr3 > 0.008856 ? xr3 : (xr - 16.0 / 116.0) / 7.787);
    const y = 1.00000 * (yr3 > 0.008856 ? yr3 : (yr - 16.0 / 116.0) / 7.787);
    const z = 1.08883 * (zr3 > 0.008856 ? zr3 : (zr - 16.0 / 116.0) / 7.787);

    return [x, y, z];
}

/**
 * Converts a color from XYZ space to CIE-Lab space.
 * @param xyz - XYZ color tuple: x, y, and z, and refer to the D65/2° illuminant.
 * @returns - LAB color tuple: lightness, greenRed, and blueYellow, each in [0.0, 1.0].
 */
export function xyz2lab(xyz: GLclampf3): GLclampf3 {
    // DO NOT CLAMP! const xyzF = clampf3(xyz, 'XYZ input');
    const xyzF = [xyz[0] / 0.95047, xyz[1] / 1.00000, xyz[2] / 1.08883];

    /* implicit illuminant of [1.0, 1.0, 1.0] assumed */
    const x = xyzF[0] > 0.008856 ? Math.cbrt(xyzF[0]) : (7.787 * xyzF[0] + (16.0 / 116.0));
    const y = xyzF[1] > 0.008856 ? Math.cbrt(xyzF[1]) : (7.787 * xyzF[1] + (16.0 / 116.0));
    const z = xyzF[2] > 0.008856 ? Math.cbrt(xyzF[2]) : (7.787 * xyzF[2] + (16.0 / 116.0));

    /* scale to range [0.0, 1.0] - typically L is in [0,-100], a and b in [-128,+127] */
    return clampf3([
        (116.0 * y - 16.0) / 100.0,
        (500.0 * (x - y) + 128.0) / 256.0,
        (200.0 * (y - z) + 128.0) / 256.0]);
}


/**
 * Converts a color from XYZ space to Adobe-RGB space.
 * @param xyz - XYZ color tuple: x, y, and z, and refer to the D65/2° illuminant.
 * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
 */
export function xyz2rgb(xyz: GLclampf3): GLclampf3 {
    // DO NOT CLAMP! const xyzF = clampf3(xyz, 'XYZ input');

    const r = xyz[0] * +2.04137 + xyz[1] * -0.56495 + xyz[2] * -0.34469;
    const g = xyz[0] * -0.96927 + xyz[1] * +1.87601 + xyz[2] * +0.04156;
    const b = xyz[0] * +0.01345 + xyz[1] * -0.11839 + xyz[2] * +1.01541;

    return clampf3([
        r > 0.0 ? Math.pow(r, 1.0 / 2.19921875) : 0,
        g > 0.0 ? Math.pow(g, 1.0 / 2.19921875) : 0,
        b > 0.0 ? Math.pow(b, 1.0 / 2.19921875) : 0]);

    // Standard-RGB
    // let r = xyz[0] * +3.2406 + xyz[1] * -1.5372 + xyz[2] * -0.4986;
    // let g = xyz[0] * -0.9689 + xyz[1] * +1.8758 + xyz[2] * +0.0415;
    // let b = xyz[0] * +0.0557 + xyz[1] * -0.2040 + xyz[2] * +1.0570;

    // r = r > 0.0031308 ? 1.055 * Math.pow(r, 1.0 / 2.4) - 0.055 : 12.92 * r;
    // g = g > 0.0031308 ? 1.055 * Math.pow(g, 1.0 / 2.4) - 0.055 : 12.92 * g;
    // b = b > 0.0031308 ? 1.055 * Math.pow(b, 1.0 / 2.4) - 0.055 : 12.92 * b;
    // return [r, g, b];
}

/**
 * Converts a color from Adobe-RGB space to XYZ space.
 * @param rgb - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
 * @returns - XYZ color tuple: x, y, and z, each in [0.0, 1.0].
 */
export function rgb2xyz(rgb: GLclampf3): GLclampf3 {
    const rgbF = clampf3(rgb, 'RGB input');

    const r = Math.pow(rgbF[0], 2.19921875);
    const g = Math.pow(rgbF[1], 2.19921875);
    const b = Math.pow(rgbF[2], 2.19921875);

    const x = r * 0.57667 + g * 0.18555 + b * 0.18819;
    const y = r * 0.29738 + g * 0.62735 + b * 0.07527;
    const z = r * 0.02703 + g * 0.07069 + b * 0.99110;
    return [x, y, z];
}


/**
 * Converts a color from LAB space to RGB space.
 * @param lab - LAB color tuple: lightness, greenRed, and blueYellow, each in [0.0, 1.0].
 * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
 */
export function lab2rgb(lab: GLclampf3): GLclampf3 {
    return xyz2rgb(lab2xyz(lab));
}

/**
 * Converts a color from RGB space to LAB space.
 * @param lab - LAB color tuple: lightness, greenRed, and blueYellow, each in [0.0, 1.0].
 * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
 */
export function rgb2lab(rgb: GLclampf3): GLclampf3 {
    return xyz2lab(rgb2xyz(rgb));
}


/**
 * Converts a color from CMYK space to RGB space.
 * @param cmyk - CMYK color tuple: cyan, magenta, yellow, and key, each in [0.0, 1.0].
 * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
 */
export function cmyk2rgb(cmyk: GLclampf4): GLclampf3 {
    const cmykF = clampf4(cmyk, 'CMYK input');

    const k = 1.0 - cmykF[3];
    return [(1.0 - cmykF[0]) * k, (1.0 - cmykF[1]) * k, (1.0 - cmykF[2]) * k];
}

/**
 * Converts a color from RGB space to CMYK space.
 * @param rgb - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
 * @returns - CMYK color tuple: cyan, magenta, yellow, and key, each in [0.0, 1.0].
 */
export function rgb2cmyk(rgb: GLclampf3): GLclampf4 {
    const rgbF = clampf3(rgb, 'RGB input');

    const k1 = 1.0 - Math.max(rgbF[0], rgbF[1], rgbF[2]);
    const k2 = 1.0 - k1;
    const k3 = k2 === 0.0 ? 0.0 : 1.0 / k2;
    return [(k2 - rgbF[0]) * k3, (k2 - rgbF[1]) * k3, (k2 - rgbF[2]) * k3, k1];
}


const HEX_FORMAT_REGEX = new RegExp(/^(#|0x)?(([0-9a-f]{3}){1,2}|([0-9a-f]{4}){1,2})$/i);

/**
 * Converts a color from HEX string to RGBA space. The hex string can start with '#' or '0x' or neither of these.
 * @param hex - Hexadecimal color string: red, green, and blue, each in ['00', 'ff'].
 * @returns - RGBA color tuple: red, green, blue, and alpha, each in [0.0, 1.0]. On error [0, 0, 0, 0] is returned.
 */
export function hex2rgba(hex: string): GLclampf4 {
    const rgba: GLclampf4 = [0.0, 0.0, 0.0, Color.DEFAULT_ALPHA];

    if (!HEX_FORMAT_REGEX.test(hex)) {
        log(LogLevel.Warning, `hexadecimal RGBA color string must conform to either \
'0x0000', '#0000', '0000', '0x00000000', '#00000000', or '00000000', given '${hex}'`);
        return rgba;
    }

    const offset = hex.startsWith('0x') ? 2 : hex.startsWith('#') ? 1 : 0;
    const length = Math.floor((hex.length - offset) / 3);
    const stride = length - 1;

    rgba[0] = parseInt(hex[offset + 0 * length] + hex[offset + 0 * length + stride], 16) / 255.0;
    rgba[1] = parseInt(hex[offset + 1 * length] + hex[offset + 1 * length + stride], 16) / 255.0;
    rgba[2] = parseInt(hex[offset + 2 * length] + hex[offset + 2 * length + stride], 16) / 255.0;
    if ((hex.length - offset) === 4 || (hex.length - offset) === 8) {
        rgba[3] = parseInt(hex[offset + 3 * length] + hex[offset + 3 * length + stride], 16) / 255.0;
    }

    assert(!isNaN(rgba[0]) && !isNaN(rgba[1]) && !isNaN(rgba[2]) && !isNaN(rgba[3]),
        `expected well formatted hexadecimal RGBA string, given '${hex}'`);
    return rgba;
}

/**
 * Converts a color from RGB space to HEX string.
 * @param rgb - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
 * @returns - Hexadecimal color string: red, green, and blue, each in ['00', 'ff'], with '#' prefix
 */
export function rgb2hex(rgb: GLclampf3): string {
    const rgbF = clampf3(rgb, 'RGB input');

    const r = to2CharHexCode(rgbF[0]);
    const g = to2CharHexCode(rgbF[1]);
    const b = to2CharHexCode(rgbF[2]);
    return '#' + r + g + b;
}

/**
 * Converts a color from RGBA space to HEX string.
 * @param rgba - RGBA color tuple: red, green, blue, and alpha, each in [0.0, 1.0]
 * @returns - Hexadecimal color string: red, green, blue, and alpha, each in ['00', 'ff'], with '#' prefix
 */
export function rgba2hex(rgba: GLclampf4): string {
    const rgbaF = clampf4(rgba, 'RGBA input');

    const r = to2CharHexCode(rgbaF[0]);
    const g = to2CharHexCode(rgbaF[1]);
    const b = to2CharHexCode(rgbaF[2]);
    const a = to2CharHexCode(rgbaF[3]);
    return '#' + r + g + b + a;
}
