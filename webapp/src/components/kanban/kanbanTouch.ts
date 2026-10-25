// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Utils} from '../../utils'

export type TouchDestination = {columnId: string, beforeId: string | null}
export type TouchDragFrame = {
    phase: 'dragging' | 'saving'
    cardId: string
    x: number
    y: number
    width: number
    target: TouchDestination | null
    indicator?: {left: number, top: number, width: number}
}

export const touchHoldMs = 400
export const touchTolerance = 9
export const isTouchCardInput = () => Boolean(window.matchMedia?.('(pointer: coarse)').matches || Utils.isMobile())

export function edgeSpeed(position: number, start: number, end: number): number {
    const band = Math.min(64, (end - start) / 3)
    if (position < start || position > end || band <= 0) {
        return 0
    }
    if (position < start + band) {
        return -Math.ceil(16 * (1 - ((position - start) / band)))
    }
    if (position > end - band) {
        return Math.ceil(16 * (1 - ((end - position) / band)))
    }
    return 0
}

type Callbacks = {
    canStart: (cardId: string) => boolean
    changed: (frame: TouchDragFrame | null) => void
    commit: (cardId: string, target: TouchDestination) => Promise<boolean>
    notice: (kind: 'saved' | 'failed' | 'sorted') => void
}

// Own the card gesture without relying on private React DnD backend internals.
// Register a non-passive move listener before touches start, including on iOS.
export function installKanbanTouch(root: HTMLElement, viewport: HTMLElement, callbacks: Callbacks): () => void {
    let pending: {id: number, cardId: string, element: HTMLElement, x: number, y: number} | null = null
    let frame: TouchDragFrame | null = null
    let hold: ReturnType<typeof setTimeout> | undefined
    let animation = 0
    let disposed = false
    let saving = false
    let moved = false
    let suppressClickUntil = 0
    let pointer = {x: 0, y: 0}
    let grab = {x: 0, y: 0}
    let highlighted: HTMLElement[] = []
    let source: HTMLElement | null = null

    const clearMarkers = () => {
        source?.removeAttribute('data-touch-dragging')
        source = null
        highlighted.forEach(element => element.removeAttribute('data-touch-drop'))
        highlighted = []
        document.body.classList.remove('boards-card-dragging')
    }

    const stop = () => {
        if (hold) clearTimeout(hold)
        hold = undefined
        cancelAnimationFrame(animation)
        animation = 0
        pending = null
        frame = null
        moved = false
        clearMarkers()
        if (!disposed) callbacks.changed(null)
    }

    const destination = (cardId: string): {target: TouchDestination | null, indicator?: TouchDragFrame['indicator']} => {
        const area = viewport.getBoundingClientRect()
        if (pointer.x < area.left || pointer.x > area.right || pointer.y < Math.max(0, area.top) || pointer.y > Math.min(window.innerHeight, area.bottom)) {
            return {target: null}
        }
        const columns = Array.from(root.querySelectorAll<HTMLElement>('.octo-board-column[data-kanban-column-id]'))
        const column = columns.find(element => {const r = element.getBoundingClientRect(); return pointer.x >= r.left && pointer.x <= r.right}) || columns.find(element => {const r = element.getBoundingClientRect(); return Math.min(Math.abs(pointer.x - r.left), Math.abs(pointer.x - r.right)) <= 12})
        if (!column) return {target: null}
        const cards = Array.from(column.querySelectorAll<HTMLElement>('.KanbanCard[data-kanban-card-id]')).filter(element => element.dataset.kanbanCardId !== cardId)
        const before = cards.find(element => {const r = element.getBoundingClientRect(); return pointer.y < r.top + r.height / 2})
        const rect = column.getBoundingClientRect()
        const lineTop = before ? before.getBoundingClientRect().top - 5 : (cards.length ? cards[cards.length - 1].getBoundingClientRect().bottom + 5 : rect.top + 5)
        const left = Math.max(rect.left, area.left)
        const width = Math.min(rect.right, area.right) - left
        const indicator = lineTop >= area.top && lineTop <= area.bottom && width > 0 ? {left, top: lineTop, width} : undefined
        return {target: {columnId: column.dataset.kanbanColumnId || '', beforeId: before?.dataset.kanbanCardId || null}, indicator}
    }

    const draw = () => {
        if (!frame || frame.phase !== 'dragging') return
        const next = destination(frame.cardId)
        highlighted.forEach(element => element.removeAttribute('data-touch-drop'))
        highlighted = []
        if (next.target) {
            highlighted = Array.from(root.querySelectorAll<HTMLElement>('[data-kanban-column-id]')).filter(element => element.dataset.kanbanColumnId === next.target?.columnId)
            highlighted.forEach(element => element.setAttribute('data-touch-drop', 'true'))
        }
        frame = {...frame, x: pointer.x - grab.x, y: pointer.y - grab.y - 8, ...next}
        callbacks.changed(frame)
    }

    const tick = () => {
        if (!frame || frame.phase !== 'dragging' || disposed) return
        const area = viewport.getBoundingClientRect()
        const speedX = moved ? edgeSpeed(pointer.x, Math.max(0, area.left), Math.min(window.innerWidth, area.right)) : 0
        const speedY = moved ? edgeSpeed(pointer.y, Math.max(0, area.top), Math.min(window.innerHeight, area.bottom)) : 0
        const lastColumn = Array.from(root.querySelectorAll<HTMLElement>('.octo-board-column[data-kanban-column-id]')).pop()
        const lastRight = lastColumn ? lastColumn.getBoundingClientRect().right - root.getBoundingClientRect().left + root.scrollLeft : root.scrollWidth
        root.scrollLeft = Math.max(0, Math.min(Math.max(0, lastRight - root.clientWidth + 12), root.scrollLeft + speedX))
        viewport.scrollTop = Math.max(0, Math.min(viewport.scrollHeight - viewport.clientHeight, viewport.scrollTop + speedY))
        draw()
        animation = requestAnimationFrame(tick)
    }

    const start = (event: TouchEvent) => {
        if (saving || event.touches.length !== 1) {
            if (!saving) stop()
            return
        }
        const target = event.target as HTMLElement
        if (!target.closest || target.closest('button,a,input,textarea,select,[contenteditable="true"],.MenuWrapper,[role="button"]')) return
        const element = target.closest<HTMLElement>('.KanbanCard[data-kanban-card-id]')
        const cardId = element?.dataset.kanbanCardId
        if (!element || !cardId || !root.contains(element) || !callbacks.canStart(cardId)) return
        stop()
        suppressClickUntil = 0
        const touch = event.touches[0]
        pointer = {x: touch.clientX, y: touch.clientY}
        pending = {id: touch.identifier, cardId, element, ...pointer}
        hold = setTimeout(() => {
            if (!pending || !pending.element.isConnected || !callbacks.canStart(pending.cardId)) return
            const rect = pending.element.getBoundingClientRect()
            grab = {x: pending.x - rect.left, y: pending.y - rect.top}
            source = pending.element
            source.setAttribute('data-touch-dragging', 'true')
            document.body.classList.add('boards-card-dragging')
            window.getSelection()?.removeAllRanges()
            frame = {phase: 'dragging', cardId: pending.cardId, x: rect.left, y: rect.top - 8, width: Math.min(rect.width, window.innerWidth - 24), target: null}
            draw()
            animation = requestAnimationFrame(tick)
        }, touchHoldMs)
    }

    const move = (event: TouchEvent) => {
        if (!pending || saving) return
        if (event.touches.length !== 1) {stop(); return}
        const touch = Array.from(event.touches).find(value => value.identifier === pending?.id)
        if (!touch) {stop(); return}
        pointer = {x: touch.clientX, y: touch.clientY}
        if (!frame) {
            if (Math.hypot(pointer.x - pending.x, pointer.y - pending.y) > touchTolerance) stop()
            return
        }
        moved = moved || Math.hypot(pointer.x - pending.x, pointer.y - pending.y) > touchTolerance
        if (event.cancelable) event.preventDefault()
        draw()
    }

    const end = (event: TouchEvent) => {
        if (!pending || saving) return
        if (!frame || event.touches.length) {stop(); return}
        if (event.cancelable) event.preventDefault()
        suppressClickUntil = Date.now() + 450
        draw()
        const cardId = frame.cardId
        const target = frame.target
        if (!target) {stop(); return}
        cancelAnimationFrame(animation)
        saving = true
        frame = {...frame, phase: 'saving'}
        callbacks.changed(frame)
        document.body.classList.remove('boards-card-dragging')
        callbacks.commit(cardId, target).then(changed => {
            if (!disposed && changed) callbacks.notice('saved')
        }).catch(error => {
            if (!disposed) callbacks.notice(error?.message === 'sorted-view' ? 'sorted' : 'failed')
        }).finally(() => {
            saving = false
            if (!disposed) stop()
        })
    }

    const cancel = () => {if (!saving) {if (frame) suppressClickUntil = Date.now() + 450; stop()}}
    const multiple = (event: TouchEvent) => {if (event.touches.length > 1) cancel()}
    const visibility = () => {if (document.hidden) cancel()}
    const key = (event: KeyboardEvent) => {if (event.key === 'Escape') cancel()}
    const click = (event: MouseEvent) => {
        const target = event.target as HTMLElement
        if (Date.now() < suppressClickUntil && target.closest?.('.KanbanCard')) {
            event.preventDefault()
            event.stopImmediatePropagation()
        }
    }
    const context = (event: Event) => {if (pending) event.preventDefault()}
    root.addEventListener('touchstart', start, {passive: true})
    document.addEventListener('touchstart', multiple, {passive: true})
    document.addEventListener('visibilitychange', visibility)
    document.addEventListener('touchmove', move, {passive: false})
    document.addEventListener('touchend', end, {passive: false})
    document.addEventListener('touchcancel', cancel)
    document.addEventListener('click', click, true)
    document.addEventListener('keydown', key)
    root.addEventListener('contextmenu', context)
    window.addEventListener('blur', cancel)
    window.addEventListener('pagehide', cancel)
    window.addEventListener('resize', cancel)
    return () => {
        disposed = true
        stop()
        root.removeEventListener('touchstart', start)
        document.removeEventListener('touchstart', multiple)
        document.removeEventListener('visibilitychange', visibility)
        document.removeEventListener('touchmove', move)
        document.removeEventListener('touchend', end)
        document.removeEventListener('touchcancel', cancel)
        document.removeEventListener('click', click, true)
        document.removeEventListener('keydown', key)
        root.removeEventListener('contextmenu', context)
        window.removeEventListener('blur', cancel)
        window.removeEventListener('pagehide', cancel)
        window.removeEventListener('resize', cancel)
    }
}
