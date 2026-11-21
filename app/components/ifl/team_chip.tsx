// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. A GM's team chip after their name (IFL Chat apps plan):
// the abbreviation on the team colour (decision D2), or the logo when
// IflTeamChipStyle is "logo". Nothing for bots and members without a team.

import {Image} from 'expo-image';
import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useServerUrl} from '@context/server';
import {IFL_TEAM_CHIP_STYLE, IFL_TEAM_CHIPS} from '@utils/ifl/config';
import {teamLogoUrl, useIflTeamBadge} from '@utils/ifl/team_badges';

type Props = {
    userId: string;
    size?: number;
};

const styles = StyleSheet.create({
    chip: {
        borderRadius: 3,
        paddingHorizontal: 4,
        minHeight: 16,
        justifyContent: 'center',
        alignSelf: 'center',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        lineHeight: 14,
    },
});

const TeamChip = ({userId, size = 16}: Props) => {
    const serverUrl = useServerUrl();
    const team = useIflTeamBadge(serverUrl, userId);
    const [failedLogo, setFailedLogo] = useState<string | null>(null);
    if (!IFL_TEAM_CHIPS || !team) {
        return null;
    }
    const label = team.conference ? `${team.name} · ${team.conference}` : team.name;
    const logoKey = `${team.abbr}:${team.logo_rev}`;
    if (IFL_TEAM_CHIP_STYLE === 'logo' && team.logo_rev && failedLogo !== logoKey) {
        return (
            <Image
                source={{uri: teamLogoUrl(serverUrl, team, 64)}}
                style={{width: size, height: size}}
                contentFit='contain'
                cachePolicy='disk'
                accessible={true}
                accessibilityLabel={label}
                onError={() => setFailedLogo(logoKey)}
                testID={`ifl_team_chip.${team.abbr}`}
            />
        );
    }
    return (
        <View
            style={[styles.chip, {backgroundColor: team.color}]}
            accessible={true}
            accessibilityLabel={label}
            testID={`ifl_team_chip.${team.abbr}`}
        >
            <Text style={styles.text}>{team.abbr}</Text>
        </View>
    );
};

export default TeamChip;
