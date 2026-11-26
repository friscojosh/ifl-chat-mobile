// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. A news story sent to chat, drawn as iflgm.com's chat panel
// draws it (frontend/src/components/news/NewsStory.tsx, compact): headshot,
// player, position and NFL team, when, the headline and text, who rosters
// him in each conference, and the source. A tap opens the player's page (an
// owner chip, that team's page). Until the story arrives, or when chat or
// the site can't find it, the post's own message and attachment show
// instead (`fallback`). Titles and text are third-party: plain text only.

import {Image} from 'expo-image';
import React, {type ReactNode, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useExternalLinkHandler from '@hooks/use_external_link_handler';
import {headshotUrl, loadNewsStory, newsCardUrl, type NewsOwner, type NewsStory, relativeTime} from '@utils/ifl/cards';
import {IFL_SITE_URL} from '@utils/ifl/config';
import {changeOpacity} from '@utils/theme';

import {CARD_MAX_WIDTH, cardPalette, fonts} from './palette';
import CardTeamLogo from './team_logo';

const CONFERENCES = ['AFC', 'NFC'];
const FACE = 44;

function useStyles(theme: Theme) {
    return useMemo(() => {
        const c = cardPalette(theme);
        const s = StyleSheet.create({
            card: {
                width: '100%',
                maxWidth: CARD_MAX_WIDTH,
                flexDirection: 'row',
                gap: 10,
                paddingVertical: 14,
                paddingHorizontal: 12,
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: c.border,
                borderRadius: 10,
                backgroundColor: c.surface,
                overflow: 'hidden',
            },
            pressed: {backgroundColor: c.surfaceAlt},
            face: {width: FACE, paddingTop: 2, alignItems: 'center'},
            headshot: {width: FACE, height: FACE, borderRadius: FACE / 2, backgroundColor: c.surfaceAlt},
            noFace: {width: FACE - 1, height: FACE - 1, borderRadius: FACE / 2, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center'},
            noFaceText: {fontSize: 10, letterSpacing: 0.6, color: c.textFaint},
            body: {flex: 1, minWidth: 0, gap: 8},
            top: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12},
            who: {flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 10, rowGap: 4},
            name: {fontSize: 16, lineHeight: 22, color: c.text},
            pos: {fontSize: 12.5, lineHeight: 18, color: c.textMuted},
            yours: {
                alignSelf: 'center',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: changeOpacity(c.accent, 0.16),
            },
            yoursText: {fontSize: 11, lineHeight: 14, letterSpacing: 0.44, color: c.accent},
            when: {flexShrink: 0, fontSize: 12.5, lineHeight: 22, color: c.textMuted},
            headline: {fontSize: 17, lineHeight: 23, color: c.text},
            well: {borderRadius: 8, backgroundColor: c.well, paddingVertical: 10, paddingHorizontal: 14},
            text: {fontSize: 14.5, lineHeight: 22, color: c.textSecondary},
            foot: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 8},
            owners: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
            owner: {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 3,
                paddingLeft: 4,
                paddingRight: 10,
                borderRadius: 999,
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: c.border,
            },
            ownerFree: {borderColor: c.success},
            ownerPressed: {backgroundColor: c.pressed},
            conf: {
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 999,
                backgroundColor: c.surfaceAlt,
                overflow: 'hidden',
                fontSize: 10,
                lineHeight: 14,
                letterSpacing: 0.6,
                color: c.textMuted,
            },
            ownerText: {fontSize: 12, lineHeight: 18, color: c.text},
            freeText: {color: c.success},
            source: {marginLeft: 'auto', fontSize: 12, lineHeight: 18, color: c.textFaint},
        });
        return {c, s};
    }, [theme]);
}

function Headshot({mflId, s}: {mflId: string | null; s: ReturnType<typeof useStyles>['s']}) {
    const [failed, setFailed] = useState(false);
    if (mflId && !failed) {
        return (
            <Image
                source={{uri: headshotUrl(mflId)}}
                style={s.headshot}
                contentFit='cover'
                cachePolicy='disk'
                accessible={false}
                onError={() => setFailed(true)}
                testID='ifl_news_card.headshot'
            />
        );
    }
    return (
        <View
            style={s.noFace}
            accessible={false}
        >
            <Text style={[fonts.extrabold, s.noFaceText]}>{'NFL'}</Text>
        </View>
    );
}

type OwnerProps = {
    conf: string;
    owner: NewsOwner | undefined;
    onLongPress?: () => void;
    s: ReturnType<typeof useStyles>['s'];
};

function OwnerChip({conf, owner, onLongPress, s}: OwnerProps) {
    const open = useExternalLinkHandler(owner?.id == null ? undefined : `${IFL_SITE_URL}/team/${owner.id}`);
    if (!owner) {
        return (
            <View
                style={[s.owner, s.ownerFree]}
                accessible={true}
                accessibilityLabel={`${conf}: free agent`}
                testID={`ifl_news_card.owner.${conf}`}
            >
                <Text style={[fonts.semibold, s.conf]}>{conf}</Text>
                <Text style={[fonts.bold, s.ownerText, s.freeText]}>{'Free agent'}</Text>
            </View>
        );
    }
    return (
        <Pressable
            onPress={open}
            onLongPress={onLongPress}
            delayLongPress={200}
            disabled={owner.id == null}
            accessibilityRole='link'
            accessibilityLabel={`${conf}: ${owner.name}`}
            style={({pressed}) => [s.owner, pressed && s.ownerPressed]}
            testID={`ifl_news_card.owner.${conf}`}
        >
            <Text style={[fonts.semibold, s.conf]}>{conf}</Text>
            <CardTeamLogo
                abbreviation={owner.abbreviation}
                badgeAbbr={owner.badgeAbbr}
                size={18}
            />
            <Text style={[fonts.bold, s.ownerText]}>{owner.abbreviation}</Text>
        </Pressable>
    );
}

type CardProps = {
    story: NewsStory;
    now?: Date;
    onLongPress?: () => void;
};

export function NewsCard({story, now = new Date(), onLongPress}: CardProps) {
    const theme = useTheme();
    const {s} = useStyles(theme);
    const open = useExternalLinkHandler(newsCardUrl(story));
    const p = story.player;
    const yours = Object.values(story.owners).some((o) => o.mine);
    const posTeam = p ? [p.position, p.nflTeam].filter(Boolean).join(' · ') : '';
    return (
        <Pressable
            onPress={open}
            onLongPress={onLongPress}
            delayLongPress={200}
            accessibilityRole='link'
            accessibilityHint={p ? `Opens ${p.name} on iflgm.com` : 'Opens NFL news on iflgm.com'}
            style={({pressed}) => [s.card, pressed && s.pressed]}
            testID='ifl_news_card'
        >
            <View style={s.face}>
                <Headshot
                    mflId={p?.mflId ?? null}
                    s={s}
                />
            </View>
            <View style={s.body}>
                <View style={s.top}>
                    <View style={s.who}>
                        {p && <Text style={[fonts.extrabold, s.name]}>{p.name}</Text>}
                        {Boolean(posTeam) && <Text style={[fonts.semibold, s.pos]}>{posTeam}</Text>}
                        {yours && (
                            <View style={s.yours}>
                                <Text style={[fonts.extrabold, s.yoursText]}>{'YOUR PLAYER'}</Text>
                            </View>
                        )}
                    </View>
                    {Boolean(story.publishedAt) && (
                        <Text style={[fonts.regular, s.when]}>{relativeTime(story.publishedAt!, now)}</Text>
                    )}
                </View>
                <Text style={[fonts.extrabold, s.headline]}>{story.title}</Text>
                {Boolean(story.content) && (
                    <View style={s.well}>
                        <Text style={[fonts.regular, s.text]}>{story.content}</Text>
                    </View>
                )}
                {(Boolean(p) || Boolean(story.source)) && (
                    <View style={s.foot}>
                        {p && (
                            <View
                                style={s.owners}
                                accessibilityLabel='Owners'
                            >
                                {CONFERENCES.map((conf) => (
                                    <OwnerChip
                                        key={conf}
                                        conf={conf}
                                        owner={story.owners[conf]}
                                        onLongPress={onLongPress}
                                        s={s}
                                    />
                                ))}
                            </View>
                        )}
                        {Boolean(story.source) && <Text style={[fonts.regular, s.source]}>{story.source}</Text>}
                    </View>
                )}
            </View>
        </Pressable>
    );
}

type ViewProps = {
    id: string;
    fallback: ReactNode;
    onLongPress?: () => void;
};

const NewsCardView = ({id, fallback, onLongPress}: ViewProps) => {
    const serverUrl = useServerUrl();
    const [story, setStory] = useState<NewsStory | null>(null);
    useEffect(() => {
        let on = true;
        setStory(null);
        loadNewsStory(serverUrl, id).then((st) => {
            if (on) {
                setStory(st);
            }
        }, () => undefined);
        return () => {
            on = false;
        };
    }, [serverUrl, id]);

    if (!story) {
        return <>{fallback}</>;
    }
    return (
        <NewsCard
            story={story}
            onLongPress={onLongPress}
        />
    );
};

export default NewsCardView;
