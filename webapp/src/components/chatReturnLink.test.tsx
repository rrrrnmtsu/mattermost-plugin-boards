// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render, screen} from '@testing-library/react'
import {IntlProvider} from 'react-intl'

import ChatReturnLink, {getChatReturnPath} from './chatReturnLink'

describe('chat return navigation', () => {
    test.each([
        ['/boards', '/'],
        ['boards/', '/'],
        ['/chat/boards', '/chat/'],
        ['chat/boards/', '/chat/'],
        ['https://untrusted.example/boards', '/https://untrusted.example/'],
        ['unexpected', '/'],
    ])('keeps return path same-origin for %s', (base, expected) => {
        const path = getChatReturnPath(base)
        expect(path).toBe(expected)
        expect(path).toMatch(/^\/(?!\/)/)
    })

    test('exposes a localized native link back to the chat subpath', () => {
        Object.defineProperty(window, 'frontendBaseURL', {value: '/chat/boards', configurable: true, writable: true})
        render(
            <IntlProvider locale='ja' messages={{'Sakura.back-to-chat': 'チャットへ戻る'}}>
                <ChatReturnLink/>
            </IntlProvider>,
        )
        expect(screen.getByRole('link', {name: 'チャットへ戻る'}).getAttribute('href')).toBe('/chat/')
    })
})
