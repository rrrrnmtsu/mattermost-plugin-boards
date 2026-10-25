// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import React, {useContext, useLayoutEffect, useState} from 'react'
import {createPortal} from 'react-dom'

export const MenuPortalContext = React.createContext<Set<HTMLElement> | null>(null)

const touchLayoutQuery = '(max-width: 768px), (max-width: 1024px) and (pointer: coarse)'

// A body-level portal escapes momentum scrolling and transformed stacking contexts.
// Ownership stays with MenuWrapper so outside-click handling accepts portal events.
const TouchMenuPortal = ({children}: {children: React.ReactNode}): JSX.Element | null => {
    const owners = useContext(MenuPortalContext)
    const [touchLayout, setTouchLayout] = useState(() => Boolean(window.matchMedia?.(touchLayoutQuery).matches))
    const [host, setHost] = useState<HTMLElement | null>(null)

    useLayoutEffect(() => {
        const media = window.matchMedia?.(touchLayoutQuery)
        const changed = () => setTouchLayout(Boolean(media?.matches))
        media?.addEventListener?.('change', changed)
        return () => media?.removeEventListener?.('change', changed)
    }, [])

    useLayoutEffect(() => {
        if (!touchLayout) {
            setHost(null)
            return undefined
        }
        const element = document.createElement('div')
        element.className = 'boards-menu-portal'
        element.setAttribute('data-boards-touch-menu', 'true')
        document.body.appendChild(element)
        owners?.add(element)
        setHost(element)
        return () => {
            owners?.delete(element)
            element.remove()
        }
    }, [touchLayout, owners])

    if (!touchLayout) {
        return <>{children}</>
    }
    return host ? createPortal(children, host) : null
}

export default TouchMenuPortal
