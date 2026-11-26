// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. The card for a custom_ifl_score or custom_ifl_news post, in
// the post body (app/components/post_list/post/body/body.tsx). `fallback` is
// the post's message and attachment, shown while the card loads or when it
// can't. A long press on the card opens the post's options, as it does
// anywhere else on a post.

import React, {type ReactNode, useCallback} from 'react';

import {Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';
import {dismissKeyboard} from '@utils/keyboard';

import NewsCardView from './news_card';
import ScoreCardView from './score_card';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {IflCardRef} from '@utils/ifl/cards';

type Props = {
    card: IflCardRef;
    fallback: ReactNode;
    location: AvailableScreens;
    postId: string;
    showAddReaction?: boolean;
    canShowOptions: boolean;
};

const IflPostCard = ({card, fallback, location, postId, showAddReaction, canShowOptions}: Props) => {
    const onLongPress = useCallback(async () => {
        await dismissKeyboard();
        navigateToScreen(Screens.POST_OPTIONS, {sourceScreen: location, postId, showAddReaction});
    }, [location, postId, showAddReaction]);
    const longPress = canShowOptions ? onLongPress : undefined;

    if (card.kind === 'score') {
        return (
            <ScoreCardView
                id={card.id}
                fallback={fallback}
                onLongPress={longPress}
            />
        );
    }
    return (
        <NewsCardView
            id={card.id}
            fallback={fallback}
            onLongPress={longPress}
        />
    );
};

export default IflPostCard;
