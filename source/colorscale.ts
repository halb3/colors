
/* spellchecker: disable */

import { assert, fetchJsonAsync, jsonschema } from '@haeley/auxiliaries';
import { clamp } from '@haeley/math';

import { ColorEncoding, ColorSpace, getEncodingFromSpace, length } from './encoding';
import { ColorVisionDeficiency, daltonize } from './daltonize';
import { Color, DEFAULT_GAMMA } from './color';
import { lerp } from './lerp';

import PresetsSchema from './colorscalepresets.schema.json';
import { ColorTuple } from '.';

/* spellchecker: enable */


/**
 * Basic color gradient representation that uses color stops, a color at a specific position, to allow for color
   queries
 * at arbitrary positions. The gradient provides {@link Color} instances to facilitate the use of various color
   spaces.
 * ```
 * const gradient = new ColorGradient();
 * gradient.add(new gloperate.Color([0.09, 0.43, 0.58]), 0.2);
 * gradient.add(new gloperate.Color([0.97, 0.98, 0.98]), 0.8);
 * ...
 * gradient.color(0.66).rgb; // [0.7646666765213013, 0.8516666889190674, 0.8866666555404663]
 * gradient.lerpSpace = ColorGradient.LerpSpace.LAB;
 * gradient.color(0.66).rgb; // [0.8264121413230896, 0.8263672590255737, 0.8262822031974792]
 * ```
 */
export class ColorScale {

    /** @see{@link hint} */
    protected _hint: InterpolationHint = InterpolationHint.Linear;

    /** @ee{@link colors} */
    protected _colors = new Array<Color>();

    /** @see{@link invert} */
    protected _inverted = false;

    /** @see{@link deficiency} */
    protected _deficiency = ColorVisionDeficiency.None;

    /** @see{@link gamma} */
    protected _gamma = DEFAULT_GAMMA;

    static readonly PresetSchema: jsonschema.Schema = PresetsSchema;


    /**
     * Fetches a color schema file, and, if successful, picks a preset for the specified number of steps. If the named
     * preset cannot be found, a list of all available presets within the file is logged and undefined is returned. If
     * the preset does not specify exact colors for the requested number of steps, the color array with the most colors
     * and linear interpolation in CIE-LAB is used to generate the scale.
     *
     * The following preset libraries are included within webgl-operate but are required to be loaded dynamically (in
     * order to reduce bundle size and memory use):
     * ```
     * ColorScale.fromPreset('./data/colorbrewer.json', 'YlGnBu', 7);
     * ColorScale.fromPreset('./data/smithwalt.json', 'viridis', 16);
     * ```
     * And resolving the promise:
     * ```
     * const scale: ColorScale | undefined = undefined;
     * ColorScale.fromPreset('./data/colorbrewer.json', 'YlGnBu', 5).then((value) => scale = value);
     * ```
     * @param url - Uniform resource locator string referencing a json file complying to the JSON color schema.
     * @param preset - Name of a preset to choose from the json file.
     * @param stepCount - Number of steps to be used for the resulting color scheme.
     * @returns - Undefined if loading and validating the json failed or the preset was not found. Else, a color scale.
     */
    static fromPreset(url: string, preset: string, stepCount: number): Promise<ColorScale> {

        /* This transforms the fetched json data into a color scale. */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transform = (data: any): ColorScale | undefined => {

            /* Find named preset. */
            let p: Preset | undefined;
            for (const item of data) {
                if (item.identifier !== preset) {
                    continue;
                }
                p = item as Preset;
                break;
            }
            if (p === undefined) {
                return undefined;
            }

            const encoding = p.encoding as SupportedEncodings;
            const stride = length(encoding);

            /* Find best color array match for targeted step count. The best match is either the exact number of
            colors or the largest available number. */
            const colorsByStepCount = p.colors;
            let index = colorsByStepCount.length - 1;
            for (let i = 0; i < colorsByStepCount.length; ++i) {
                if (colorsByStepCount[i].length !== stepCount * stride) {
                    continue;
                }
                index = i;
                break;
            }
            const colors = colorsByStepCount[index];

            /* Check if there is a matching positions array to the selected color array. */
            const positionsByStepCount = p.positions;
            if (positionsByStepCount === undefined) {
                return ColorScale.fromArray(colors, encoding, stepCount, undefined);
            }

            let positions: Array<number> | undefined;
            for (let i = 0; i < positionsByStepCount.length; ++i) {
                if (positionsByStepCount[i].length !== colors.length) {
                    continue;
                }
                positions = positionsByStepCount[i];
            }
            return ColorScale.fromArray(colors, encoding, stepCount, positions);
        };

        return fetchJsonAsync<ColorScale>(url, transform, ColorScale.PresetSchema);
    }

    /**
     * Creates a color scale from a set of colors and (optional) positions for a specific step count. If no positions
     * are specified, the colors are spread equally. A step count of 1 returns the first color.
     * @param interleavedColorComponents - Interleaved array of color components, e.g., red, green, and blue.
     * @param encoding - The array type specifying the number of subsequent color components for each color.
     * @param stepCount - Number of colors to be computed from the color scale.
     * @param positions - Interleaved array of positions, matching the length of the color array divided by stride.
     * @returns - A color scale of fixed number and position of colors for index and linear interpolation access.
     */
    static fromArray(interleavedColorComponents: Array<number>, encoding: SupportedEncodings,
        stepCount: number, positions?: Array<number>): ColorScale {
        if (stepCount === 0 || interleavedColorComponents.length === 0) {
            return new ColorScale();
        }

        const array = interleavedColorComponents; // just a shorter handle
        const stride = length(encoding);
        const size = array.length / stride;
        const colors = new Array<Color>(size);

        /* Transform the interleaved array values into instances of Color. */
        for (let i = 0; i < array.length; i += stride) {
            const color = new Color();
            switch (encoding) {
                case ColorEncoding.RGB:
                    color.fromUI8(array[i + 0], array[i + 1], array[i + 2]);
                    break;
                case ColorEncoding.RGBA:
                    color.fromUI8(array[i + 0], array[i + 1], array[i + 2], array[i + 3]);
                    break;
                case ColorEncoding.rgb:
                    color.fromF32(array[i + 0], array[i + 1], array[i + 2]);
                    break;
                case ColorEncoding.rgba:
                    color.fromF32(array[i + 0], array[i + 1], array[i + 2], array[i + 3]);
                    break;
                default:
            }
            colors[i / stride] = color;
        }

        const scale = new ColorScale();

        /* No further computation required if colors already match step count and no positions are given. */
        if (positions === undefined && stepCount === size) {
            scale._colors = colors;
            return scale;
        }

        if (stepCount === 1) {
            scale._colors.push(colors[0]);
        }

        /* Note: At this point, stepCount is always > 1. */

        /* Provide equally distributed positions if none are given. */
        if (positions === undefined) {
            positions = new Array(size);
            positions[0] = 0.0;

            for (let i = 1; i < size; ++i) {
                positions[i] = i / (size - 1);
            }
        }
        assert(positions.length === colors.length,
            `expected number of positions (${positions.length}) to match number of colors (${colors.length})`);

        let lower = 0;
        let upper = lower + 1;
        const last = size - 1;

        /* Compute requested number of colors using linear interpolation of positioned colors. */
        for (let i = 0; i < stepCount; ++i) {
            const position = i === 0 ? 0 : i / (stepCount - 1);

            /* If position is before first or after last stop, return that stop respectively. */
            if (position <= positions[lower]) {
                scale._colors.push(colors[lower]);
                continue;
            } else if (positions[last] <= position) {
                scale._colors.push(colors[last]);
                continue;
            }

            /* There are at least two stops and the position is within these stops ... */

            for (let u = lower + 1; u < size; ++u) {
                if (positions[u] < position) {
                    continue;
                }
                upper = u;
                lower = u - 1;
                break;
            }
            const a = (position - positions[lower]) / (positions[upper] - positions[lower]);
            scale._colors.push(lerp(colors[lower], colors[upper], a, ColorSpace.lab));
        }
        return scale;
    }


    /**
     * Queries the color at a given position by identifying the adjacent stops (lower and upper bound) and either
     * interpolating between these or picking the nearest of both. In case no stop exists, a default color will be
     * returned. If only one color exists, this color is always returned no matter the position. If the position is
     * out of bounds, either the first or last stop's color is returned.
     * @param position - Position in [0.0, 1.0] to linear interpolate the color at.
     * @param space - The color space that is to be used for linear interpolation of two colors.
     * @returns - Color, depending on the gradient type either linearly or nearest filtered color.
     */
    lerp(position: number, space: ColorSpace = ColorSpace.lab): Color | undefined {

        if (this._colors.length === 0) {
            return undefined;
        }
        if (this._colors.length === 1) {
            return this._colors[0];
        }


        /* Return first or last color if position is 0.0 or 1.0 respectively. */
        const clamped = clamp(position, 0.0, 1.0);
        if (clamped <= 0.0) {
            return this._colors[0];
        } else if (clamped >= 1.0) {
            return this._colors[this._colors.length - 1];
        }

        /* Find lower and upper bound for the given position. */
        const posIndex = position * this._colors.length; // Position in index space.
        const lower = Math.floor(posIndex);
        const upper = lower + 1;

        if (upper >= this._colors.length) {
            return this._colors[this._colors.length - 1];
        }

        // tslint:disable-next-line: max-line-length
        assert(upper < this._colors.length, `expected upper not exceed maximum color index: ${upper} < ${this._colors.length}`);

        if (this._hint === InterpolationHint.Nearest) {
            return this._colors[posIndex - lower <= upper - posIndex ? lower : upper];
        }
        return lerp(this._colors[lower], this._colors[upper], posIndex - lower, space);
    }

    /**
     * Returns the color with specified index. If the index is out of bounds, undefined is returned. Alternatively, the
     * color array can be used directly @see{@link colors}.
     * @param index - Index of the color to access.
     */
    color(index: number): Color | undefined {
        if (index < 0 || index >= this._colors.length) {
            return undefined;
        }
        return this._colors[index];
    }

    /**
     * Returns the array containing the colors of the color scale.
     */
    get colors(): Array<Color> {
        return this._colors;
    }
    set colors(colors: Array<Color>) {
        this._colors = colors;
    }


    /**
     * The interpolation hint used when accessing a color using interpolation, e.g., @see{@link lerp}.
     */
    set hint(hint: InterpolationHint) {
        this._hint = hint;
    }
    get hint(): InterpolationHint {
        return this._hint;
    }


    /**
     * Provides read access to the number of colors of this scale. This is a shortcut for this.colors.length.
     */
    get length(): number {
        return this._colors.length;
    }

    /**
     * Whether or not the scale was inverted based on its initial state.
     */
    get inverted(): boolean {
        return this._inverted;
    }

    /**
     * Inverts the color scale. Whether or not the scale is inverted can be checked using the
     * inverted read-only property (@link inverted).
     */
    invert(): void {
        this._colors.reverse();
        this._inverted = !this._inverted;
    }

    /**
     * Returns the color-vision-deficiency transformation.
     */
    get deficiency(): ColorVisionDeficiency {
        return this._deficiency;
    }
    set deficiency(deficiency: ColorVisionDeficiency) {
        this._deficiency = deficiency;
    }

    /**
    * Returns the gamma value used for the set color-vision-deficiency transformation.
    */
    get gamma(): GLclampf {
        return this._gamma;
    }
    set gamma(gamma: GLclampf) {
        this._gamma = gamma;
    }


    /**
     * Converts the color scale into an array of interleaved unsigned int values of the requested color space.
     * @param space - Color space that is to be used for the array.
     * @todo This is currently not in line with the color.rgbUI8 interface, perhaps a generic UI8 and F32 conversion is required.
     */
    bitsUI8(space: ColorSpace = ColorSpace.rgb, alpha: boolean = false): Uint8ClampedArray {
        const size = this._colors.length;
        const stride = alpha ? 4 : 3;
        const bits = new Uint8ClampedArray(size * stride);
        const encoding = getEncodingFromSpace(space, space !== ColorSpace.cmyk && alpha);

        let color: Color;
        let tuple: ColorTuple;
        for (let i = 0; i < size; ++i) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            color = Color.clone(this.color(i)!);
            if (this._deficiency !== ColorVisionDeficiency.None) {
                tuple = daltonize(color.rgb, this._deficiency, this._gamma);
                color.fromRGB(tuple[0], tuple[1], tuple[2], color.a);
            }
            tuple = color.tuple(encoding);

            bits[i * stride + 0] = tuple[0] * 255;
            bits[i * stride + 1] = tuple[1] * 255;
            bits[i * stride + 2] = tuple[2] * 255;
            if (tuple.length === 4) {
                bits[i * stride + 3] = tuple[3] * 255;
            }
        }
        return bits;
    }

    /**
     * Converts the color scale into an array of interleaved float values of the requested color space.
     * Note, that CMYK encoding will ignore the alpha channel.
     * @param space - Color encoding that is to be used for the array.
     * @todo This is currently not in line with the color.rgbF32 interface, perhaps a generic UI8 and F32 conversion is required.
     */
    bitsF32(space: ColorSpace = ColorSpace.rgb, alpha: boolean = false): Float32Array {
        const size = this._colors.length;
        const stride = alpha ? 4 : 3;
        const bits = new Float32Array(size * stride);
        const encoding = getEncodingFromSpace(space, space !== ColorSpace.cmyk && alpha);

        let color: Color;
        let tuple: ColorTuple;
        for (let i = 0; i < size; ++i) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            color = Color.clone(this.color(i)!);
            if (this._deficiency !== ColorVisionDeficiency.None) {
                tuple = daltonize(color.rgb, this._deficiency, this._gamma);
                color.fromRGB(tuple[0], tuple[1], tuple[2], color.a);
            }
            tuple = color.tuple(encoding);

            bits[i * stride + 0] = tuple[0];
            bits[i * stride + 1] = tuple[1];
            bits[i * stride + 2] = tuple[2];
            if (tuple.length === 4) {
                bits[i * stride + 3] = tuple[3];
            }
        }
        return bits;
    }

}


/**
 * Color interpolation type for a color scale.
 */
export enum InterpolationHint {
    Linear = 'linear',
    Nearest = 'nearest',
}

export enum ScaleType {
    sequential = 'sequential',
    diverging = 'diverging',
    qualitative = 'qualitative',
}

/** @todo just support all encodings ...  */
type SupportedEncodings = ColorEncoding.RGB | ColorEncoding.RGBA | ColorEncoding.rgb | ColorEncoding.rgba;

export interface Preset {
    identifier: string;
    type: ScaleType | undefined;
    encoding: SupportedEncodings;
    colors: Array<Array<number>>;
    positions: Array<Array<number>> | undefined;
}
