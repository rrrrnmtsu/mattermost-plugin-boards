import '@testing-library/jest-dom'
import {edgeSpeed, installKanbanTouch, touchHoldMs} from './kanbanTouch'

const rect = (left: number, top: number, width: number, height: number) => ({left, top, right: left + width, bottom: top + height, x: left, y: top, width, height, toJSON: () => null})
const send = (node: EventTarget, type: string, x = 100, y = 150, count = 1) => {
    const event = new Event(type, {bubbles: true, cancelable: true})
    Object.defineProperty(event, 'touches', {value: type === 'touchend' ? [] : Array.from({length: count}, (_, i) => ({identifier: i, clientX: x, clientY: y}))})
    node.dispatchEvent(event)
    return event
}
let root: HTMLElement
let viewport: HTMLElement
let card: HTMLElement
let cleanup: () => void
let commit: jest.Mock
let changed: jest.Mock
let notice: jest.Mock
beforeEach(() => {
    jest.useFakeTimers()
    Object.defineProperties(window, {innerWidth: {configurable: true, value: 390}, innerHeight: {configurable: true, value: 800}})
    document.body.innerHTML = '<div class="BoardComponent"><div class="Kanban"><div class="octo-board-column" data-kanban-column-id="a"><div class="KanbanCard" data-kanban-card-id="one">One</div><div class="KanbanCard" data-kanban-card-id="two">Two</div></div><div class="octo-board-column" data-kanban-column-id="b"></div></div></div>'
    root = document.querySelector('.Kanban') as HTMLElement
    viewport = document.querySelector('.BoardComponent') as HTMLElement
    card = document.querySelector('[data-kanban-card-id="one"]') as HTMLElement
    viewport.getBoundingClientRect = () => rect(0, 0, 390, 800)
    root.getBoundingClientRect = () => rect(0, 0, 390, 1600)
    card.getBoundingClientRect = () => rect(0, 100, 260, 80)
    const second = document.querySelector('[data-kanban-card-id="two"]') as HTMLElement
    second.getBoundingClientRect = () => rect(0, 200, 260, 80)
    const columns = root.querySelectorAll<HTMLElement>('.octo-board-column')
    columns[0].getBoundingClientRect = () => rect(-root.scrollLeft, 100 - viewport.scrollTop, 260, 1500)
    columns[1].getBoundingClientRect = () => rect(275 - root.scrollLeft, 100 - viewport.scrollTop, 260, 1500)
    Object.defineProperties(root, {scrollWidth: {value: 1100}, clientWidth: {value: 390}})
    Object.defineProperties(viewport, {scrollHeight: {value: 2400}, clientHeight: {value: 800}})
    commit = jest.fn().mockResolvedValue(true)
    changed = jest.fn()
    notice = jest.fn()
    cleanup = installKanbanTouch(root, viewport, {canStart: () => true, commit, changed, notice})
})
afterEach(() => {cleanup();jest.useRealTimers();document.body.innerHTML = ''})

test('short tap leaves normal click and server state alone', () => {
    send(card, 'touchstart');jest.advanceTimersByTime(100);const end = send(card, 'touchend')
    const click = new MouseEvent('click', {bubbles: true, cancelable: true});card.dispatchEvent(click)
    expect(end.defaultPrevented).toBe(false)
    expect(click.defaultPrevented).toBe(false)
    expect(commit).not.toHaveBeenCalled()
    expect(document.body).not.toHaveClass('boards-card-dragging')
})
test('quick movement remains native scrolling and cancels long press', () => {
    send(card, 'touchstart');jest.advanceTimersByTime(100)
    const move = send(card, 'touchmove', 100, 190)
    jest.advanceTimersByTime(touchHoldMs + 10)
    expect(move.defaultPrevented).toBe(false)
    expect(commit).not.toHaveBeenCalled()
    expect(card.hasAttribute('data-touch-dragging')).toBe(false)
})
test('long press owns vertical movement and saves the selected insertion once', async () => {
    send(card, 'touchstart');jest.advanceTimersByTime(touchHoldMs + 1)
    expect(card.dataset.touchDragging).toBe('true')
    expect(send(card, 'touchmove', 100, 310).defaultPrevented).toBe(true)
    send(card, 'touchend', 100, 310)
    await Promise.resolve();await Promise.resolve();await Promise.resolve()
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('one', {columnId: 'a', beforeId: null})
    expect(notice).toHaveBeenCalledWith('saved')
})
test('a held drag crosses columns and suppresses the synthesized card click', async () => {
    send(card, 'touchstart');jest.advanceTimersByTime(touchHoldMs + 1)
    send(card, 'touchmove', 320, 320);send(card, 'touchend', 320, 320)
    const click = new MouseEvent('click', {bubbles: true, cancelable: true});card.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    await Promise.resolve()
    expect(commit).toHaveBeenCalledWith('one', {columnId: 'b', beforeId: null})
})
test('edge hold scrolls both real scroll owners, and cancellation stops it', () => {
    send(card, 'touchstart');jest.advanceTimersByTime(touchHoldMs + 1)
    expect(root.scrollLeft).toBe(0)
    send(card, 'touchmove', 385, 790);jest.advanceTimersByTime(150)
    expect(root.scrollLeft).toBeGreaterThan(0)
    expect(viewport.scrollTop).toBeGreaterThan(0)
    send(card, 'touchcancel');const left = root.scrollLeft;const top = viewport.scrollTop
    jest.advanceTimersByTime(100)
    expect(root.scrollLeft).toBe(left)
    expect(viewport.scrollTop).toBe(top)
    expect(commit).not.toHaveBeenCalled()
})
test('a second finger outside the board cancels without a drop', () => {
    send(card, 'touchstart');jest.advanceTimersByTime(touchHoldMs + 1)
    send(document.body, 'touchstart', 300, 300, 2)
    send(document.body, 'touchend', 300, 300)
    expect(commit).not.toHaveBeenCalled()
    expect(document.body).not.toHaveClass('boards-card-dragging')
})
test('failed save clears drag markers and announces failure', async () => {
    commit.mockRejectedValue(new Error('HTTP 403'))
    send(card, 'touchstart');jest.advanceTimersByTime(touchHoldMs + 1)
    send(card, 'touchmove', 320, 320);send(card, 'touchend', 320, 320)
    await Promise.resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve()
    expect(notice).toHaveBeenCalledWith('failed')
    expect(card.hasAttribute('data-touch-dragging')).toBe(false)
})
test('nested interactive controls never start dragging', () => {
    const button = document.createElement('button');card.appendChild(button)
    send(button, 'touchstart');jest.advanceTimersByTime(touchHoldMs + 20)
    expect(document.body).not.toHaveClass('boards-card-dragging')
})
test('unmount and escape cancel pending work without saving', () => {
    send(card, 'touchstart');jest.advanceTimersByTime(touchHoldMs + 1)
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))
    expect(commit).not.toHaveBeenCalled()
    send(card, 'touchstart');cleanup();jest.advanceTimersByTime(1000)
    expect(card.hasAttribute('data-touch-dragging')).toBe(false)
})
test('edge velocity is bounded and points toward the visible edge', () => {
    expect(edgeSpeed(200, 0, 390)).toBe(0)
    expect(edgeSpeed(1, 0, 390)).toBeLessThan(0)
    expect(edgeSpeed(389, 0, 390)).toBeGreaterThan(0)
    expect(Math.abs(edgeSpeed(0, 0, 390))).toBeLessThanOrEqual(16)
    expect(edgeSpeed(-1, 0, 390)).toBe(0)
})
