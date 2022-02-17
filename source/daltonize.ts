

/* spellchecker: disable */

import { vec2, vec3, mat4, GLclampf3 } from '@haeley/math';
import { Color } from '.';

import { rgb2srgb, srgb2rgb } from './conversion';

/* spellchecker: enable */

export enum ColorVisionDeficiency {
    None,
    Protanope,    // reds are greatly reduced   (1% men)
    Deuteranope,  // greens are greatly reduced (1% men)
    Tritanope     // blues are greatly reduced  (0.003% population)
};

// D65 white point xyz coords http://en.wikipedia.org/wiki/Standard_illuminant
const D65 = vec3.fromValues(0.312713, 0.329016, 0.358271);

// sRGB to/from XYZ for D65 http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
const sRGB2XYZ = mat4.fromValues(
    0.4124564, 0.3575761, 0.1804375, 0.0,
    0.2126729, 0.7151522, 0.0721750, 0.0,
    0.0193339, 0.1191920, 0.9503041, 0.0,
    0.0000000, 0.0000000, 0.0000000, 1.0);

const XYZ2sRGB = mat4.fromValues(
    3.2404542, -1.5371385, -0.4985314, 0.0,
    -0.9692660, 1.8760108, 0.0415560, 0.0,
    0.0556434, -0.2040259, 1.0572252, 0.0,
    0.0000000, 0.0000000, 0.0000000, 1.0);

/**
 * "Daltonization is a procedure for adapting colors ... for improving
 *  the color perception by a color-deficient viewer."
 *
 * More on this:
 * - http://www.daltonize.org/2010/05/there-is-not-just-one-color-blindness.html
 * - http://www.color-blindness.com/2007/01/23/confusion-lines-of-the-cie-1931-color-space/
 * - http://jfly.iam.u-tokyo.ac.jp/color
 *
 * The following algorithm is based on: http://colorlab.wickline.org/colorblind/colorlab/
 * The color_blind_sims() JavaScript function in the is copyright(c) 2000-2001
 * by Matthew Wickline and the Human-Computer Interaction Resource Network (http://hcirn.com)
 */
export function daltonize(rgb: GLclampf3, deficiency: ColorVisionDeficiency, gamma: GLclampf = DEFAULT_GAMMA): GLclampf3 {

    let CIED: CIEDeficiency;
    switch (deficiency) {
        case ColorVisionDeficiency.Protanope:
            CIED = new CIEDeficiency([+0.735, +0.265], [0.115807, 0.073581], [0.471899, 0.527051]);
            break;
        case ColorVisionDeficiency.Deuteranope:
            CIED = new CIEDeficiency([+1.140, -0.140], [0.102776, 0.102864], [0.505845, 0.493211]);
            break;
        case ColorVisionDeficiency.Tritanope:
            CIED = new CIEDeficiency([+0.171, -0.003], [0.045391, 0.294976], [0.665764, 0.334011]);
            break;
        case ColorVisionDeficiency.None:
        default:
            return [rgb[0], rgb[1], rgb[2]];
    }

    const crgb = rgb2srgb(rgb);
    const cxyz = vec3.transformMat4(vec3.create(), crgb, sRGB2XYZ);
    const csum = 1.0 / (cxyz[0] + cxyz[1] + cxyz[2]);

    const cuvY = vec3.fromValues(cxyz[0] * csum, cxyz[1] * csum, 0.0);

    // find neutral grey at this luminosity
    let nxyz = vec3.fromValues(D65[0], 0.0, D65[2]);
    vec3.scale(nxyz, nxyz, cxyz[1] / D65[1]);

    // retrieve confusion line between color and the deficiency confusion point
    let clm: number;
    if (cuvY[0] < CIED.dcp[0])
        clm = (CIED.dcp[1] - cuvY[1]) / (CIED.dcp[0] - cuvY[0]);
    else
        clm = (cuvY[1] - CIED.dcp[1]) / (cuvY[0] - CIED.dcp[0]);

    const clyi = cuvY[1] - cuvY[0] * clm;

    // find the change in the u and v dimensions (no Y change)
    let duvY = vec3.create();
    duvY[0] = (CIED.clyi - clyi) / (clm - CIED.clm);
    duvY[1] = (clm * duvY[0]) + clyi;

    // find the simulated color's XYZ coords
    const sxyz = vec3.fromValues(duvY[0] * cxyz[1] / duvY[1], cxyz[1],
        (1.0 - (duvY[0] + duvY[1])) * cxyz[1] / duvY[1]);

    const srgb = vec3.transformMat4(vec3.create(), sxyz, XYZ2sRGB);

    // note the RGB differences between sim color and our neutral color
    const drgb = vec3.transformMat4(vec3.create(),
        [nxyz[0] - sxyz[0], 0.0, nxyz[2] - sxyz[2]], XYZ2sRGB);

    // find out how much to shift sim color toward neutral to fit in RGB space
    let argb = vec3.create();
    argb[0] = drgb[0] ? ((srgb[0] < 0 ? 0.0 : 1.0) - srgb[0]) / drgb[0] : 0.0;
    argb[0] = drgb[1] ? ((srgb[1] < 0 ? 0.0 : 1.0) - srgb[1]) / drgb[1] : 0.0;
    argb[0] = drgb[2] ? ((srgb[2] < 0 ? 0.0 : 1.0) - srgb[2]) / drgb[2] : 0.0;

    const adjust = Math.max(
        (argb[0] > 1.0 || argb[0] < 0.0) ? 0.0 : argb[0],
        (argb[1] > 1.0 || argb[1] < 0.0) ? 0.0 : argb[1],
        (argb[2] > 1.0 || argb[2] < 0.0) ? 0.0 : argb[2]);

    // now shift *all* three proportional to the greatest shift...
    vec3.scale(drgb, drgb, adjust);
    vec3.add(srgb, srgb, drgb);

    // vec3.clamp(srgb, srgb, [0.0, 0.0, 0.0], [1.0, 1.0, 1.0]);

    return srgb2rgb([srgb[0], srgb[1], srgb[2]], gamma);
};



class CIEDeficiency {

    public clm = 0.0;
    /**
     * "y-intercept" of axis (actually on the v-axis)
     */
    public clyi = 0.0;

    /**
     * Dichromatic convergence points
     */
    public dcp: vec2;
    public begin: vec2;
    public end: vec2;


    constructor(dcp: vec2, begin: vec2, end: vec2) {

        this.dcp = vec2.clone(dcp);

        this.begin = vec2.clone(begin);
        this.end = vec2.clone(end);

        this.clm = (this.end[1] - this.begin[1]) / (this.end[0] - this.begin[0]);
        this.clyi = this.begin[1] - this.clm * this.begin[0];
    }
}
