// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. A league game sent to chat, drawn as iflgm.com's Live
// Scoring draws it (frontend/src/components/ScoreCard.tsx): status and week,
// then the away and home teams with logo, record, players yet to play while
// live, and score. Kept current while the game is on (every LIVE_REFRESH_MS
// while the app is in the foreground); a tap opens the game's box score.
// Until the score arrives, or when chat or the site can't find the game, the
// post's own message and attachment show instead (`fallback`).

import React, {type ReactNode, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useAppState} from '@hooks/device';
import useExternalLinkHandler from '@hooks/use_external_link_handler';
import {type CardStatus, type CardTeam, LIVE_REFRESH_MS, loadScoreGame, type ScoreGame, scoreCardUrl, shownStatus} from '@utils/ifl/cards';
import {changeOpacity} from '@utils/theme';

import {CARD_MAX_WIDTH, cardPalette, fonts} from './palette';
import CardTeamLogo from './team_logo';

const LOGO = 24;
const LABEL: Record<CardStatus, string> = {live: 'LIVE', final: 'FINAL', scheduled: 'UPCOMING'};

function useStyles(theme: Theme) {
    return useMemo(() => {
        const c = cardPalette(theme);
        const s = StyleSheet.create({
            card: {
                width: '100%',
                maxWidth: CARD_MAX_WIDTH,
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: c.border,
                borderRadius: 10,
                backgroundColor: c.surface,
                overflow: 'hidden',
            },
            pressed: {backgroundColor: c.surfaceAlt, borderColor: c.accent},
            header: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: c.surfaceAlt,
                borderBottomWidth: StyleSheet.hairlineWidth * 2,
                borderBottomColor: c.borderLight,
            },
            badge: {borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1},
            badgeText: {fontSize: 11, lineHeight: 16, letterSpacing: 0.66},
            week: {fontSize: 11, lineHeight: 16, color: c.textFaint},
            row: {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 8,
                paddingHorizontal: 12,
            },
            rowDivider: {borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: c.borderLight},
            rowWinner: {backgroundColor: changeOpacity(c.accent, 0.04)},
            info: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, height: LOGO, overflow: 'hidden'},
            abbr: {fontSize: 16, lineHeight: 22, letterSpacing: 0.64, color: c.textSecondary},
            abbrWinner: {color: c.text},
            record: {fontSize: 11, lineHeight: 16, color: c.textFaint, fontVariant: ['tabular-nums'], flexShrink: 1},
            left: {fontSize: 13, lineHeight: 18, color: c.textMuted, fontVariant: ['tabular-nums']},
            score: {
                fontSize: 18,
                lineHeight: 24,
                minWidth: 40,
                textAlign: 'right',
                fontVariant: ['tabular-nums'],
                color: c.textMuted,
            },
            scoreWinner: {color: c.accent},
        });
        return {c, s};
    }, [theme]);
}

function StatusBadge({status, theme}: {status: CardStatus; theme: Theme}) {
    const {c, s} = useStyles(theme);
    const opacity = useSharedValue(1);
    const pulse = useAnimatedStyle(() => ({opacity: opacity.value}));
    useEffect(() => {
        if (status === 'live') {
            opacity.value = withRepeat(withTiming(0.5, {duration: 750, easing: Easing.inOut(Easing.ease)}), -1, true);
        } else {
            opacity.value = 1;
        }
        return () => cancelAnimation(opacity);
    }, [status, opacity]);
    let color = c.textMuted;
    let background = c.border;
    if (status === 'live') {
        color = c.danger;
        background = changeOpacity(c.danger, 0.125);
    } else if (status === 'final') {
        color = c.success;
        background = changeOpacity(c.success, 0.125);
    }
    return (
        <Animated.View
            style={[s.badge, {backgroundColor: background}, status === 'live' && pulse]}
            testID='ifl_score_card.status'
        >
            <Text style={[fonts.bold, s.badgeText, {color}]}>{LABEL[status]}</Text>
        </Animated.View>
    );
}

type RowProps = {
    team: CardTeam | null;
    record: string | null;
    left: number | null;
    score: number | null;
    winner: boolean;
    showLeft: boolean;
    divider: boolean;
    side: 'home' | 'away';
    theme: Theme;
};

function TeamRow({team, record, left, score, winner, showLeft, divider, side, theme}: RowProps) {
    const {s} = useStyles(theme);
    const abbreviation = team?.abbreviation ?? '?';
    return (
        <View
            style={[s.row, divider && s.rowDivider, winner && s.rowWinner]}
            testID={`ifl_score_card.${side}`}
        >
            <View style={s.info}>
                <CardTeamLogo
                    abbreviation={abbreviation}
                    badgeAbbr={team?.badgeAbbr ?? null}
                    color={team?.color}
                    size={LOGO}
                />
                <Text
                    style={[winner ? fonts.bold : fonts.semibold, s.abbr, winner && s.abbrWinner]}
                    numberOfLines={1}
                >
                    {abbreviation.toUpperCase()}
                </Text>
                {Boolean(record) && (
                    <Text
                        style={[fonts.regular, s.record]}
                        numberOfLines={1}
                    >
                        {record}
                    </Text>
                )}
            </View>
            {showLeft && left != null && (
                <Text
                    style={[fonts.regular, s.left]}
                    accessibilityLabel={`${left} yet to play`}
                >
                    {`(${left})`}
                </Text>
            )}
            <Text
                style={[fonts.extrabold, s.score, winner && s.scoreWinner]}
                numberOfLines={1}
            >
                {score == null ? '-' : String(score)}
            </Text>
        </View>
    );
}

type CardProps = {
    game: ScoreGame;
    onLongPress?: () => void;
};

export function ScoreCard({game, onLongPress}: CardProps) {
    const theme = useTheme();
    const {s} = useStyles(theme);
    const open = useExternalLinkHandler(scoreCardUrl(game.id, game.weekNum));
    const status = shownStatus(game);
    const isFinal = status === 'final';
    const showLeft = status === 'live';
    const home = game.homeScore ?? 0;
    const away = game.awayScore ?? 0;
    const awayName = game.away?.name ?? 'Away';
    const homeName = game.home?.name ?? 'Home';
    const scores = `${awayName} ${game.awayScore ?? '-'}, ${homeName} ${game.homeScore ?? '-'}`;
    return (
        <Pressable
            onPress={open}
            onLongPress={onLongPress}
            delayLongPress={200}
            accessibilityRole='link'
            accessibilityLabel={`${awayName} at ${homeName}, week ${game.weekNum}, ${LABEL[status].toLowerCase()}: ${scores}. Open the box score`}
            style={({pressed}) => [s.card, pressed && s.pressed]}
            testID='ifl_score_card'
        >
            <View style={s.header}>
                <StatusBadge
                    status={status}
                    theme={theme}
                />
                <Text style={[fonts.regular, s.week]}>{`Wk ${game.weekNum}`}</Text>
            </View>
            <TeamRow
                side='away'
                team={game.away}
                record={game.awayRecord}
                left={game.awayLeft}
                score={game.awayScore}
                winner={isFinal && away > home}
                showLeft={showLeft}
                divider={true}
                theme={theme}
            />
            <TeamRow
                side='home'
                team={game.home}
                record={game.homeRecord}
                left={game.homeLeft}
                score={game.homeScore}
                winner={isFinal && home > away}
                showLeft={showLeft}
                divider={false}
                theme={theme}
            />
        </Pressable>
    );
}

type ViewProps = {
    id: string;
    fallback: ReactNode;
    onLongPress?: () => void;
};

const ScoreCardView = ({id, fallback, onLongPress}: ViewProps) => {
    const serverUrl = useServerUrl();
    const appState = useAppState();
    const [game, setGame] = useState<ScoreGame | null>(null);
    const live = game ? shownStatus(game) === 'live' : false;
    const active = appState === 'active';

    useEffect(() => {
        let on = true;
        setGame(null);
        loadScoreGame(serverUrl, id).then((g) => {
            if (on) {
                setGame(g);
            }
        }, () => undefined);
        return () => {
            on = false;
        };
    }, [serverUrl, id]);

    // While the game is on and the app is in front: every minute, and at
    // once on coming back to the app. A failed refresh keeps the last score.
    useEffect(() => {
        if (!live || !active) {
            return undefined;
        }
        let on = true;
        const refresh = () => loadScoreGame(serverUrl, id).then((g) => {
            if (on) {
                setGame(g);
            }
        }, () => undefined);
        refresh();
        const timer = setInterval(refresh, LIVE_REFRESH_MS);
        return () => {
            on = false;
            clearInterval(timer);
        };
    }, [serverUrl, id, live, active]);

    if (!game) {
        return <>{fallback}</>;
    }
    return (
        <ScoreCard
            game={game}
            onLongPress={onLongPress}
        />
    );
};

export default ScoreCardView;
