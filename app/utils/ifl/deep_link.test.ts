// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. The locked app refuses deep links to other servers
// (IFL Chat apps plan); app/utils/deep_link/index.ts calls iflAllowsServer.

import {DeepLink} from '@constants';
import DatabaseManager from '@database/manager';
import {handleDeepLink} from '@utils/deep_link';

import type {DeepLinkWithData} from '@typings/launch';

describe('IFL deep links', () => {
    test('a link to another server is refused before anything opens', async () => {
        const searchUrl = jest.spyOn(DatabaseManager, 'searchUrl');
        const link = {type: DeepLink.Channel, url: 'https://other.example.com/team/channels/town-square', data: {serverUrl: 'other.example.com', teamName: 'team', channelName: 'town-square'}} as DeepLinkWithData;
        expect(await handleDeepLink(link)).toEqual({error: true});
        expect(searchUrl).not.toHaveBeenCalled();
    });
});
