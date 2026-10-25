// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react'

import Editable from './editable'

describe('Japanese IME edit confirmation', () => {
    test('keeps composition confirmation in the editor and saves the following Enter once', () => {
        const save = jest.fn()
        render(<Editable value='変換中' onChange={jest.fn()} onSave={save}/> )
        const input = screen.getByRole('textbox')
        input.focus()
        fireEvent.keyDown(input, {key: 'Enter', keyCode: 13, isComposing: true})
        fireEvent.keyDown(input, {key: 'Enter', keyCode: 229})
        expect(save).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(input)
        fireEvent.keyDown(input, {key: 'Enter', keyCode: 13})
        expect(save).toHaveBeenCalledTimes(1)
        expect(save).toHaveBeenCalledWith('onEnter')
    })

    test('does not cancel the card title while an IME candidate is being cancelled', () => {
        const cancel = jest.fn()
        render(<Editable value='変換中' onChange={jest.fn()} onCancel={cancel}/> )
        const input = screen.getByRole('textbox')
        fireEvent.keyDown(input, {key: 'Escape', keyCode: 27, isComposing: true})
        expect(cancel).not.toHaveBeenCalled()
        fireEvent.keyDown(input, {key: 'Escape', keyCode: 27})
        expect(cancel).toHaveBeenCalledTimes(1)
    })
})
