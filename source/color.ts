
/* spellchecker: disable */

import { assert, Alterable, log, LogLevel, Serializable } from '@haeley/auxiliaries';
import {
    clampf, clampf4, duplicate4, equals4, GLclampf3, GLclampf4, GLclampf5
} from '@haeley/math';

import { ColorTuple, ColorEncoding, GLubyte, length } from './encoding';
import {
    cmyk2rgb, hex2rgba, hsl2rgb, lab2rgb,
    rgb2cmyk, rgb2hex, rgb2hsl, rgb2lab, rgba2hex, rgb2srgb, rgba2srgba,
    rgb2RGB, rgba2RGBA, rgba2RGBa, RGBA2rgba, RGBa2rgba,
    HEX_FORMAT_REGEX, COLOR_STRING_REGEX
} from './conversion';

/* spellchecker: enable */


export const DEFAULT_ALPHA: GLclampf = 1.0;
export const DEFAULT_GAMMA: GLclampf = 2.2;


/**
 * Color class that allows for specification and conversion of colors in various color spaces. Please not that most of
 * the color conversion math is based on  {@link https://www.easyrgb.com/en/math.php}. The internal color representation
 * is a 4-tuple of GLclampf components in RGB color space and additional alpha. All color conversion, e.g., getters is
 * computed on the fly, not cached, and is not optimized for, e.g., massive pixel processing.
 */
export class Color implements Serializable, Alterable {

    static random(alpha: boolean = false): Color {
        return new Color([Math.random(), Math.random(), Math.random()], alpha ? Math.random() : 1.0);
    }

    static clone(color: Color): Color {
        return new Color(color.rgba);
    }

    protected _rgba: GLclampf4 = [0.0, 0.0, 0.0, DEFAULT_ALPHA];


    /** @see {@link altered} */
    protected _altered = false;

    /**
     * Creates an instance of color (a 4-tuple in RGBA space).
     * @param rgba - Either RGB tuple or RGBA tuple. If none is provided, default will be kept.
     * @param alpha - If RGB tuple is provided an additional alpha value can be specified.
     */
    constructor(color?: string | GLclampf3 | GLclampf4, alpha?: GLclampf) {
        if (color === undefined) {
            return;
        }
        // parse color string
        if (typeof color === 'string' || color instanceof String) {
            this.fromString(color as string, alpha);
            return;
        }

        if (color.length === 3 && alpha !== undefined) {
            this.fromF32(color[0], color[1], color[2], alpha);
        } else if (color.length === 4) {
            this.fromF32(color[0], color[1], color[2], color[3]);
            assert(alpha === undefined, `expected alpha to be undefined when given an 4-tuple in RGBA`);
        } else {
            this.fromF32(color[0], color[1], color[2]);
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
     * Tries to parse color values from a given color string, e.g., '#0ff' or 'rgba(1.0, 0.3, 0.0, 1.0).
     * @param colorstr - String to parse a color from.
     * @param alpha - Optional alpha value, in case the string is known to have no alpha information.
     * @returns - The color instance itself, with, if sucessfull, updated color values.
     */
    fromString(colorstr: string, alpha?: GLclampf): Color {
        // check if string is given in a supported format
        const isHexString = HEX_FORMAT_REGEX.test(colorstr);
        const isColorString = isHexString ? false : COLOR_STRING_REGEX.test(colorstr);

        if (!isColorString && !isHexString) {
            log(LogLevel.Warning, `format of color string not supported, given '${colorstr}'`);
            return this;
        }

        if (isHexString) {
            return this.fromHex(colorstr);
        }

        // first group is the color space identifier, second group the numbers within parenthesis
        const matches = colorstr.match(/^(rgba?|RGBA?||RGBa?|hsla?|laba?|cmyka?)\((.*?)\)$/);
        if (matches === null) {
            return this;
        }

        const values = JSON.parse(`[${matches[2]}]`);
        assert(values.length === length(matches[1] as ColorEncoding), `'${matches[1]}' string expected to provide ${matches[1].length} decimal values, given ${values.length} ('${matches[2]}')`);

        switch (matches[1]) { //
            case 'rgb':
                return this.fromRGB(values[0], values[1], values[2], alpha);
            case 'rgba':
                return this.fromRGB(values[0], values[1], values[2], values[3]);
            case 'RGB':
                return this.fromUI8(values[0], values[1], values[2], alpha);
            case 'RGBA':
                return this.fromUI8(values[0], values[1], values[2], values[3]);
            case 'RGBa': {
                const rgba = RGBa2rgba(values);
                return this.fromRGB(rgba[0], rgba[1], rgba[2], rgba[3]);
            }
            case 'hsl':
                return this.fromHSL(values[0], values[1], values[2], alpha);
            case 'hsla':
                return this.fromHSL(values[0], values[1], values[2], values[3]);
            case 'lab':
                return this.fromLAB(values[0], values[1], values[2], alpha);
            case 'laba':
                return this.fromLAB(values[0], values[1], values[2], values[3]);
            case 'cmyk':
                return this.fromCMYK(values[0], values[1], values[2], values[3], alpha);
            case 'cmyka':
                return this.fromCMYK(values[0], values[1], values[2], values[3], values[4]);
        }

        return this;
    }

    /**
     * Creates a parsable string that describes the color in a given color space.
     * @param encoding - Color space to create a string for, e.g., 'rgba' or 'RGB'.
     * @param fractionDigits - Number of
     * @returns - String that can be used for serialization and can also be parsed by the constructor.
     */
    toString(encoding: ColorEncoding = ColorEncoding.rgba,
        fractionDigits: number = 4, encodingIdentifier?: string): string {

        let values: ColorTuple;
        switch (encoding) { //
            case 'hex':
                return `${this.hexRGB}`;
            case 'hexa':
                return `${this.hexRGBA}`;
            default:
                values = this.tuple(encoding);
                break;
        }
        const encId = encodingIdentifier ? encodingIdentifier : encoding;

        if (values instanceof Uint8Array) {
            if (values.length === 3) {
                return `${encId}(${values.join(', ')})`;
            }
            const alpha = encoding === 'RGBa' ? this.a.toFixed(fractionDigits) : `${values[3]}`;
            return `${encId}(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
        }
        return `${encId}(${values?.map((value) => (value as number).toFixed(fractionDigits)).join(', ')})`;
    }

    serialize(): string {
        return this.toString(ColorEncoding.rgba); // most accurate storage by default.
    }

    deserialize(text: string): void {
        this.fromString(text, 1.0);
    }


    /**
     * Specifies the internal rgba store using a color in float (32bit) RGBA colors.
     * @param red - Red color component in [0.0, 1.0]
     * @param green - Green color component in [0.0, 1.0]
     * @param blue - Blue color component in [0.0, 1.0]
     * @param alpha - Alpha color component in [0.0, 1.0]
     * @returns - The color instance (this).
     */
    fromF32(red: GLfloat, green: GLfloat, blue: GLfloat, alpha: GLfloat = DEFAULT_ALPHA): Color {
        const previous = duplicate4<GLclampf>(this._rgba);

        this._rgba[0] = clampf(red);
        this._rgba[1] = clampf(green);
        this._rgba[2] = clampf(blue);
        this._rgba[3] = clampf(alpha);

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
        alpha: GLubyte = Math.floor(DEFAULT_ALPHA * 255)): Color {
        const previous = duplicate4<GLclampf>(this._rgba);

        this._rgba = RGBA2rgba([red, green, blue, alpha]);

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
        alpha: GLclampf = DEFAULT_ALPHA): Color {
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
        alpha: GLclampf = DEFAULT_ALPHA): Color {
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
        alpha: GLclampf = DEFAULT_ALPHA): Color {
        const previous = clampf4(this._rgba);

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
        alpha: GLclampf = DEFAULT_ALPHA): Color {
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
     * Enables generic color access within a specified color space.
     * @param encoding - Expected color space of the requested color values.
     */
    tuple(encoding: ColorEncoding): ColorTuple {
        // eslint-disable-next-line default-case
        switch (encoding) {
            case ColorEncoding.rgb:
                return this.rgb;
            default:
            case ColorEncoding.rgba:
                return this.rgba;
            case ColorEncoding.hex:
            case ColorEncoding.RGB:
                return this.RGB;
            case ColorEncoding.hexa:
            case ColorEncoding.RGBA:
                return this.RGBA;
            case ColorEncoding.RGBa:
                return this.RGBa;
            case ColorEncoding.hsl:
                return this.hsl;
            case ColorEncoding.hsla:
                return this.hsla;
            case ColorEncoding.lab:
                return this.lab;
            case ColorEncoding.laba:
                return this.laba;
            case ColorEncoding.cmyk:
                return this.cmyk;
            case ColorEncoding.cmyka:
                return this.cmyka;
        }
    }

    /**
     * Whether or not color value has changed. If clear is true, alteration status well be cleared.
     */
    altered(clear: boolean = false): boolean {
        if (!this._altered) {
            return false;
        }
        if (clear) {
            this._altered = false;
        }
        return true;
    }

    /**
     * Read access to the sRGB components as floating point 3-tuple, each value in range [0.0, 1.0].
     */
    srgb(gamma: GLclampf = DEFAULT_GAMMA): GLclampf3 {
        return rgb2srgb([this._rgba[0], this._rgba[1], this._rgba[2]], gamma);
    }

    /**
     * Read access to the sRGB components as floating point 4-tuple, each value in range [0.0, 1.0].
     */
    srgba(gamma: GLclampf = DEFAULT_GAMMA): GLclampf4 {
        return rgba2srgba(this._rgba, gamma);
    }


    /**
     * Read access to the RGB components as floating point 3-tuple, each value in range [0.0, 1.0].
     */
    get rgb(): GLclampf3 {
        return [this._rgba[0], this._rgba[1], this._rgba[2]];
    }

    /**
     * Read access to the RGBA components as floating point 4-tuple, each value in range [0.0, 1.0].
     */
    get rgba(): GLclampf4 {
        return [this._rgba[0], this._rgba[1], this._rgba[2], this._rgba[3]];
    }

    /**
     * Read access to the RGB components as floating point 3-tuple, each value in range [0.0, 255.0].
     */
    get RGB(): [GLubyte, GLubyte, GLubyte] {
        return rgb2RGB(this.rgb);
    }

    /**
     * Read access to the RGB components as unsigned byte 4-tuple, each value in range [0, 255].
     */
    get RGBA(): [GLubyte, GLubyte, GLubyte, GLubyte] {
        return rgba2RGBA(this._rgba);
    }

    /**
     * Read access to the RGB components as 4-tuple, alpha as float in [0.0, 1.0], rgb values in range [0, 255].
     */
    get RGBa(): [GLubyte, GLubyte, GLubyte, GLclampf] {
        return rgba2RGBa(this._rgba);
    }

    /**
     * Read access to the RGB components as array of three bytes (8bit unsigned int), each in range [0, 255].
     */
    get rgbUI8(): Uint8Array {
        return new Uint8Array(rgb2RGB(this.rgb));
    }

    /**
     * Read access to the RGB components as array of three 32bit floats, each in range [0.0, 1.0].
     */
    get rgbF32(): Float32Array {
        return new Float32Array(this.rgb);
    }

    /**
     * Read access to the RGBA components as array of four bytes (8bit unsigned int), each in range [0, 255].
     */
    get rgbaUI8(): Uint8Array {
        return new Uint8Array(rgba2RGBA(this._rgba));
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
    set r(value: GLclampf) {
        const previous = duplicate4<GLclampf>(this._rgba);
        this._rgba[0] = clampf(value);
        this._altered = !equals4<GLclampf>(this._rgba, previous);
    }

    /**
     * Read access to the Green component as float value in range [0.0, 1.0].
     */
    get g(): GLclampf {
        return this._rgba[1];
    }
    set g(value: GLclampf) {
        const previous = duplicate4<GLclampf>(this._rgba);
        this._rgba[1] = clampf(value);
        this._altered = !equals4<GLclampf>(this._rgba, previous);
    }

    /**
     * Read access to the Blue component as float value in range [0.0, 1.0].
     */
    get b(): GLclampf {
        return this._rgba[2];
    }
    set b(value: GLclampf) {
        const previous = duplicate4<GLclampf>(this._rgba);
        this._rgba[2] = clampf(value);
        this._altered = !equals4<GLclampf>(this._rgba, previous);
    }

    /**
     * Read access to the Alpha component as float value in range [0.0, 1.0].
     */
    get a(): GLclampf {
        return this._rgba[3];
    }
    set a(value: GLclampf) {
        const previous = duplicate4<GLclampf>(this._rgba);
        this._rgba[3] = clampf(value);
        this._altered = !equals4<GLclampf>(this._rgba, previous);
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

}
