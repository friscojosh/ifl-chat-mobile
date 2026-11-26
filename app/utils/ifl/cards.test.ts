// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. Score and news cards: post props, card bodies, loading.

import NetworkManager from '@managers/network_manager';

import {
    cardLogoUrl, headshotUrl, loadNewsStory, loadScoreGame, newsCardUrl, parseIflCard, parseNewsStory,
    parseScoreGame, relativeTime, resetIflCardsForTest, scoreCardUrl, shownStatus,
} from './cards';
import {IFL_SITE_URL} from './config';

const SERVER = 'https://chat.iflgm.com';

const SCORE_BODY = {
    week: {week_number: 12, id: 5},
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
        home_team: {id: 16, name: 'Los Angeles Chargers', abbreviation: 'LAC', logo_url: '/x.png', badge_abbr: 'LAC'},
        away_team: {id: 4, name: 'Miami Dolphins', abbreviation: 'MIA', logo_url: null, badge_abbr: null},
    },
};

const NEWS_BODY = {
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

describe('parseIflCard', () => {
    test('should read a score or news card from its props', () => {
        expect(parseIflCard({type: 'custom_ifl_score', props: {ifl_score: {v: 1, id: '4321'}}})).toEqual({kind: 'score', id: '4321'});
        expect(parseIflCard({type: 'custom_ifl_news', props: {ifl_news: {v: 1, id: 'abc-123'}}})).toEqual({kind: 'news', id: 'abc-123'});
    });

    test('should refuse any other post or malformed props', () => {
        const bad = [
            {type: '', props: {ifl_score: {v: 1, id: '1'}}},
            {type: 'custom_ifl_score', props: null},
            {type: 'custom_ifl_score', props: {ifl_score: {v: 2, id: '1'}}},
            {type: 'custom_ifl_score', props: {ifl_score: {v: 1, id: 1}}},
            {type: 'custom_ifl_score', props: {ifl_score: {v: 1, id: '12a'}}},
            {type: 'custom_ifl_score', props: {ifl_score: {v: 1, id: '1234567890123'}}},
            {type: 'custom_ifl_score', props: {ifl_news: {v: 1, id: '1'}}},
            {type: 'custom_ifl_news', props: {ifl_news: {v: 1, id: 'a/b'}}},
            {type: 'custom_ifl_news', props: {ifl_news: {v: 1, id: 'a b'}}},
            {type: 'custom_ifl_news', props: {ifl_news: {v: 1, id: ''}}},
            {type: 'custom_ifl_news', props: {ifl_news: {v: 1, id: 'x'.repeat(41)}}},
            {type: 'custom_ifl_news', props: {ifl_news: 'abc'}},
        ];
        for (const post of bad) {
            expect(parseIflCard(post)).toBeNull();
        }
    });
});

describe('parseScoreGame', () => {
    test('should show the provisional (live) score while the week is live', () => {
        const g = parseScoreGame(SCORE_BODY)!;
        expect(g).toMatchObject({id: '4321', weekNum: 12, status: 'live', homeScore: 88.5, awayScore: 101.2, homeLeft: 2, awayLeft: 1, homeRecord: '7-4'});
        expect(g.home).toEqual({id: 16, name: 'Los Angeles Chargers', abbreviation: 'LAC', badgeAbbr: 'LAC', color: null});
        expect(g.away?.badgeAbbr).toBeNull();
    });

    test('should show the official score when final, or live with no live scores', () => {
        const final = parseScoreGame({...SCORE_BODY, matchup: {...SCORE_BODY.matchup, status: 'final', home_score: 120, away_score: 99}})!;
        expect([final.homeScore, final.awayScore]).toEqual([120, 99]);
        const noLive = parseScoreGame({...SCORE_BODY, matchup: {...SCORE_BODY.matchup, home_live_score: null, away_live_score: null, home_score: 3}})!;
        expect([noLive.homeScore, noLive.awayScore]).toEqual([3, 0]);
    });

    test('should refuse a body without a matchup', () => {
        expect(parseScoreGame({week: {week_number: 1}})).toBeNull();
        expect(parseScoreGame(null)).toBeNull();
    });

    test('should drop a badge key that is not one', () => {
        const g = parseScoreGame({...SCORE_BODY, matchup: {...SCORE_BODY.matchup, home_team: {...SCORE_BODY.matchup.home_team, badge_abbr: '../x'}}})!;
        expect(g.home?.badgeAbbr).toBeNull();
    });
});

describe('shownStatus', () => {
    test('should call a live game with nobody left to play final', () => {
        expect(shownStatus({status: 'live', homeLeft: 0, awayLeft: 0})).toBe('final');
        expect(shownStatus({status: 'live', homeLeft: 0, awayLeft: 1})).toBe('live');
        expect(shownStatus({status: 'live', homeLeft: null, awayLeft: null})).toBe('live');
        expect(shownStatus({status: 'scheduled', homeLeft: 0, awayLeft: 0})).toBe('scheduled');
    });
});

describe('parseNewsStory', () => {
    test('should read the story, its player and owners', () => {
        const s = parseNewsStory(NEWS_BODY)!;
        expect(s).toMatchObject({id: 'abc-123', title: 'Herbert throws three touchdowns', source: 'RotoWire', publishedAt: '2026-11-25T18:00:00'});
        expect(s.player).toEqual({id: 77, mflId: '13604', name: 'Justin Herbert', position: 'QB', nflTeam: 'LAC'});
        expect(Object.keys(s.owners)).toEqual(['AFC']);
        expect(s.owners.AFC).toEqual({id: 16, abbreviation: 'LAC', name: 'Los Angeles Chargers', mine: true, badgeAbbr: 'LAC'});
    });

    test('should take a story with no player', () => {
        const s = parseNewsStory({item: {...NEWS_BODY.item, player: null, owners: {}}})!;
        expect(s.player).toBeNull();
        expect(newsCardUrl(s)).toBe(`${IFL_SITE_URL}/news`);
    });

    test('should refuse a body without a story', () => {
        expect(parseNewsStory({})).toBeNull();
        expect(parseNewsStory({item: {id: 'x'}})).toBeNull();
    });
});

describe('links', () => {
    test('should point at iflgm.com and chat\'s logo route', () => {
        expect(IFL_SITE_URL).toBe('https://iflgm.com');
        expect(scoreCardUrl('4321', 12)).toBe('https://iflgm.com/live/12?matchup=4321');
        expect(newsCardUrl(parseNewsStory(NEWS_BODY)!)).toBe('https://iflgm.com/player/77');
        expect(headshotUrl('13604')).toBe('https://iflgm.com/headshots/13604.png');
        expect(cardLogoUrl(SERVER, 'LAC')).toBe(`${SERVER}/api/v4/ifl/team_badges/logos/LAC.png?s=64`);
        expect(cardLogoUrl(SERVER, 'LAC', 'aa')).toBe(`${SERVER}/api/v4/ifl/team_badges/logos/LAC.png?s=64&v=aa`);
    });
});

describe('relativeTime', () => {
    const now = new Date('2026-11-25T20:00:00Z');
    test('should read a zoneless time as UTC, as the site does', () => {
        expect(relativeTime('2026-11-25T19:59:30', now)).toBe('just now');
        expect(relativeTime('2026-11-25T19:59:00Z', now)).toBe('1 minute ago');
        expect(relativeTime('2026-11-25T18:00:00', now)).toBe('2 hours ago');
        expect(relativeTime('2026-11-22T20:00:00+00:00', now)).toBe('3 days ago');
        expect(relativeTime('nonsense', now)).toBe('just now');
    });
});

describe('loading', () => {
    let doFetch: jest.Mock;

    beforeEach(() => {
        resetIflCardsForTest();
        doFetch = jest.fn();
        jest.spyOn(NetworkManager, 'getClient').mockReturnValue({doFetch} as unknown as ReturnType<typeof NetworkManager.getClient>);
    });

    test('should share one score request for 15 s, then fetch again', async () => {
        doFetch.mockResolvedValue(SCORE_BODY);
        const t = 1_000_000;
        await loadScoreGame(SERVER, '4321', t);
        await loadScoreGame(SERVER, '4321', t + 14_000);
        expect(doFetch).toHaveBeenCalledTimes(1);
        expect(doFetch).toHaveBeenCalledWith('/api/v4/ifl/cards/score/4321', {method: 'get'});
        await loadScoreGame(SERVER, '4321', t + 16_000);
        expect(doFetch).toHaveBeenCalledTimes(2);
    });

    test('should forget a failed score request', async () => {
        doFetch.mockRejectedValueOnce(Object.assign(new Error('not found'), {status_code: 404}));
        await expect(loadScoreGame(SERVER, '9')).rejects.toThrow('not found');
        doFetch.mockResolvedValueOnce(SCORE_BODY);
        await expect(loadScoreGame(SERVER, '9')).resolves.toMatchObject({id: '4321'});
    });

    test('should reject a body that is not a card', async () => {
        doFetch.mockResolvedValueOnce({nope: true});
        await expect(loadScoreGame(SERVER, '9')).rejects.toThrow();
    });

    test('should fetch a story once, and again only after a failure', async () => {
        doFetch.mockRejectedValueOnce(new Error('502'));
        await expect(loadNewsStory(SERVER, 'abc-123')).rejects.toThrow();
        doFetch.mockResolvedValue(NEWS_BODY);
        await loadNewsStory(SERVER, 'abc-123');
        await loadNewsStory(SERVER, 'abc-123');
        expect(doFetch).toHaveBeenCalledTimes(2);
        expect(doFetch).toHaveBeenLastCalledWith('/api/v4/ifl/cards/news/abc-123', {method: 'get'});
    });

    test('should fetch a story again after five minutes (owners change)', async () => {
        doFetch.mockResolvedValue(NEWS_BODY);
        await loadNewsStory(SERVER, 'abc-9', 0);
        await loadNewsStory(SERVER, 'abc-9', (5 * 60_000) - 1);
        expect(doFetch).toHaveBeenCalledTimes(1);
        await loadNewsStory(SERVER, 'abc-9', 5 * 60_000);
        expect(doFetch).toHaveBeenCalledTimes(2);
    });
});
