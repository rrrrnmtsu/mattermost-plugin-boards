import 'isomorphic-fetch'
import mutator from './mutator'
import octoClient from './octoClient'
import undoManager from './undomanager'
import {TestBlockFactory} from './test/testBlockFactory'
import store from './store'
import {updateCards} from './store/cards'
import {updateViews} from './store/views'

beforeEach(async () => {await undoManager.clear()})
afterEach(() => jest.restoreAllMocks())

test('card status and view order use one board-scoped batch, and undo reverses both', async () => {
    const board = TestBlockFactory.createBoard()
    const card = TestBlockFactory.createCard(board)
    const view = TestBlockFactory.createBoardView(board)
    card.fields.properties.status = 'todo'
    const call = jest.spyOn(octoClient, 'patchBoardBlocks').mockResolvedValue(new Response('{}', {status: 200}))
    await mutator.moveKanbanCard(card, view, {status: 'doing'}, [card.id])
    expect(call).toHaveBeenCalledTimes(1)
    expect(call.mock.calls[0][0]).toBe(board.id)
    expect(call.mock.calls[0][1].map(block => block.id)).toEqual([card.id, view.id])
    expect(call.mock.calls[0][2][0].updatedFields?.properties).toEqual({status: 'doing'})
    expect(store.getState().cards.cards[card.id].fields.properties.status).toBe('doing')
    await undoManager.undo()
    expect(call).toHaveBeenCalledTimes(2)
    expect(store.getState().cards.cards[card.id].fields.properties.status).toBe('todo')
})
test('denied and server-error responses neither change local state nor register undo', async () => {
    const board = TestBlockFactory.createBoard()
    const card = TestBlockFactory.createCard(board)
    const view = TestBlockFactory.createBoardView(board)
    card.fields.properties.status = 'todo'
    store.dispatch(updateCards([card]));store.dispatch(updateViews([view]))
    const call = jest.spyOn(octoClient, 'patchBoardBlocks')
    for (const status of [403, 500]) {
        call.mockResolvedValueOnce(new Response('{}', {status}))
        await expect(mutator.moveKanbanCard(card, view, {status: 'doing'}, [card.id])).rejects.toThrow()
        expect(store.getState().cards.cards[card.id].fields.properties.status).toBe('todo')
        expect(undoManager.canUndo).toBe(false)
    }
})
test('a card and view from different boards are rejected before HTTP', async () => {
    const card = TestBlockFactory.createCard(TestBlockFactory.createBoard())
    const view = TestBlockFactory.createBoardView(TestBlockFactory.createBoard())
    view.boardId = 'another-board'
    const call = jest.spyOn(octoClient, 'patchBoardBlocks')
    await expect(mutator.moveKanbanCard(card, view, {}, [])).rejects.toThrow('Invalid move scope')
    expect(call).not.toHaveBeenCalled()
})

test('the move batch uses the authenticated board route, not the obsolete team route', async () => {
    const board = TestBlockFactory.createBoard()
    const card = TestBlockFactory.createCard(board)
    const view = TestBlockFactory.createBoardView(board)
    const call = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', {status: 200}))
    await octoClient.patchBoardBlocks(board.id, [card, view], [{updatedFields: {properties: {status: 'doing'}}}, {updatedFields: {cardOrder: [card.id]}}])
    expect(String(call.mock.calls[0][0])).toContain('/api/v2/boards/' + board.id + '/blocks')
    expect(call.mock.calls[0][1]?.method).toBe('PATCH')
    expect(JSON.parse(String(call.mock.calls[0][1]?.body)).block_ids).toEqual([card.id, view.id])
})
test('invalid cross-board batches never reach fetch', async () => {
    const card = TestBlockFactory.createCard(TestBlockFactory.createBoard())
    const call = jest.spyOn(global, 'fetch')
    await expect(octoClient.patchBoardBlocks('another-board', [card], [{}])).rejects.toThrow('Invalid card move batch')
    expect(call).not.toHaveBeenCalled()
})
