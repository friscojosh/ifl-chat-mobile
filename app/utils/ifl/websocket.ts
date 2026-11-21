// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. IFL Chat's WebSocket events; called after upstream's
// switch in app/actions/websocket/event.ts.

import {IFL_TEAM_BADGES_EVENT, refreshTeamBadges} from './team_badges';

export function handleIflEvents(serverUrl: string, msg: {event: string}): Promise<void> | undefined {
    if (msg.event === IFL_TEAM_BADGES_EVENT) {
        return refreshTeamBadges(serverUrl);
    }
    return undefined;
}
