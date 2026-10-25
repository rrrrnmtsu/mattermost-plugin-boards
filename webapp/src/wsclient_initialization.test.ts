// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MMWebSocketClient, WSClient} from './wsclient'

function clientFixture(readyState: number) {
    const socket = {readyState}
    const client = {
        conn: socket as WebSocket,
        sendMessage: jest.fn(),
        addFirstConnectListener: jest.fn(),
        addReconnectListener: jest.fn(),
        addErrorListener: jest.fn(),
        addCloseListener: jest.fn(),
    }
    const ws = new WSClient()
    // A child view can subscribe before the shared core client is attached.
    ws.subscribeToTeam('fixture-team')
    ws.initPlugin('focalboard', '9.2.8-sakura.1', client as MMWebSocketClient)
    return {ws, client, socket}
}

test('flushes a pending team subscription when the core connection is already open', () => {
    const {ws, client} = clientFixture(WebSocket.OPEN)
    ws.open()
    expect(ws.state).toBe('open')
    expect(client.sendMessage).toHaveBeenCalledWith('custom_focalboard_SUBSCRIBE_TEAM', {teamId: 'fixture-team'})
})

test('waits for the first connection when the core socket is still connecting', () => {
    const {ws, client, socket} = clientFixture(WebSocket.CONNECTING)
    ws.open()
    expect(client.sendMessage).not.toHaveBeenCalled()
    socket.readyState = WebSocket.OPEN
    client.addFirstConnectListener.mock.calls[0][0]()
    expect(client.sendMessage).toHaveBeenCalledTimes(1)
    expect(ws.state).toBe('open')
})

test('resubscribes after reconnecting the shared core connection', () => {
    const {ws, client} = clientFixture(WebSocket.OPEN)
    ws.open()
    client.sendMessage.mockClear()
    client.addReconnectListener.mock.calls[0][0]()
    expect(client.sendMessage).toHaveBeenCalledWith('custom_focalboard_SUBSCRIBE_TEAM', {teamId: 'fixture-team'})
})
