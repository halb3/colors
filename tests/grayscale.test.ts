
/* spellchecker: disable */

import { expect } from 'chai';

import { RGB2rgb } from '../source/conversion';
import { grayscale, GrayscaleAlgorithm } from '../source/grayscale';

/* spellchecker: enable */


describe('grayscale', () => {

    it('should compute various grayscales', () => {
        const rgb = RGB2rgb([48, 96, 192]);

        expect(grayscale(rgb, GrayscaleAlgorithm.Average)[0]).to.be.closeTo(0.4392, 1e-4);
        expect(grayscale(rgb, GrayscaleAlgorithm.LeastSaturatedVariant)[0]).to.be.closeTo(0.2824, 1e-4);
        expect(grayscale(rgb, GrayscaleAlgorithm.LinearLuminance)[0]).to.be.closeTo(0.3636, 1e-4);
        expect(grayscale(rgb, GrayscaleAlgorithm.MaximumDecomposition)[0]).to.be.closeTo(0.7529, 1e-4);
        expect(grayscale(rgb, GrayscaleAlgorithm.MinimumDecomposition)[0]).to.be.closeTo(0.1882, 1e-4);

        // test default to be LinearLuminance
        expect(grayscale(rgb)[0]).to.be.closeTo(0.3636, 1e-4);
    });

});
