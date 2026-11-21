// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. The locked server (IFL Chat apps plan).

import {IFL_LOCK_SERVER, IFL_TEAM_CHIPS, IFL_TEAM_CHIP_STYLE, iflAllowsServer} from './config';

const HOME = 'https://chat.iflgm.com';

describe('iflAllowsServer', () => {
    test('any server when the app is not locked (upstream behaviour)', () => {
        expect(iflAllowsServer('https://other.example.com', false, HOME)).toBe(true);
    });

    test('only chat.iflgm.com when locked, however the link writes it', () => {
        for (const url of [HOME, 'chat.iflgm.com', 'https://CHAT.iflgm.com/ifl/pl/abc', 'chat.iflgm.com:443', 'https://chat.iflgm.com/']) {
            expect(iflAllowsServer(url, true, HOME)).toBe(true);
        }
        for (const url of ['https://other.example.com', 'chat.iflgm.com.evil.example', 'https://evil.example/chat.iflgm.com', 'http://chat.iflgm.com:8065', '', undefined]) {
            expect(iflAllowsServer(url, true, HOME)).toBe(false);
        }
    });

    test('the build is locked, with abbreviation chips (decision D2)', () => {
        expect(IFL_LOCK_SERVER).toBe(true);
        expect(IFL_TEAM_CHIPS).toBe(true);
        expect(IFL_TEAM_CHIP_STYLE).toBe('abbr');
    });
});
