// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. Score and news cards in the post body.

import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';
import {AppState, StyleSheet, Text, View} from 'react-native';

import Body from '@components/post_list/post/body/body';
import Content from '@components/post_list/post/body/content';
import {Screens} from '@constants';
import Preferences from '@constants/preferences';
import NetworkManager from '@managers/network_manager';
import {navigateToScreen} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {LIVE_REFRESH_MS, resetIflCardsForTest} from '@utils/ifl/cards';
import {resetIflTeamBadgesForTest} from '@utils/ifl/team_badges';
import {openLink} from '@utils/url/links';

import {NewsCard} from './news_card';

const SERVER = 'https://chat.iflgm.com';
jest.mock('@context/server', () => ({useServerUrl: () => 'https://chat.iflgm.com'}));
jest.mock('@utils/url/links', () => ({openLink: jest.fn()}));
jest.mock('@screens/navigation', () => ({navigateToScreen: jest.fn()}));
jest.mock('@components/post_list/post/body/content', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@components/post_list/post/body/message', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@components/files', () => ({__esModule: true, default: jest.fn(() => null)}));

const MessageMock = jest.requireMock('@components/post_list/post/body/message').default as jest.Mock;

const SCORE = {
    week: {week_number: 12},
    matchup: {
        id: 4321,
        status: 'live',
        home_score: 0,
        away_score: 0,
        home_live_score: 88.5,
        away_live_score: 101.2,
        home_record: '7-4',
        away_record: '8-3',
        home_left: 2,
        away_left: 1,
        home_team: {id: 16, name: 'Los Angeles Chargers', abbreviation: 'LAC', logo_url: null, badge_abbr: 'LAC'},
        away_team: {id: 4, name: 'Miami Dolphins', abbreviation: 'MIA', logo_url: null, badge_abbr: null},
    },
};

const NEWS = {
    item: {
        id: 'abc-123',
        title: 'Herbert throws three touchdowns',
        content: 'Justin Herbert completed 25 of 31 passes.',
        source: 'RotoWire',
        published_at: '2026-11-25T18:00:00',
        player: {id: 77, mfl_id: '13604', name: 'Justin Herbert', position: 'QB', nfl_team: 'LAC'},
        owners: {AFC: {id: 16, abbreviation: 'LAC', name: 'Los Angeles Chargers', logo_url: null, mine: true, badge_abbr: 'LAC'}},
    },
};

const BADGES = {
    version: 'v1',
    teams: {MIA: {abbr: 'MIA', name: 'Miami Dolphins', conference: 'AFC', color: '#008E97', logo_rev: ''}},
    users: {},
};

const ATTACHMENTS = [{fallback: 'Score', title: 'Score'}];

function cardPost(type: string, props: Record<string, unknown>) {
    return TestHelper.fakePostModel({
        id: 'post-id',
        type: type as PostType,
        message: '**Miami Dolphins** 101.2 at **Los Angeles Chargers** 88.5',
        props: {...props, attachments: ATTACHMENTS},
        metadata: {embeds: [{type: 'message_attachment'}]} as PostMetadata,
    });
}

function renderBody(post: ReturnType<typeof cardPost>) {
    return renderWithIntlAndTheme(
        <Body
            appsEnabled={false}
            mmBlocksEnabled={false}
            filesInfo={[]}
            hasReactions={false}
            isRedactionVerified={true}
            redactionRequiredEpoch={0}
            highlight={false}
            highlightReplyBar={false}
            isEphemeral={false}
            isJumboEmoji={false}
            isPendingOrFailed={false}
            isPostAddChannelMember={false}
            location={Screens.CHANNEL}
            post={post}
            showAddReaction={true}
            theme={Preferences.THEMES.denim}
            isChannelAutotranslated={false}
        />,
    );
}

async function flush() {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
}

describe('IFL cards in the post body', () => {
    let doFetch: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        resetIflCardsForTest();
        resetIflTeamBadgesForTest();
        jest.mocked(Content).mockImplementation(() => React.createElement(View, {testID: 'attachment'}));
        MessageMock.mockImplementation(() => React.createElement(Text, {testID: 'message'}, 'message'));
        doFetch = jest.fn((path: string) => {
            if (path === '/api/v4/ifl/team_badges') {
                return Promise.resolve(BADGES);
            }
            if (path.startsWith('/api/v4/ifl/cards/score/')) {
                return Promise.resolve(SCORE);
            }
            return Promise.resolve(NEWS);
        });
        jest.spyOn(NetworkManager, 'getClient').mockReturnValue({doFetch} as unknown as ReturnType<typeof NetworkManager.getClient>);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should show the message and attachment until the score arrives, then only the card', async () => {
        renderBody(cardPost('custom_ifl_score', {ifl_score: {v: 1, id: '4321'}}));
        expect(screen.getByTestId('message')).toBeTruthy();
        expect(screen.getByTestId('attachment')).toBeTruthy();

        expect(await screen.findByTestId('ifl_score_card')).toBeTruthy();
        expect(screen.queryByTestId('message')).toBeNull();
        expect(screen.queryByTestId('attachment')).toBeNull();
        expect(doFetch).toHaveBeenCalledWith('/api/v4/ifl/cards/score/4321', {method: 'get'});
    });

    it('should draw a live game as the site does', async () => {
        renderBody(cardPost('custom_ifl_score', {ifl_score: {v: 1, id: '4321'}}));
        await screen.findByTestId('ifl_score_card');
        expect(screen.getByText('LIVE')).toBeTruthy();
        expect(screen.getByText('Wk 12')).toBeTruthy();
        expect(screen.getByText('101.2')).toBeTruthy();
        expect(screen.getByText('88.5')).toBeTruthy();
        expect(screen.getByText('8-3')).toBeTruthy();
        expect(screen.getByText('(1)')).toBeTruthy();
        expect(screen.getByText('(2)')).toBeTruthy();

        // Away team first; MIA has no logo, so its abbreviation chip on its colour.
        const rows = [screen.getByTestId('ifl_score_card.away'), screen.getByTestId('ifl_score_card.home')];
        expect(rows[0]).toHaveTextContent(/MIA/);
        expect(rows[1]).toHaveTextContent(/LAC/);
        expect(screen.getByTestId('ifl_card_logo.LAC')).toBeTruthy();
        await waitFor(() => expect(StyleSheet.flatten(screen.getByTestId('ifl_card_logo_chip.MIA').props.style).backgroundColor).toBe('#008E97'));
    });

    it('should call a live game with nobody left final, without "(n)", the winner in the accent', async () => {
        doFetch.mockImplementation(() => Promise.resolve({...SCORE, matchup: {...SCORE.matchup, home_left: 0, away_left: 0}}));
        renderBody(cardPost('custom_ifl_score', {ifl_score: {v: 1, id: '4321'}}));
        await screen.findByTestId('ifl_score_card');
        expect(screen.getByText('FINAL')).toBeTruthy();
        expect(screen.queryByText('(0)')).toBeNull();
        const theme = Preferences.THEMES.denim;
        expect(StyleSheet.flatten(screen.getByText('101.2').props.style).color).toBe(theme.buttonBg);
        expect(StyleSheet.flatten(screen.getByText('88.5').props.style).color).not.toBe(theme.buttonBg);
    });

    it('should open the box score on a tap and the post options on a long press', async () => {
        renderBody(cardPost('custom_ifl_score', {ifl_score: {v: 1, id: '4321'}}));
        const card = await screen.findByTestId('ifl_score_card');
        fireEvent.press(card);
        expect(openLink).toHaveBeenCalledWith('https://iflgm.com/live/12?matchup=4321', SERVER, '', expect.anything());
        fireEvent(card, 'longPress');
        await flush();
        expect(navigateToScreen).toHaveBeenCalledWith(Screens.POST_OPTIONS, {sourceScreen: Screens.CHANNEL, postId: 'post-id', showAddReaction: true});
    });

    it('should refresh a live game every minute while the app is in front', async () => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        renderBody(cardPost('custom_ifl_score', {ifl_score: {v: 1, id: '4321'}}));
        await screen.findByTestId('ifl_score_card');
        const scoreCalls = () => doFetch.mock.calls.filter(([p]) => p.startsWith('/api/v4/ifl/cards/score/')).length;
        expect(scoreCalls()).toBe(1);

        doFetch.mockImplementation((p: string) => Promise.resolve(p.includes('cards/score') ? {...SCORE, matchup: {...SCORE.matchup, home_live_score: 95.0}} : BADGES));
        await act(async () => {
            jest.advanceTimersByTime(LIVE_REFRESH_MS);
        });
        await flush();
        expect(scoreCalls()).toBe(2);
        expect(screen.getByText('95')).toBeTruthy();
    });

    it('should not refresh while the app is in the background', async () => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        const was = AppState.currentState;
        AppState.currentState = 'background';
        renderBody(cardPost('custom_ifl_score', {ifl_score: {v: 1, id: '4321'}}));
        await screen.findByTestId('ifl_score_card');
        await act(async () => {
            jest.advanceTimersByTime(LIVE_REFRESH_MS * 3);
        });
        expect(doFetch.mock.calls.filter(([p]) => p.startsWith('/api/v4/ifl/cards/score/')).length).toBe(1);
        AppState.currentState = was;
    });

    it('should keep the message and attachment when the game can\'t be found', async () => {
        doFetch.mockImplementation((p: string) => (p.includes('cards/') ? Promise.reject(Object.assign(new Error('404'), {status_code: 404})) : Promise.resolve(BADGES)));
        renderBody(cardPost('custom_ifl_score', {ifl_score: {v: 1, id: '4321'}}));
        await flush();
        expect(screen.queryByTestId('ifl_score_card')).toBeNull();
        expect(screen.getByTestId('message')).toBeTruthy();
        expect(screen.getByTestId('attachment')).toBeTruthy();
    });

    it('should leave a post with malformed props alone', async () => {
        renderBody(cardPost('custom_ifl_score', {ifl_score: {v: 1, id: 'abc'}}));
        await flush();
        expect(screen.getByTestId('attachment')).toBeTruthy();
        expect(doFetch.mock.calls.some(([p]) => p.includes('cards/'))).toBe(false);
    });

    it('should draw a news story with its owners', async () => {
        renderBody(cardPost('custom_ifl_news', {ifl_news: {v: 1, id: 'abc-123'}}));
        const card = await screen.findByTestId('ifl_news_card');
        expect(screen.queryByTestId('attachment')).toBeNull();
        expect(doFetch).toHaveBeenCalledWith('/api/v4/ifl/cards/news/abc-123', {method: 'get'});
        expect(screen.getByText('Justin Herbert')).toBeTruthy();
        expect(screen.getByText('QB · LAC')).toBeTruthy();
        expect(screen.getByText('YOUR PLAYER')).toBeTruthy();
        expect(screen.getByText('Herbert throws three touchdowns')).toBeTruthy();
        expect(screen.getByText('Justin Herbert completed 25 of 31 passes.')).toBeTruthy();
        expect(screen.getByText('RotoWire')).toBeTruthy();
        expect(screen.getByTestId('ifl_news_card.owner.AFC')).toHaveTextContent(/LAC/);
        expect(screen.getByTestId('ifl_news_card.owner.NFC')).toHaveTextContent(/Free agent/);
        expect(screen.getByTestId('ifl_news_card.headshot').props.source).toEqual([expect.objectContaining({uri: 'https://iflgm.com/headshots/13604.png'})]);

        fireEvent.press(card);
        expect(openLink).toHaveBeenLastCalledWith('https://iflgm.com/player/77', SERVER, '', expect.anything());
        fireEvent.press(screen.getByTestId('ifl_news_card.owner.AFC'));
        expect(openLink).toHaveBeenLastCalledWith('https://iflgm.com/team/16', SERVER, '', expect.anything());
    });
});

describe('NewsCard', () => {
    beforeEach(() => {
        jest.spyOn(NetworkManager, 'getClient').mockReturnValue({doFetch: jest.fn().mockResolvedValue(BADGES)} as unknown as ReturnType<typeof NetworkManager.getClient>);
    });

    it('should draw a story with no player: no owners, "NFL" for a face', () => {
        renderWithIntlAndTheme(
            <NewsCard
                story={{id: 'x', title: 'League news', content: null, source: null, publishedAt: '2026-11-25T19:00:00Z', player: null, owners: {}}}
                now={new Date('2026-11-25T20:00:00Z')}
            />,
        );
        expect(screen.getByText('League news')).toBeTruthy();
        expect(screen.getByText('NFL')).toBeTruthy();
        expect(screen.getByText('1 hour ago')).toBeTruthy();
        expect(screen.queryByTestId('ifl_news_card.owner.AFC')).toBeNull();
    });
});
