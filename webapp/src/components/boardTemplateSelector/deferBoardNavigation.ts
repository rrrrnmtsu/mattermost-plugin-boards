// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Keep the first board hidden until its channel link is saved. Later redo uses
// the original navigation callback after the initial creation has completed.
export function deferBoardNavigation(navigate: (id: string) => Promise<void>) {
    let ready = false
    return {
        afterRedo: async (id: string): Promise<void> => {
            if (ready) {
                await navigate(id)
            }
        },
        reveal: async (id: string): Promise<void> => {
            ready = true
            await navigate(id)
        },
    }
}
