// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. Score and news cards: games and stories members send to chat
// from iflgm.com. A post carries only the id:
//
//   type "custom_ifl_score", props.ifl_score = {v: 1, id: "<matchup id>"}
//   type "custom_ifl_news",  props.ifl_news  = {v: 1, id: "<story id>"}
//
// plus a one-line message and a stock attachment for anything that can't draw
// the card. The app draws the card from chat's GET /api/v4/ifl/cards/... (the
// site's own copy, never the post's props), so a card only ever shows a real
// game or story as the site has it. Mirrors the site's chat panel
// (frontend/src/components/chat/{scoreCard,newsCard}.ts, ScoreCardView.tsx,
// NewsCardView.tsx in ifl-website).

import NetworkManager from '@managers/network_manager';

import {IFL_SITE_URL} from './config';

export const SCORE_POST_TYPE = 'custom_ifl_score';
export const NEWS_POST_TYPE = 'custom_ifl_news';

const SCORE_ID = /^\d{1,12}$/;
const NEWS_ID = /^[^\s/?#]{1,40}$/;

export type IflCardRef = {kind: 'score' | 'news'; id: string};

/** The card a post asks for, or null for any other post (or bad props). */
export function parseIflCard(post: {type?: string; props?: Record<string, unknown> | null}): IflCardRef | null {
    let kind: IflCardRef['kind'];
    let card: unknown;
    if (post.type === SCORE_POST_TYPE) {
        kind = 'score';
        card = post.props?.ifl_score;
    } else if (post.type === NEWS_POST_TYPE) {
        kind = 'news';
        card = post.props?.ifl_news;
    } else {
        return null;
    }
    if (!card || typeof card !== 'object') {
        return null;
    }
    const {v, id} = card as {v?: unknown; id?: unknown};
    if (v !== 1 || typeof id !== 'string' || !(kind === 'score' ? SCORE_ID : NEWS_ID).test(id)) {
        return null;
    }
    return {kind, id};
}

/* ===== Score cards ===== */

export type CardStatus = 'scheduled' | 'live' | 'final';

export type CardTeam = {
    id: number | null;
    name: string;
    abbreviation: string;

    /** Key for chat's public logo route; null: no logo (abbreviation chip). */
    badgeAbbr: string | null;
    color: string | null;
};

export type ScoreGame = {
    id: string;
    weekNum: number;
    status: CardStatus;
    home: CardTeam | null;
    away: CardTeam | null;
    homeScore: number | null;
    awayScore: number | null;
    homeRecord: string | null;
    awayRecord: string | null;
    homeLeft: number | null;
    awayLeft: number | null;
};

const HEX = /^#[0-9a-f]{6}$/i;
const BADGE = /^[A-Z]{2,3}$/;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

function team(raw: unknown): CardTeam | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const t = raw as Record<string, unknown>;
    const abbreviation = str(t.abbreviation);
    if (!abbreviation) {
        return null;
    }
    const badge = str(t.badge_abbr);
    const color = str(t.primary_color);
    return {
        id: num(t.id),
        name: str(t.name) ?? abbreviation,
        abbreviation,
        badgeAbbr: badge && BADGE.test(badge) ? badge : null,
        color: color && HEX.test(color) ? color : null,
    };
}

/** GET /api/v4/ifl/cards/score/<id> → the game, or null for a body that
 *  isn't one. While a week is live the site shows ESPN's provisional score
 *  until MFL posts official results (frontend/src/utils/api.ts mapMatchup). */
export function parseScoreGame(raw: unknown): ScoreGame | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const body = raw as {week?: Record<string, unknown>; matchup?: Record<string, unknown>};
    const m = body.matchup;
    if (!m || typeof m !== 'object' || (typeof m.id !== 'number' && typeof m.id !== 'string')) {
        return null;
    }
    const status: CardStatus = m.status === 'live' || m.status === 'final' ? m.status : 'scheduled';
    const provisional = status === 'live' && (num(m.home_live_score) != null || num(m.away_live_score) != null);
    return {
        id: String(m.id),
        weekNum: num(body.week?.week_number) ?? num(m.week_number) ?? 0,
        status,
        home: team(m.home_team),
        away: team(m.away_team),
        homeScore: provisional ? num(m.home_live_score) : num(m.home_score),
        awayScore: provisional ? num(m.away_live_score) : num(m.away_score),
        homeRecord: str(m.home_record),
        awayRecord: str(m.away_record),
        homeLeft: num(m.home_left),
        awayLeft: num(m.away_left),
    };
}

/** The status to show: a live game with nobody left to play on either side
 *  is over, even before MFL posts the official result (site ScoreCard). */
export function shownStatus(g: Pick<ScoreGame, 'status' | 'homeLeft' | 'awayLeft'>): CardStatus {
    return g.status === 'live' && g.homeLeft === 0 && g.awayLeft === 0 ? 'final' : g.status;
}

/** Where a score card goes: the game's box score on Live Scoring. */
export function scoreCardUrl(id: string, weekNum: number, site = IFL_SITE_URL): string {
    return `${site}/live/${weekNum}?matchup=${encodeURIComponent(id)}`;
}

/* ===== News cards ===== */

export type NewsOwner = {
    id: number | null;
    abbreviation: string;
    name: string;
    mine: boolean;
    badgeAbbr: string | null;
};

export type NewsStory = {
    id: string;
    title: string;
    content: string | null;
    source: string | null;
    publishedAt: string | null;
    player: {id: number; mflId: string | null; name: string; position: string | null; nflTeam: string | null} | null;
    owners: Record<string, NewsOwner>;
};

/** GET /api/v4/ifl/cards/news/<id> → the story, or null. */
export function parseNewsStory(raw: unknown): NewsStory | null {
    const item = raw && typeof raw === 'object' ? (raw as {item?: unknown}).item : null;
    if (!item || typeof item !== 'object') {
        return null;
    }
    const n = item as Record<string, unknown>;
    const title = str(n.title);
    if ((typeof n.id !== 'string' && typeof n.id !== 'number') || !title) {
        return null;
    }
    let player: NewsStory['player'] = null;
    const p = n.player as Record<string, unknown> | null | undefined;
    if (p && typeof p === 'object' && num(p.id) != null && str(p.name)) {
        const mflId = p.mfl_id == null ? null : String(p.mfl_id);
        player = {
            id: num(p.id)!,
            mflId: mflId && (/^\d{1,12}$/).test(mflId) ? mflId : null,
            name: str(p.name)!,
            position: str(p.position),
            nflTeam: str(p.nfl_team),
        };
    }
    const owners: Record<string, NewsOwner> = {};
    if (n.owners && typeof n.owners === 'object') {
        for (const [conf, value] of Object.entries(n.owners as Record<string, unknown>)) {
            const t = value as Record<string, unknown> | null;
            const abbreviation = t && typeof t === 'object' ? str(t.abbreviation) : null;
            if (abbreviation) {
                const badge = str(t!.badge_abbr);
                owners[conf] = {
                    id: num(t!.id),
                    abbreviation,
                    name: str(t!.name) ?? abbreviation,
                    mine: t!.mine === true,
                    badgeAbbr: badge && BADGE.test(badge) ? badge : null,
                };
            }
        }
    }
    return {
        id: String(n.id),
        title,
        content: str(n.content),
        source: str(n.source),
        publishedAt: str(n.published_at),
        player,
        owners,
    };
}

/** The site stores UTC without a zone; read such a time as UTC. */
export function parseNewsTime(iso: string): Date {
    const hasZone = (/(Z|[+-]\d\d:?\d\d)$/i).test(iso);
    return new Date(hasZone ? iso : `${iso}Z`);
}

/** "just now", "5 minutes ago", "2 hours ago", "3 days ago" (as the site). */
export function relativeTime(iso: string, now: Date): string {
    const seconds = (now.getTime() - parseNewsTime(iso).getTime()) / 1000;
    if (!Number.isFinite(seconds) || seconds < 60) {
        return 'just now';
    }
    const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return plural(minutes, 'minute');
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return plural(hours, 'hour');
    }
    return plural(Math.floor(hours / 24), 'day');
}

/** Where a news card goes: the player's page, or NFL News for a story with
 *  no player. */
export function newsCardUrl(story: Pick<NewsStory, 'player'>, site = IFL_SITE_URL): string {
    return story.player ? `${site}/player/${story.player.id}` : `${site}/news`;
}

export function headshotUrl(mflId: string, site = IFL_SITE_URL): string {
    return `${site}/headshots/${encodeURIComponent(mflId)}.png`;
}

/** Chat's public team logo route (64 px); `rev` busts the cache when the
 *  team badges list knows the logo's revision. */
export function cardLogoUrl(serverUrl: string, badgeAbbr: string, rev?: string): string {
    const v = rev ? `&v=${encodeURIComponent(rev)}` : '';
    return `${serverUrl}/api/v4/ifl/team_badges/logos/${encodeURIComponent(badgeAbbr)}.png?s=64${v}`;
}

/* ===== Loading ===== */

/** While a game is on, its cards fetch the score again this often. */
export const LIVE_REFRESH_MS = 60_000;

/** Cards for the same game drawn within this long share one request. */
const FRESH_MS = 15_000;

const games = new Map<string, {at: number; game: Promise<ScoreGame>}>();
const stories = new Map<string, Promise<NewsStory>>();

async function fetchCard<T>(serverUrl: string, path: string, parse: (raw: unknown) => T | null): Promise<T> {
    const client = NetworkManager.getClient(serverUrl);
    const card = parse(await client.doFetch(path, {method: 'get'}));
    if (!card) {
        throw new Error('Not a card');
    }
    return card;
}

/** One game's score; a failure (404: no such game, 502: site down) rejects
 *  and is tried again next time. */
export function loadScoreGame(serverUrl: string, id: string, now = Date.now()): Promise<ScoreGame> {
    const key = `${serverUrl}\n${id}`;
    const hit = games.get(key);
    if (hit && now - hit.at < FRESH_MS) {
        return hit.game;
    }
    const game = fetchCard(serverUrl, `/api/v4/ifl/cards/score/${encodeURIComponent(id)}`, parseScoreGame);
    games.set(key, {at: now, game});
    game.catch(() => {
        if (games.get(key)?.game === game) {
            games.delete(key);
        }
    });
    return game;
}

/** One story, fetched once per app session (stories don't change); a failed
 *  request is tried again the next time a card for it is drawn. */
export function loadNewsStory(serverUrl: string, id: string): Promise<NewsStory> {
    const key = `${serverUrl}\n${id}`;
    let story = stories.get(key);
    if (!story) {
        story = fetchCard(serverUrl, `/api/v4/ifl/cards/news/${encodeURIComponent(id)}`, parseNewsStory);
        stories.set(key, story);
        story.catch(() => {
            if (stories.get(key) === story) {
                stories.delete(key);
            }
        });
    }
    return story;
}

export function resetIflCardsForTest() {
    games.clear();
    stories.clear();
}
