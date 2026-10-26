// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BoardGroup} from '../../blocks/board'
import {Card} from '../../blocks/card'
import {BoardView} from '../../blocks/boardView'

import {TouchDestination} from './kanbanTouch'

// Computed people fields cannot be changed by moving a card.
export const canTouchMoveGroup = (type?: string) => type === 'select' || type === 'person'

export function planTouchMove(cardId: string, target: TouchDestination, cards: Card[], groups: BoardGroup[], view: BoardView, propertyId: string) {
    const card = cards.find(value => value.id === cardId && !value.deleteAt && !value.limited)
    const group = groups.find(value => (value.option.id || '') === target.columnId)
    if (!card || !group || card.boardId !== view.boardId) throw new Error('stale-card')
    const oldColumn = card.fields.properties[propertyId] || ''
    const propertyChanged = oldColumn !== target.columnId
    if (view.fields.sortOptions.length && !propertyChanged) throw new Error('sorted-view')
    const properties = {...card.fields.properties}
    if (target.columnId) properties[propertyId] = target.columnId
    else delete properties[propertyId]
    if (view.fields.sortOptions.length) return {card, properties, order: undefined, changed: propertyChanged}
    const baseline = Array.from(new Set([...view.fields.cardOrder, ...cards.map(value => value.id)]))
    const order = baseline.filter(id => id !== cardId)
    const siblings = group.cards.filter(value => value.id !== cardId)
    if (target.beforeId && !siblings.some(value => value.id === target.beforeId)) throw new Error('stale-target')
    const last = siblings[siblings.length - 1]
    const index = target.beforeId ? order.indexOf(target.beforeId) : (last ? order.indexOf(last.id) + 1 : order.length)
    if (index < 0) throw new Error('stale-target')
    order.splice(index, 0, cardId)
    const orderChanged = order.some((id, index) => id !== baseline[index])
    return {card, properties, order: orderChanged ? order : undefined, changed: propertyChanged || orderChanged}
}
