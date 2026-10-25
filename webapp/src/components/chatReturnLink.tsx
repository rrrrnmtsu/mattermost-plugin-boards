// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {FormattedMessage} from 'react-intl'

import {Utils} from '../utils'

export function getChatReturnPath(frontendBaseURL: string): string {
    const path = '/' + frontendBaseURL.replace(/^\/+|\/+$/g, '')
    return path.endsWith('/boards') ? path.slice(0, -7) + '/' : '/'
}

export default function ChatReturnLink(): JSX.Element {
    return (
        <nav className='chatNavigation'>
            <a href={getChatReturnPath(Utils.getFrontendBaseURL())}>
                <FormattedMessage
                    id='Sakura.back-to-chat'
                    defaultMessage='Back to chat'
                />
            </a>
            <a
                className='sourceLink'
                href='https://github.com/rrrrnmtsu/mattermost-plugin-boards/tree/codex/mobile-ux-v9.2.8'
                target='_blank'
                rel='noopener noreferrer'
            >
                <FormattedMessage
                    id='Sakura.source-code'
                    defaultMessage='Source code'
                />
            </a>
        </nav>
    )
}
