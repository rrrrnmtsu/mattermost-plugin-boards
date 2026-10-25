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


test('Enter suppresses the following deferred blur save and permits the next edit', () => {
    const onSave = jest.fn()
    const {getByRole} = render(<Editable value='Edited title' onChange={jest.fn()} onSave={onSave}/>)
    const input = getByRole('textbox') as HTMLInputElement
    input.focus()
    const blur = jest.spyOn(input, 'blur').mockImplementation(() => undefined)
    fireEvent.keyDown(input, {key: 'Enter', keyCode: 13})
    expect(onSave).toHaveBeenCalledTimes(1)
    fireEvent.blur(input)
    expect(onSave).toHaveBeenCalledTimes(1)
    fireEvent.focus(input)
    fireEvent.blur(input)
    expect(onSave).toHaveBeenCalledTimes(2)
    blur.mockRestore()
})
