// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react'
import {IntlProvider} from 'react-intl'
import {DndProvider} from 'react-dnd'
import {HTML5Backend} from 'react-dnd-html5-backend'
import {TouchBackend} from 'react-dnd-touch-backend'

import {History} from 'history'

import {mobileTouchOptions} from './mobileTouchOptions'

import TelemetryClient from './telemetry/telemetryClient'

import {getMessages} from './i18n'
import {FlashMessages} from './components/flashMessages'
import NewVersionBanner from './components/newVersionBanner'
import {Utils} from './utils'
import {fetchMe, getMe} from './store/users'
import {getLanguage, fetchLanguage} from './store/language'
import {useAppSelector, useAppDispatch} from './store/hooks'
import {fetchClientConfig} from './store/clientConfig'
import FocalboardRouter from './router'

import {IUser} from './user'

type Props = {
    history?: History<unknown>
}

const App = (props: Props): JSX.Element => {
    const language = useAppSelector<string>(getLanguage)
    const me = useAppSelector<IUser|null>(getMe)
    const dispatch = useAppDispatch()

    useEffect(() => {
        dispatch(fetchLanguage())
        dispatch(fetchMe())
        dispatch(fetchClientConfig())
    }, [])

    useEffect(() => {
        if (me) {
            TelemetryClient.setUser(me)
        }
    }, [me])

    useEffect(() => {
        const viewport = window.visualViewport
        const updateViewport = () => {
            document.body.style.setProperty('--boards-viewport-height', `${viewport?.height || window.innerHeight}px`)
            document.body.style.setProperty('--boards-viewport-top', `${viewport?.offsetTop || 0}px`)
        }
        updateViewport()
        window.addEventListener('resize', updateViewport)
        viewport?.addEventListener('resize', updateViewport)
        viewport?.addEventListener('scroll', updateViewport)
        return () => {
            window.removeEventListener('resize', updateViewport)
            viewport?.removeEventListener('resize', updateViewport)
            viewport?.removeEventListener('scroll', updateViewport)
            document.body.style.removeProperty('--boards-viewport-height')
            document.body.style.removeProperty('--boards-viewport-top')
        }
    }, [])

    return (
        <IntlProvider
            locale={language.split(/[_]/)[0]}
            messages={getMessages(language)}
        >
            <DndProvider backend={Utils.isMobile() ? TouchBackend : HTML5Backend} options={Utils.isMobile() ? mobileTouchOptions : undefined}>
                <FlashMessages milliseconds={2000}/>
                <div id='frame'>
                    <div id='main'>
                        <NewVersionBanner/>
                        <FocalboardRouter history={props.history}/>
                    </div>
                </div>
            </DndProvider>
        </IntlProvider>
    )
}

export default React.memo(App)
