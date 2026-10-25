// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {IntlShape} from 'react-intl'

import {Board, BoardGroup, IPropertyTemplate} from '../../blocks/board'
import {BoardView} from '../../blocks/boardView'
import {Card} from '../../blocks/card'
import {Permission} from '../../constants'
import {useHasCurrentBoardPermissions} from '../../hooks/permissions'
import mutator from '../../mutator'

import {installKanbanTouch, isTouchCardInput, TouchDragFrame} from './kanbanTouch'
import {planTouchMove} from './kanbanTouchMove'

type Props = {board: Board, activeView: BoardView, cards: Card[], visibleGroups: BoardGroup[], groupByProperty?: IPropertyTemplate, readonly: boolean, intl: IntlShape}

export default function KanbanTouchDrag(props: Props): JSX.Element {
    const anchor = useRef<HTMLSpanElement>(null)
    const latest = useRef(props)
    latest.current = props
    const [frame, setFrame] = useState<TouchDragFrame | null>(null)
    const [notice, setNotice] = useState<'saved' | 'failed' | 'sorted' | null>(null)
    const canEdit = useHasCurrentBoardPermissions([Permission.ManageBoardCards])
    const enabled = isTouchCardInput() && canEdit && !props.readonly && Boolean(props.groupByProperty)
    const scope = props.board.id + ':' + props.activeView.id + ':' + props.groupByProperty?.id

    useEffect(() => {
        const root = anchor.current?.parentElement
        const viewport = root?.closest<HTMLElement>('.BoardComponent')
        if (!enabled || !root || !viewport) return undefined
        return installKanbanTouch(root, viewport, {
            canStart: cardId => latest.current.cards.some(card => card.id === cardId && !card.limited && !card.deleteAt),
            changed: setFrame,
            notice: setNotice,
            commit: async (cardId, target) => {
                const current = latest.current
                if (current.board.id + ':' + current.activeView.id + ':' + current.groupByProperty?.id !== scope || current.readonly || !current.groupByProperty) throw new Error('stale-view')
                const move = planTouchMove(cardId, target, current.cards, current.visibleGroups, current.activeView, current.groupByProperty.id)
                if (!move.changed) return false
                await mutator.moveKanbanCard(move.card, current.activeView, move.properties, move.order)
                return true
            },
        })
    }, [enabled, scope])

    useEffect(() => {
        if (!notice) return undefined
        const timer = setTimeout(() => setNotice(null), 4000)
        return () => clearTimeout(timer)
    }, [notice])

    const card = frame ? props.cards.find(value => value.id === frame.cardId) : undefined
    const column = frame?.target ? props.visibleGroups.find(value => (value.option.id || '') === frame.target?.columnId)?.option.value : undefined
    const messages = {
        saved: props.intl.formatMessage({id: 'KanbanTouch.saved', defaultMessage: 'Card moved'}),
        failed: props.intl.formatMessage({id: 'KanbanTouch.failed', defaultMessage: 'Could not confirm the move. Please check the card status.'}),
        sorted: props.intl.formatMessage({id: 'KanbanTouch.sorted', defaultMessage: 'Use manual sorting to reorder cards within a column.'}),
    }
    return <>
        <span ref={anchor} hidden={true} data-kanban-touch-anchor={true}/>
        {frame && card && createPortal(<div className='kanban-touch-overlay' data-phase={frame.phase}>
            {frame.indicator && <div className='kanban-touch-insertion' style={{left: frame.indicator.left, top: frame.indicator.top, width: frame.indicator.width}}/>}
            <div className='kanban-touch-preview' style={{width: frame.width, transform: `translate3d(${Math.max(12, Math.min(window.innerWidth - frame.width - 12, frame.x))}px, ${Math.max(8, Math.min(window.innerHeight - 96, frame.y))}px, 0)`}}>
                <strong>{card.title}</strong>
                <span role='status'>{frame.phase === 'saving' ? props.intl.formatMessage({id: 'KanbanTouch.saving', defaultMessage: 'Saving move…'}) : props.intl.formatMessage({id: 'KanbanTouch.moving', defaultMessage: 'Moving — {column}'}, {column: column || props.intl.formatMessage({id: 'KanbanTouch.choose', defaultMessage: 'Choose a column'})})}</span>
            </div>
        </div>, document.body)}
        {notice && createPortal(<div className={'kanban-touch-notice ' + notice} role={notice === 'failed' ? 'alert' : 'status'}>{messages[notice]}</div>, document.body)}
    </>
}
