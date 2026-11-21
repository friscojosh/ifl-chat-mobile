// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. IFL Chat's build settings, from config.json (ifl/assets
// over assets/base, IFL.md). Upstream's config has none of these keys, so
// each reads as off there.

import LocalConfig from '@assets/config.json';

const config = LocalConfig as unknown as Record<string, unknown>;

/** The app talks only to DefaultServerUrl: no adding or switching servers. */
export const IFL_LOCK_SERVER = config.IflLockServer === true;

/** The team chip after GMs' names. */
export const IFL_TEAM_CHIPS = config.IflTeamChips === true;

/** 'abbr': abbreviation on the team colour (phones, decision D2); 'logo': the team logo. */
export const IFL_TEAM_CHIP_STYLE: 'logo' | 'abbr' = config.IflTeamChipStyle === 'logo' ? 'logo' : 'abbr';

function hostOf(url: string): string {
    return url.trim().toLowerCase().
        replace(/^[a-z][a-z0-9+.-]*:\/\//, '').
        replace(/[/?#].*$/, '').
        replace(/:443$/, '');
}

/** Whether a link may take the app to this server: any, unless the build
 *  is locked; then only DefaultServerUrl's host. */
export function iflAllowsServer(url: string | undefined, locked = IFL_LOCK_SERVER, defaultUrl = String(config.DefaultServerUrl ?? '')): boolean {
    if (!locked) {
        return true;
    }
    if (!url || !defaultUrl) {
        return false;
    }
    return hostOf(url) === hostOf(defaultUrl);
}
