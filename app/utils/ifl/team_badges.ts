// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. Every GM's team chip (IFL Chat apps plan), per server, from
// GET /api/v4/ifl/team_badges. Fetched when the first chip mounts, when the
// app comes to the foreground, and on custom_ifl_team_badges_changed. A
// failure keeps what was there; never an error in front of members.

import {useEffect, useSyncExternalStore} from 'react';
import {AppState} from 'react-native';

import NetworkManager from '@managers/network_manager';

export type IflBadgeTeam = {abbr: string; name: string; conference: string; color: string; logo_rev: string};
export type IflBadges = {version: string; teams: Record<string, IflBadgeTeam>; users: Record<string, string>};

export const IFL_TEAM_BADGES_EVENT = 'custom_ifl_team_badges_changed';

const EMPTY: IflBadges = {version: '', teams: {}, users: {}};
const badges = new Map<string, IflBadges>();
const running = new Map<string, Promise<void>>();
const again = new Set<string>();
const listeners = new Set<() => void>();
let watchingAppState = false;

export function parseBadges(raw: unknown): IflBadges | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const r = raw as Record<string, unknown>;
    if (typeof r.version !== 'string' || !r.teams || typeof r.teams !== 'object' || !r.users || typeof r.users !== 'object') {
        return null;
    }
    const teams: Record<string, IflBadgeTeam> = {};
    for (const [key, value] of Object.entries(r.teams as Record<string, unknown>)) {
        const t = value as Partial<IflBadgeTeam> | null;
        if (t && t.abbr === key && (/^[A-Z]{2,3}$/).test(key) && typeof t.name === 'string' &&
            typeof t.conference === 'string' && typeof t.color === 'string' && (/^#[0-9A-Fa-f]{6}$/).test(t.color)) {
            teams[key] = {abbr: key, name: t.name, conference: t.conference, color: t.color, logo_rev: typeof t.logo_rev === 'string' ? t.logo_rev : ''};
        }
    }
    const users: Record<string, string> = {};
    for (const [id, abbr] of Object.entries(r.users as Record<string, unknown>)) {
        if (typeof abbr === 'string' && teams[abbr]) {
            users[id] = abbr;
        }
    }
    return {version: r.version, teams, users};
}

function emit() {
    listeners.forEach((l) => l());
}

async function fetchOnce(serverUrl: string) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const next = parseBadges(await client.doFetch('/api/v4/ifl/team_badges', {method: 'get'}));
        if (next) {
            badges.set(serverUrl, next);
            emit();
        }
    } catch {
        if (!badges.has(serverUrl)) {
            badges.set(serverUrl, EMPTY);
        }
    }
}

/** Refetch now; a call during a fetch runs one more after it. */
export function refreshTeamBadges(serverUrl: string): Promise<void> {
    const current = running.get(serverUrl);
    if (current) {
        again.add(serverUrl);
        return current;
    }
    const run = (async () => {
        do {
            again.delete(serverUrl);
            // eslint-disable-next-line no-await-in-loop
            await fetchOnce(serverUrl);
        } while (again.has(serverUrl));
    })().finally(() => {
        running.delete(serverUrl);
    });
    running.set(serverUrl, run);
    return run;
}

function watchAppState() {
    if (watchingAppState) {
        return;
    }
    watchingAppState = true;
    AppState.addEventListener('change', (state) => {
        if (state === 'active') {
            for (const url of badges.keys()) {
                refreshTeamBadges(url);
            }
        }
    });
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useIflTeamBadge(serverUrl: string, userId: string): IflBadgeTeam | undefined {
    const all = useSyncExternalStore(subscribe, () => badges.get(serverUrl) ?? EMPTY);
    useEffect(() => {
        watchAppState();
        if (!badges.has(serverUrl) && !running.has(serverUrl)) {
            refreshTeamBadges(serverUrl);
        }
    }, [serverUrl]);
    const abbr = all.users[userId];
    return abbr ? all.teams[abbr] : undefined;
}

export function teamLogoUrl(serverUrl: string, team: IflBadgeTeam, size: 64 | 128): string {
    return `${serverUrl}/api/v4/ifl/team_badges/logos/${encodeURIComponent(team.abbr)}.png?s=${size}&v=${encodeURIComponent(team.logo_rev)}`;
}

export function resetIflTeamBadgesForTest() {
    badges.clear();
    running.clear();
    again.clear();
    listeners.clear();
}
