// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. The team chip after a GM's name (IFL Chat apps plan).

import {act, screen} from '@testing-library/react-native';
import React from 'react';
import {StyleSheet} from 'react-native';

import NetworkManager from '@managers/network_manager';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {IFL_TEAM_BADGES_EVENT, resetIflTeamBadgesForTest} from '@utils/ifl/team_badges';
import {handleIflEvents} from '@utils/ifl/websocket';

import TeamChip from './team_chip';

const SERVER = 'https://chat.iflgm.com';
jest.mock('@context/server', () => ({useServerUrl: () => 'https://chat.iflgm.com'}));

const BADGES = {
    version: 'v1',
    teams: {
        LAC: {abbr: 'LAC', name: 'Los Angeles Chargers', conference: 'AFC', color: '#007BC7', logo_rev: 'aa'},
        MIA: {abbr: 'MIA', name: 'Miami Dolphins', conference: 'AFC', color: '#008E97', logo_rev: 'bb'},
    },
    users: {gm1: 'LAC'},
};

describe('TeamChip', () => {
    let doFetch: jest.Mock;

    beforeEach(() => {
        resetIflTeamBadgesForTest();
        doFetch = jest.fn().mockResolvedValue(BADGES);
        jest.spyOn(NetworkManager, 'getClient').mockReturnValue({doFetch} as unknown as ReturnType<typeof NetworkManager.getClient>);
    });

    test('a GM gets their team abbreviation on the team colour', async () => {
        renderWithIntlAndTheme(<TeamChip userId='gm1'/>);
        expect(await screen.findByText('LAC')).toBeTruthy();
        expect(StyleSheet.flatten(screen.getByLabelText('Los Angeles Chargers · AFC').props.style).backgroundColor).toBe('#007BC7');
        expect(doFetch).toHaveBeenCalledWith('/api/v4/ifl/team_badges', {method: 'get'});
    });

    test('nothing for a member without a team', async () => {
        renderWithIntlAndTheme(<TeamChip userId='someone'/>);
        await act(async () => {
            await Promise.resolve();
        });
        expect(screen.queryByText('LAC')).toBeNull();
    });

    test('chat\'s event moves the chip', async () => {
        renderWithIntlAndTheme(<TeamChip userId='gm1'/>);
        await screen.findByText('LAC');
        doFetch.mockResolvedValueOnce({...BADGES, version: 'v2', users: {gm1: 'MIA'}});
        await act(async () => {
            await handleIflEvents(SERVER, {event: IFL_TEAM_BADGES_EVENT});
        });
        expect(await screen.findByText('MIA')).toBeTruthy();
    });

    test('a failed refresh or another event keeps the chip', async () => {
        renderWithIntlAndTheme(<TeamChip userId='gm1'/>);
        await screen.findByText('LAC');
        doFetch.mockRejectedValueOnce(new Error('offline'));
        await act(async () => {
            await handleIflEvents(SERVER, {event: IFL_TEAM_BADGES_EVENT});
            await handleIflEvents(SERVER, {event: 'posted'});
        });
        expect(screen.getByText('LAC')).toBeTruthy();
        expect(doFetch).toHaveBeenCalledTimes(2);
    });
});
