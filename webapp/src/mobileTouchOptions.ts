// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Moving before the delay cancels drag activation, preserving native scrolling.
export const mobileTouchOptions = {
    delayTouchStart: 350,
    touchSlop: 12,
    enableMouseEvents: true,
    scrollAngleRanges: [{start: 45, end: 135}, {start: 225, end: 315}],
}
