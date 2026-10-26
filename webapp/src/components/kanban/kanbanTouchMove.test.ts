import {canTouchMoveGroup, planTouchMove} from './kanbanTouchMove'
import {TestBlockFactory} from '../../test/testBlockFactory'

const board = TestBlockFactory.createBoard()
const view = TestBlockFactory.createBoardView(board)
const cards = ['a', 'b', 'c', 'd'].map(id => ({...TestBlockFactory.createCard(board), id}))
cards[0].fields.properties.status = 'todo'
cards[1].fields.properties.status = 'todo'
cards[2].fields.properties.status = 'doing'
cards[3].fields.properties.status = 'doing'
const groups = [{option: {id: 'todo', value: 'Todo', color: ''}, cards: cards.slice(0, 2)}, {option: {id: 'doing', value: 'Doing', color: ''}, cards: cards.slice(2)}, {option: {id: '', value: 'None', color: ''}, cards: []}]
beforeEach(() => {view.fields.cardOrder = [];view.fields.sortOptions = []})

test('same-column move preserves unaffected card order', () => {
    const move = planTouchMove('a', {columnId: 'todo', beforeId: null}, cards, groups, view, 'status')
    expect(move.order).toEqual(['b', 'a', 'c', 'd'])
    expect(move.properties.status).toBe('todo')
})
test('cross-column drop inserts before the pointer target and changes status', () => {
    const move = planTouchMove('a', {columnId: 'doing', beforeId: 'd'}, cards, groups, view, 'status')
    expect(move.order).toEqual(['b', 'c', 'a', 'd'])
    expect(move.properties.status).toBe('doing')
})
test('release at the existing position makes no mutation', () => {
    expect(planTouchMove('a', {columnId: 'todo', beforeId: 'b'}, cards, groups, view, 'status').changed).toBe(false)
})
test('hidden order entries survive and empty/unassigned columns remove the group value', () => {
    view.fields.cardOrder = ['hidden', 'a', 'b', 'c', 'd']
    const move = planTouchMove('a', {columnId: '', beforeId: null}, cards, groups, view, 'status')
    expect(move.order).toContain('hidden')
    expect(move.properties).not.toHaveProperty('status')
})
test('automatic sorting is kept and same-column reorder is explicitly rejected', () => {
    view.fields.sortOptions = [{propertyId: 'title', reversed: false}]
    expect(() => planTouchMove('a', {columnId: 'todo', beforeId: null}, cards, groups, view, 'status')).toThrow('sorted-view')
    expect(planTouchMove('a', {columnId: 'doing', beforeId: null}, cards, groups, view, 'status').order).toBeUndefined()
})
test('stale cards and cross-column target mismatches are rejected', () => {
    expect(() => planTouchMove('missing', {columnId: 'todo', beforeId: null}, cards, groups, view, 'status')).toThrow()
    expect(() => planTouchMove('a', {columnId: 'doing', beforeId: 'b'}, cards, groups, view, 'status')).toThrow('stale-target')
})

test('touch moves require a writable grouping property', () => {
    expect(canTouchMoveGroup('select')).toBe(true)
    expect(canTouchMoveGroup('person')).toBe(true)
    expect(canTouchMoveGroup('createdBy')).toBe(false)
    expect(canTouchMoveGroup('updatedBy')).toBe(false)
    expect(canTouchMoveGroup()).toBe(false)
})
