import {mobileTouchOptions} from './mobileTouchOptions'

describe('mobile card gesture policy', () => {
    test('a short movement scrolls before a deliberate long-press drag can begin', () => {
        expect(mobileTouchOptions.delayTouchStart).toBeGreaterThanOrEqual(300)
        expect(mobileTouchOptions.touchSlop).toBeGreaterThanOrEqual(10)
    })
    test('vertical movement remains scrolling even after holding a card', () => {
        for (const direction of [90, 270]) {
            expect(mobileTouchOptions.scrollAngleRanges.some(r => direction > r.start && direction < r.end)).toBe(true)
        }
    })
    test('horizontal long-press dragging and mouse input remain available', () => {
        expect(mobileTouchOptions.scrollAngleRanges.some(r => 0 > r.start && 0 < r.end)).toBe(false)
        expect(mobileTouchOptions.scrollAngleRanges.some(r => 180 > r.start && 180 < r.end)).toBe(false)
        expect(mobileTouchOptions.enableMouseEvents).toBe(true)
    })
})
