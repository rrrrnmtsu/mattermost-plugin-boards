// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import mutator from './mutator'
import {TestBlockFactory} from './test/testBlockFactory'
import 'isomorphic-fetch'
import {FetchMock} from './test/fetchMock'
import {mockDOM} from './testUtils'
import store from './store'
import {updateBoards} from './store/boards'

global.fetch = FetchMock.fn

beforeEach(() => {
    FetchMock.fn.mockReset()
})

beforeAll(() => {
    mockDOM()
})

describe('Mutator', () => {
    test('shows saved column properties without waiting for a WebSocket event', async () => {
        const board = TestBlockFactory.createBoard()
        const oldProperties = board.cardProperties
        const properties = [{id: 'status', name: 'Status', type: 'select' as const, options: [{id: 'new-option', value: 'In progress', color: 'propColorDefault'}]}]
        const saved = {...board, cardProperties: properties, updateAt: board.updateAt + 1}
        FetchMock.fn.mockReturnValueOnce(FetchMock.jsonResponse(JSON.stringify(saved)))
        await mutator.updateBoardCardProperties(board.id, oldProperties, properties)
        expect(store.getState().boards.boards[board.id].cardProperties).toEqual(properties)
        store.dispatch(updateBoards([{...board, updateAt: board.updateAt - 1}]))
        expect(store.getState().boards.boards[board.id].cardProperties).toEqual(properties)
    })
    test.each([403, 200])('does not apply failed or mismatched board responses (HTTP %s)', async (status) => {
        const board = TestBlockFactory.createBoard()
        store.dispatch(updateBoards([board]))
        FetchMock.fn.mockResolvedValueOnce(new Response(JSON.stringify({id: 'another-board'}), {status}))
        await expect(mutator.updateBoardCardProperties(board.id, board.cardProperties, board.cardProperties)).rejects.toThrow()
        expect(store.getState().boards.boards[board.id].cardProperties).toEqual(board.cardProperties)
    })
    test('changePropertyValue', async () => {
        const board = TestBlockFactory.createBoard()
        const card = TestBlockFactory.createCard()
        card.boardId = board.id
        card.fields.properties.property_1 = 'hello'

        await mutator.changePropertyValue(board.id, card, 'property_1', 'hello')

        // No API call should be made as property value DIDN'T CHANGE
        expect(FetchMock.fn).toBeCalledTimes(0)

        await mutator.changePropertyValue(board.id, card, 'property_1', 'hello world')

        // 1 API call should be made as property value DID CHANGE
        expect(FetchMock.fn).toBeCalledTimes(1)
    })

    test('duplicateCard', async () => {
        const board = TestBlockFactory.createBoard()
        const card = TestBlockFactory.createCard(board)

        FetchMock.fn.mockReturnValueOnce(FetchMock.jsonResponse(JSON.stringify([card])))
        const [newBlocks, newCardID] = await mutator.duplicateCard(card.id, board.id)

        expect(newBlocks).toHaveLength(1)

        const duplicatedCard = newBlocks[0]
        expect(duplicatedCard.type).toBe('card')
        expect(duplicatedCard.id).toBe(newCardID)
        expect(duplicatedCard.fields.icon).toBe(card.fields.icon)
        expect(duplicatedCard.fields.contentOrder).toHaveLength(card.fields.contentOrder.length)
        expect(duplicatedCard.boardId).toBe(board.id)
    })
})
