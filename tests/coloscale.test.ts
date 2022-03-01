
/* spellchecker: disable */

import { expect } from 'chai';
import { stub } from 'sinon';

import { Color } from '../source/color';
import { ColorEncoding, ColorSpace } from '../source/encoding';
import { ColorScale, InterpolationHint } from '../source/colorscale';

/* spellchecker: enable */


describe('ColorScale', () => {

    let colors: Array<number>;
    let positions: Array<number>;
    let color: Color;
    let emptyColorScale: ColorScale;
    let oneColorScale: ColorScale;
    let defaultColorScale: ColorScale;
    let consoleLogStub: sinon.SinonStub;

    before(() => {
        color = new Color([255, 0, 255]);
        colors = [255, 0, 255];
        let stepCount = 7;
        oneColorScale = ColorScale.fromArray(colors, ColorEncoding.RGB, stepCount);
        colors = [255, 0, 128, 121, 12, 42, 21, 0, 90];
        stepCount = 7;
        positions = [2, 0, 1];
        defaultColorScale = ColorScale.fromArray(colors, ColorEncoding.RGB, stepCount, positions);
        emptyColorScale = ColorScale.fromArray([], ColorEncoding.RGB, 0);
        consoleLogStub = stub(console, 'log');
    });

    after(() => {
        consoleLogStub.restore();
    });

    it('should be creatable from an array', () => {
        /* eslint-disable-next-line no-unused-expressions */
        expect(defaultColorScale).to.not.be.undefined;
        expect(defaultColorScale instanceof ColorScale).to.be.true;
    });

    it('should be creatable from an array with positions', () => {
        const colorScale = ColorScale.fromArray(colors, ColorEncoding.RGB, 2, positions);
        /* eslint-disable-next-line no-unused-expressions */
        expect(colorScale).to.not.be.undefined;
    });

    it('should be creatable from an array with positions', () => {
        const colorScale = ColorScale.fromArray(colors, ColorEncoding.RGB, 1, positions);
        /* eslint-disable-next-line no-unused-expressions */
        expect(colorScale).to.not.be.undefined;
    });

    it('should be creatable from an array with alpha values', () => {
        const colorScale = ColorScale.fromArray([0.5, 0.5, 0.5, 0.2], ColorEncoding.RGBA, 1);
        /* eslint-disable-next-line no-unused-expressions */
        expect(colorScale).to.not.be.undefined;
    });

    it('should be creatable from float an array', () => {
        const colorScale = ColorScale.fromArray([0.5, 0.5, 0.5], ColorEncoding.rgb, 1);
        /* eslint-disable-next-line no-unused-expressions */
        expect(colorScale).to.not.be.undefined;
    });

    it('should be creatable from float an array', () => {
        const colorScale = ColorScale.fromArray([0.5, 0.5, 0.5], ColorEncoding.rgb, 3);
        /* eslint-disable-next-line no-unused-expressions */
        expect(colorScale).to.not.be.undefined;
    });


    it('should be creatable from an array with alpha values', () => {
        const colorScale = ColorScale.fromArray([0.5, 0.5, 0.5, 0.2], ColorEncoding.rgba, 1);
        /* eslint-disable-next-line no-unused-expressions */
        expect(colorScale).to.not.be.undefined;
    });

    it('should be creatable from an array with empty arrays', () => {
        const colorScale = ColorScale.fromArray([], ColorEncoding.RGB, 0);
        /* eslint-disable-next-line no-unused-expressions */
        expect(colorScale).to.not.be.undefined;
    });

    it('should be linear interpolate-able with only one color', () => {
        const interpolatedColor = oneColorScale.lerp(1, ColorSpace.rgb);
        /* eslint-disable-next-line no-unused-expressions */
        expect(interpolatedColor).to.not.be.undefined;
        if (interpolatedColor) {
            expect(interpolatedColor.tuple(ColorEncoding.rgb))
                .to.eql(color.tuple(ColorEncoding.rgb));
        }
    });

    it('should be linear interpolate-able', () => {
        const interpolatedColor = defaultColorScale.lerp(-0.1, ColorSpace.rgb);
        /* eslint-disable-next-line no-unused-expressions */
        expect(interpolatedColor).to.not.be.undefined;
        if (interpolatedColor) {
            expect(interpolatedColor.tuple(ColorEncoding.rgb))
                .to.not.eql(
                    color.tuple(ColorEncoding.rgb));
        }
    });

    it('should be linear interpolate-able with nearest', () => {
        defaultColorScale.hint = InterpolationHint.Nearest;
        const interpolatedColor = defaultColorScale.lerp(-0.1, ColorSpace.rgb);
        /* eslint-disable-next-line no-unused-expressions */
        expect(interpolatedColor).to.not.be.undefined;
        if (interpolatedColor) {
            expect(interpolatedColor.tuple(ColorEncoding.rgb))
                .to.not.eql(
                    color.tuple(ColorEncoding.rgb));
        }
    });


    it('should be undefined when calling lerp on ColorScale without colors', () => {
        const interpolatedColor = emptyColorScale.lerp(1, ColorSpace.rgb);
        /* eslint-disable-next-line no-unused-expressions */
        expect(interpolatedColor).to.be.undefined;
    });

    it('should return the colors', () => {
        let color = defaultColorScale.color(0);
        /* eslint-disable-next-line no-unused-expressions */
        expect(color).not.to.be.undefined;

        color = defaultColorScale.color(1);
        /* eslint-disable-next-line no-unused-expressions */
        expect(color).not.to.be.undefined;

        color = defaultColorScale.color(2);
        /* eslint-disable-next-line no-unused-expressions */
        expect(color).not.to.be.undefined;
    });

    it('should return undefined when calling colors on empty ColorScale', () => {
        const color = emptyColorScale.color(0);
        /* eslint-disable-next-line no-unused-expressions */
        expect(color).to.be.undefined;
    });

    it('should return undefined when calling colors on out of range', () => {
        let color = defaultColorScale.color(defaultColorScale.length + 1);
        /* eslint-disable-next-line no-unused-expressions */
        expect(color).to.be.undefined;

        color = defaultColorScale.color(-1);
        /* eslint-disable-next-line no-unused-expressions */
        expect(color).to.be.undefined;
    });

    it('colors should be set and readable', () => {
        const newColors = [new Color(), new Color(), new Color()];
        const colorScale = new ColorScale();
        colorScale.colors = newColors;
        expect(colorScale.colors).to.be.eql(newColors);
    });

    it('colors should be set and readable', () => {
        const colorScale = new ColorScale();
        colorScale.hint = InterpolationHint.Nearest;
        expect(colorScale.hint).to.eq(InterpolationHint.Nearest);

        colorScale.hint = InterpolationHint.Linear;
        expect(colorScale.hint).to.eq(InterpolationHint.Linear);
    });

    it('should be invertible', () => {
        expect(defaultColorScale.inverted).to.be.false;
        defaultColorScale.invert();
        expect(defaultColorScale.inverted).to.be.true;
    });

    it('should be able to turn to UInt8 bits', () => {
        let uint8Array = defaultColorScale.bitsUI8(ColorSpace.rgb);
        expect(uint8Array.length).to.eq(defaultColorScale.length * 3);

        uint8Array = defaultColorScale.bitsUI8(ColorSpace.rgb, true);
        expect(uint8Array.length).to.eq(defaultColorScale.length * 4);

        uint8Array = emptyColorScale.bitsUI8(ColorSpace.rgb);
        expect(uint8Array.length).to.eq(0);
    });

    it('should be able to turn to float32 bits', () => {
        let uint8Array = defaultColorScale.bitsF32(ColorSpace.rgb);
        expect(uint8Array.length).to.eq(defaultColorScale.length * 3);

        uint8Array = defaultColorScale.bitsF32(ColorSpace.rgb, true);
        expect(uint8Array.length).to.eq(defaultColorScale.length * 4);

        uint8Array = emptyColorScale.bitsF32(ColorSpace.rgb);
        expect(uint8Array.length).to.eq(0);
    });


});
