
/* spellchecker: disable */

import { assert } from 'haeley-auxiliaries';
import {
    clamp, clampf, clampf4, duplicate4, equals4, GLclampf3, GLclampf4, GLclampf5
} from 'haeley-math';

import { cmyk2rgb, hex2rgba, hsl2rgb, lab2rgb, rgb2cmyk, rgb2hex, rgb2hsl, rgb2lab, rgba2hex } from './conversion';

/* spellchecker: enable */


/** @todo remove this when webgl types are working again. */
export type GLubyte = number;


/**
 * Color class that allows for specification and conversion of colors in various color spaces. Please not that most of
 * the color conversion math is based on  {@link https://www.easyrgb.com/en/math.php}. The internal color representation
 * is a 4-tuple of GLclampf components in RGB color space and additional alpha. All color conversion, e.g., getters is
 * computed on the fly, not cached, and is not optimized for, e.g., massive pixel processing.
 */
export class Color {

    static readonly DEFAULT_ALPHA: GLclampf = 1.0;

    protected _rgba: GLclampf4 = [0.0, 0.0, 0.0, Color.DEFAULT_ALPHA];


    /** @see {@link altered} */
    protected _altered = false;

    /**
     * Creates an instance of color (a 4-tuple in RGBA space).
     * @param rgba - Either RGB tuple or RGBA tuple. If none is provided, default will be kept.
     * @param alpha - If RGB tuple is provided an additional alpha value can be specified.
     */
    constructor(rgba?: GLclampf3 | GLclampf4, alpha?: GLclampf) {
        if (rgba === undefined) {
            return;
        }
        if (rgba.length === 3 && alpha !== undefined) {
            this.fromF32(rgba[0], rgba[1], rgba[2], alpha);
        } else if (rgba.length === 4) {
            this.fromF32(rgba[0], rgba[1], rgba[2], rgba[3]);
            assert(alpha === undefined, `expected alpha to be undefined when given an 4-tuple in RGBA`);
        } else {
            this.fromF32(rgba[0], rgba[1], rgba[2]);
        }
    }


    /**
     * Checks whether or not this color matches a second color (based on internal rgba floating representation).
     * @param other - Color to compare color values to.
     * @returns - True iff both colors have the exact same rgba floating point values.
     */
    equals(other: Color): boolean {
        return equals4<GLclampf>(this._rgba, other._rgba);
    }


    /**
     * Specifies the internal rgba store using a color in float (32bit) RGBA colors.
     * @param red - Red color component in [0.0, 1.0]
     * @param green - Green color component in [0.0, 1.0]
     * @param blue - Blue color component in [0.0, 1.0]
     * @param alpha - Alpha color component in [0.0, 1.0]
     * @returns - The color instance (this).
     */
    fromF32(red: GLfloat, green: GLfloat, blue: GLfloat, alpha: GLfloat = Color.DEFAULT_ALPHA): Color {
        const previous = duplicate4<GLclampf>(this._rgba);

        this._rgba[0] = clampf(red, `red value`);
        this._rgba[1] = clampf(green, `green value`);
        this._rgba[2] = clampf(blue, `blue value`);
        this._rgba[3] = clampf(alpha, `alpha value`);

        this._altered = !equals4<GLclampf>(this._rgba, previous);
        return this;
    }


    /**
     * Specifies the internal rgba store using a color in unsigned int (8bit) RGBA colors.
     * @param red - Red color component in [0, 255]
     * @param green - Green color component in [0, 255]
     * @param blue - Blue color component in [0, 255]
     * @param alpha - Alpha color component in [0, 255]
     * @returns - The color instance (this).
     */
    fromUI8(red: GLubyte, green: GLubyte, blue: GLubyte,
        alpha: GLubyte = Math.floor(Color.DEFAULT_ALPHA * 255)): Color {
        const previous = duplicate4<GLclampf>(this._rgba);

        this._rgba[0] = clamp(red, 0, 255) / 255.0;
        this._rgba[1] = clamp(green, 0, 255) / 255.0;
        this._rgba[2] = clamp(blue, 0, 255) / 255.0;
        this._rgba[3] = clamp(alpha, 0, 255) / 255.0;

        this._altered = !equals4<GLclampf>(this._rgba, previous);
        return this;
    }

    /**
     * Specifies the internal rgba store using a color in RGB color space.
     * @param red - Red color component in [0.0, 1.0]
     * @param green - Green color component in [0.0, 1.0]
     * @param blue - Blue color component in [0.0, 1.0]
     * @param alpha - Alpha color component in [0.0, 1.0]
     * @returns - The color instance (this).
     */
    fromRGB(red: GLclampf, green: GLclampf, blue: GLclampf,
        alpha: GLclampf = Color.DEFAULT_ALPHA): Color {
        const previous = duplicate4<GLclampf>(this._rgba);

        this._rgba = clampf4([red, green, blue, alpha], 'RGBA input');

        this._altered = !equals4<GLclampf>(this._rgba, previous);
        return this;
    }

    /**
     * Specifies the internal rgba store using a color in HSL color space.
     * @param hue - Hue color component in [0.0, 1.0]
     * @param saturation - Saturation color component in [0.0, 1.0]
     * @param lightness - Lightness color component in [0.0, 1.0]
     * @param alpha - Alpha color component in [0.0, 1.0]
     * @returns - The color instance (this).
     */
    fromHSL(hue: GLclampf, saturation: GLclampf, lightness: GLclampf,
        alpha: GLclampf = Color.DEFAULT_ALPHA): Color {
        const previous = duplicate4<GLclampf>(this._rgba);

        const rgb = hsl2rgb([hue, saturation, lightness]);
        const alphaf = clampf(alpha, 'ALPHA input');

        this._rgba = [rgb[0], rgb[1], rgb[2], alphaf];

        this._altered = !equals4<GLclampf>(this._rgba, previous);
        return this;
    }

    /**
     * Specifies the internal rgba store using a color in CIE-Lab color space.
     * @param lightness - Lightness color component in [0.0, 1.0]
     * @param greenRed - Green-Red/a color component in [0.0, 1.0]
     * @param blueYellow - Blue-Yellow/b color component in [0.0, 1.0]
     * @param alpha - Alpha color component in [0.0, 1.0]
     * @returns - The color instance (this).
     */
    fromLAB(lightness: GLclampf, greenRed: GLclampf, blueYellow: GLclampf,
        alpha: GLclampf = Color.DEFAULT_ALPHA): Color {
        const previous = duplicate4<GLclampf>(this._rgba);

        const rgb = lab2rgb([lightness, greenRed, blueYellow]);
        const alphaf = clampf(alpha, 'ALPHA input');

        this._rgba = [rgb[0], rgb[1], rgb[2], alphaf];

        this._altered = !equals4<GLclampf>(this._rgba, previous);
        return this;
    }

    /**
     * Specifies the internal rgba store using a color in CMYK color space.
     * @param cyan - Cyan color component in [0.0, 1.0]
     * @param magenta - Magenta color component in [0.0, 1.0]
     * @param yellow - Yellow color component in [0.0, 1.0]
     * @param key - Key/Black color component in [0.0, 1.0]
     * @param alpha - Alpha color component in [0.0, 1.0]
     * @returns - The color instance (this).
     */
    fromCMYK(cyan: GLclampf, magenta: GLclampf, yellow: GLclampf, key: GLclampf,
        alpha: GLclampf = Color.DEFAULT_ALPHA): Color {
        const previous = duplicate4<GLclampf>(this._rgba);

        const rgb = cmyk2rgb([cyan, magenta, yellow, key]);
        const alphaf = clampf(alpha, 'ALPHA input');

        this._rgba = [rgb[0], rgb[1], rgb[2], alphaf];

        this._altered = !equals4<GLclampf>(this._rgba, previous);
        return this;
    }

    /**
     * Specifies the internal rgba store using a hexadecimal color string.
     * @param hex - Hexadecimal color string: red, green, blue, and alpha (optional) each in ['00', 'ff'].
     * @returns - The color instance (this).
     */
    fromHex(hex: string): Color {
        const previous = duplicate4<GLclampf>(this._rgba);

        this._rgba = hex2rgba(hex);

        this._altered = !equals4<GLclampf>(this._rgba, previous);
        return this;
    }

    /**
     * Converts the color to a gray value using the specified algorithm.
     * @param algorithm - The algorithm used for color to gray conversion.
     */
    gray(algorithm: GrayscaleAlgorithm = GrayscaleAlgorithm.LinearLuminance): GLclampf {

        // eslint-disable-next-line default-case
        switch (algorithm) {

            /* Does not represent shades of grayscale w.r.t. human perception of luminosity. */
            case GrayscaleAlgorithm.Average:
                return (this._rgba[0] + this._rgba[1] + this._rgba[2]) / 3.0;

            /* flat (reduced contrast) and dark grayscale */
            case GrayscaleAlgorithm.LeastSaturatedVariant:
                return (Math.max(this._rgba[0], this._rgba[1], this._rgba[2])
                    - Math.min(this._rgba[0], this._rgba[1], this._rgba[2])) * 0.5;

            /* provides a darker grayscale */
            case GrayscaleAlgorithm.MinimumDecomposition:
                return Math.min(this._rgba[0], this._rgba[1], this._rgba[2]);

            /* provides a brighter grayscale */
            case GrayscaleAlgorithm.MaximumDecomposition:
                return Math.max(this._rgba[0], this._rgba[1], this._rgba[2]);

            case GrayscaleAlgorithm.LinearLuminance:
                return this._rgba[0] * 0.2126 + this._rgba[1] * 0.7152 + this._rgba[2] * 0.0722;
        }
    }

    /**
     * Enables generic color access within a specified color space.
     * @param space - Expected color space of the requested color values.
     * @param alpha - Whether or not alpha channel should be provided as well.
     */
    tuple(space: Space, alpha: boolean = true): GLclampf3 | GLclampf4 | GLclampf5 {
        // eslint-disable-next-line default-case
        switch (space) {
            case Space.RGB:
                return alpha ? this.rgba : this.rgb;
            case Space.LAB:
                return alpha ? this.laba : this.lab;
            case Space.CMYK:
                return alpha ? this.cmyka : this.cmyk;
            case Space.HSL:
                return alpha ? this.hsla : this.hsl;
        }
    }

    /**
     * Read access to the RGB components as floating point 3-tuple, each value in range [0.0, 1.0].
     */
    get rgb(): GLclampf3 {
        return [this._rgba[0], this._rgba[1], this._rgba[2]];
    }

    /**
     * Read access to the RGB components as array of three bytes (8bit unsigned int), each in range [0, 255].
     */
    get rgbUI8(): Uint8Array {
        const ui8Array = new Uint8Array(3);
        ui8Array[0] = Math.round(this._rgba[0] * 255.0);
        ui8Array[1] = Math.round(this._rgba[1] * 255.0);
        ui8Array[2] = Math.round(this._rgba[2] * 255.0);
        return ui8Array;
    }

    /**
     * Read access to the RGB components as array of three 32bit floats, each in range [0.0, 1.0].
     */
    get rgbF32(): Float32Array {
        const f32Array = new Float32Array(3);
        f32Array[0] = this._rgba[0];
        f32Array[1] = this._rgba[1];
        f32Array[2] = this._rgba[2];
        return f32Array;
    }

    /**
     * Read access to the RGBA components as floating point 4-tuple, each value in range [0.0, 1.0].
     */
    get rgba(): GLclampf4 {
        return this._rgba;
    }

    /**
     * Read access to the RGBA components as array of four bytes (8bit unsigned int), each in range [0, 255].
     */
    get rgbaUI8(): Uint8Array {
        const ui8Array = new Uint8Array(4);
        ui8Array[0] = Math.round(this._rgba[0] * 255.0);
        ui8Array[1] = Math.round(this._rgba[1] * 255.0);
        ui8Array[2] = Math.round(this._rgba[2] * 255.0);
        ui8Array[3] = Math.round(this._rgba[3] * 255.0);
        return ui8Array;
    }

    /**
     * Read access to the RGBA components as array of four 32bit floats, each in range [0.0, 1.0].
     */
    get rgbaF32(): Float32Array {
        return new Float32Array(this._rgba);
    }

    /**
     * Read access to the Red component as float value in range [0.0, 1.0].
     */
    get r(): GLclampf {
        return this._rgba[0];
    }

    /**
     * Read access to the Green component as float value in range [0.0, 1.0].
     */
    get g(): GLclampf {
        return this._rgba[1];
    }

    /**
     * Read access to the Blue component as float value in range [0.0, 1.0].
     */
    get b(): GLclampf {
        return this._rgba[2];
    }

    /**
     * Read access to the Alpha component as float value in range [0.0, 1.0].
     */
    get a(): GLclampf {
        return this._rgba[3];
    }

    /**
     * Read access to the RGB components as hexadecimal string.
     */
    get hexRGB(): string {
        return rgb2hex(this.rgb);
    }

    /**
     * Read access to the RGBA components as hexadecimal string.
     */
    get hexRGBA(): string {
        return rgba2hex(this._rgba);
    }

    /**
     * Read access to the HSL components as floating point 3-tuple, each value in range [0.0, 1.0].
     */
    get hsl(): GLclampf3 {
        return rgb2hsl(this.rgb);
    }

    /**
     * Read access to the HSLA components as floating point 4-tuple, each value in range [0.0, 1.0].
     */
    get hsla(): GLclampf4 {
        const hsl = rgb2hsl(this.rgb);
        return [hsl[0], hsl[1], hsl[2], this._rgba[3]];
    }

    /**
     * Read access to the LAB components as floating point 3-tuple, each value in range [0.0, 1.0].
     */
    get lab(): GLclampf3 {
        return rgb2lab(this.rgb);
    }

    /**
     * Read access to the LABA components as floating point 4-tuple, each value in range [0.0, 1.0].
     */
    get laba(): GLclampf4 {
        const lab = rgb2lab(this.rgb);
        return [lab[0], lab[1], lab[2], this._rgba[3]];
    }

    /**
     * Read access to the CMYK components as floating point 4-tuple, each value in range [0.0, 1.0].
     */
    get cmyk(): GLclampf4 {
        return rgb2cmyk(this.rgb);
    }

    /**
     * Read access to the CMYKA components as floating point 5-tuple, each value in range [0.0, 1.0].
     */
    get cmyka(): GLclampf5 {
        const cmyk = rgb2cmyk(this.rgb);
        return [cmyk[0], cmyk[1], cmyk[2], cmyk[3], this._rgba[3]];
    }

    /**
     * Whether or not color value has changed.
     */
    get altered(): boolean {
        return this._altered;
    }

    /**
     * Intended for resetting alteration status.
     */
    set altered(status: boolean) {
        this._altered = status;
    }

}

export enum GrayscaleAlgorithm {
    Average = 'average',
    LinearLuminance = 'linear-luminance', /* CIE1931 */
    LeastSaturatedVariant = 'least-saturated-variant',
    MinimumDecomposition = 'minimum-decomposition',
    MaximumDecomposition = 'maximum-decomposition',
}

/**
 * Color spaces covered by this class.
 */
export enum Space {
    RGB = 'rgb',
    HSL = 'hsl',
    LAB = 'lab',
    CMYK = 'cmyk',
}
