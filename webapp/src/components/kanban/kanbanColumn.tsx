// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {useDrop} from 'react-dnd'

import {Card} from '../../blocks/card'
import './kanbanColumn.scss'

type Props = {
    columnId?: string
    onDrop: (card: Card) => void
    children: React.ReactNode
}

const KanbanColumn = (props: Props) => {
    const [{isOver}, drop] = useDrop(() => ({
        accept: 'card',
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
        drop: (item: Card, monitor) => {
            if (monitor.isOver({shallow: true})) {
                props.onDrop(item)
            }
        },
    }), [props.onDrop])

    let className = 'octo-board-column'
    if (isOver) {
        className += ' dragover'
    }
    return (
        <div
            ref={drop}
            className={className}
            data-kanban-column-id={props.columnId}
        >
            {props.children}
        </div>
    )
}

export default React.memo(KanbanColumn)
