import React from 'react'
import {render} from '@testing-library/react'
import {useAppSelector} from '../../../store/hooks'
import {getCurrentBoard} from '../../../store/boards'
import {getClientConfig} from '../../../store/clientConfig'
import {getOnboardingTourCategory, getOnboardingTourStarted, getOnboardingTourStep} from '../../../store/users'
import {Utils} from '../../../utils'
import TourTip from '../../tutorial_tour_tip/tutorial_tour_tip'
import TourTipRenderer from './tourTipRenderer'

jest.mock('../../../store/hooks', () => ({useAppSelector: jest.fn()}))
jest.mock('../../cardDetail/cardDetail', () => ({OnboardingBoardTitle: 'Welcome to Boards!', OnboardingCardTitle: 'Create a new card'}))
jest.mock('../../tutorial_tour_tip/tutorial_tour_tip', () => ({__esModule: true, default: jest.fn(() => null)}))

const props = {requireCard: false, category: 'board', step: 1, screen: <div/>, title: <div/>, punchout: null, classname: 'test', telemetryTag: 'test', placement: 'bottom' as const, hideBackdrop: true}

beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Utils, 'isMobile').mockReturnValue(false)
    Object.defineProperty(window, 'matchMedia', {writable: true, value: jest.fn(() => ({matches: false}))})
    ;(useAppSelector as jest.Mock).mockImplementation(selector => {
        if (selector === getCurrentBoard) return {title: 'Welcome to Boards!'}
        if (selector === getClientConfig) return {featureFlags: {}}
        if (selector === getOnboardingTourStarted) return true
        if (selector === getOnboardingTourCategory) return 'board'
        if (selector === getOnboardingTourStep) return '1'
        return undefined
    })
})
afterEach(() => jest.restoreAllMocks())

test('phone controls are not obscured by desktop tour popovers', () => {
    ;(Utils.isMobile as jest.Mock).mockReturnValue(true)
    render(<TourTipRenderer {...props}/>)
    expect(TourTip).not.toHaveBeenCalled()
})
test('coarse input suppresses anchored tips even with a desktop user agent', () => {
    ;(window.matchMedia as jest.Mock).mockReturnValue({matches: true})
    render(<TourTipRenderer {...props}/>)
    expect(TourTip).not.toHaveBeenCalled()
})
test('desktop guidance remains available', () => {
    render(<TourTipRenderer {...props}/>)
    expect(TourTip).toHaveBeenCalled()
})
