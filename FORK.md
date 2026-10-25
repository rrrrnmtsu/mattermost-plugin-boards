# Sakura mobile Boards fork

Base: upstream v9.2.8, commit 6e21d1c0d77c1d8fb00e8c3a36f127320aba175e. Distribution: 9.2.8-sakura.1; plugin ID focalboard is retained.

Mobile changes (up to 768 CSS px):

- Remove the board-title minimum width that pushed the share button outside the viewport.
- Allow header actions to wrap, keep search and filters within the viewport, and retain horizontal scrolling only for the Kanban columns.
- Fit the share dialog and card detail properties to a narrow display; use 16px editing inputs and 44px primary touch targets.
- Disable CSS hover tooltips for coarse touch pointers without changing native click handlers.
- Provide localized native links back to chat (including Mattermost subpaths) and to this corresponding source.

Server permissions, current board/channel membership, public-sharing controls, schema and license behavior are unchanged. Public sharing remains disabled in the Sakura deployment. Source and compiled notices are preserved under the upstream LICENSE.txt and NOTICE.txt; this source-derived fork does not change the upstream licensing terms.

Build on Linux amd64 with a supported Go and Node toolchain:

1. `(cd build && go build -o bin/manifest ./manifest)` then `./build/bin/manifest apply`.
2. `CGO_ENABLED=0 go build -trimpath -o server/dist/plugin-linux-amd64 ./server`.
3. `cd webapp && CYPRESS_INSTALL_BINARY=0 npm ci --ignore-scripts --legacy-peer-deps`.
4. `npm test -- --runInBand --coverage=false src/components/chatReturnLink.test.tsx src/components/viewHeader/viewHeader.test.tsx src/components/cardDialog.test.tsx src/components/shareBoard/shareBoard.test.tsx`.
5. `npm run build`. The missing @swc/core test peer is now explicitly pinned in package.json/lockfile.

Bundle only linux-amd64 and preserve assets, LICENSE.txt, NOTICE.txt and the generated webapp license notices. Deployment archive hashes and browser/device acceptance are recorded separately; browser emulation is not physical iPhone acceptance. The upstream mobile-beta notice is retained.

Editable card/board titles ignore Enter/Escape while Japanese IME composition is active (including keyCode 229). Focused tests cover retaining focus and submitting the following Enter exactly once.

The chat navigation is rendered after the existing version/mobile notices, preserving the original banner stacking and keeping the return link clickable.
