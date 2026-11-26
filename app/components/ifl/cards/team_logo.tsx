// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. A team's logo on a card, from chat's public logo route; a
// team without one (or a logo that fails to load) gets its abbreviation on
// the team colour, as the team chip draws it.

import {Image} from 'expo-image';
import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {cardLogoUrl} from '@utils/ifl/cards';
import {useIflBadgeTeams} from '@utils/ifl/team_badges';
import {changeOpacity} from '@utils/theme';

import {fonts} from './palette';

type Props = {
    abbreviation: string;
    badgeAbbr: string | null;
    color?: string | null;
    size: number;
};

const styles = StyleSheet.create({
    chip: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
    },
    text: {
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlign: 'center',
    },
});

const CardTeamLogo = ({abbreviation, badgeAbbr, color, size}: Props) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const teams = useIflBadgeTeams(serverUrl);
    const [failed, setFailed] = useState<string | null>(null);
    const known = teams[badgeAbbr ?? abbreviation.toUpperCase()];
    const uri = badgeAbbr ? cardLogoUrl(serverUrl, badgeAbbr, known?.logo_rev) : null;

    if (uri && failed !== uri) {
        return (
            <Image
                source={{uri}}
                style={{width: size, height: size}}
                contentFit='contain'
                cachePolicy='disk'
                accessible={false}
                onError={() => setFailed(uri)}
                testID={`ifl_card_logo.${badgeAbbr}`}
            />
        );
    }
    const label = abbreviation.slice(0, 3).toUpperCase();
    return (
        <View
            style={[styles.chip, {width: size, height: size, backgroundColor: known?.color ?? color ?? changeOpacity(theme.centerChannelColor, 0.4)}]}
            accessible={false}
            testID={`ifl_card_logo_chip.${label}`}
        >
            <Text
                style={[fonts.extrabold, styles.text, {fontSize: Math.round(size * (label.length > 2 ? 0.34 : 0.4))}]}
                allowFontScaling={false}
            >
                {label}
            </Text>
        </View>
    );
};

export default CardTeamLogo;
