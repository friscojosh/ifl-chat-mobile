// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. The site's card colours (surface, borders, text tones,
// accent, live red, final green) from the app's theme, so cards follow the
// member's light or dark theme.

import {StyleSheet} from 'react-native';

import {changeOpacity} from '@utils/theme';

export function cardPalette(theme: Theme) {
    const text = theme.centerChannelColor;
    return {
        surface: theme.centerChannelBg,
        surfaceAlt: changeOpacity(text, 0.05),
        well: changeOpacity(text, 0.06),
        border: changeOpacity(text, 0.16),
        borderLight: changeOpacity(text, 0.08),
        pressed: changeOpacity(text, 0.06),
        text,
        textSecondary: changeOpacity(text, 0.84),
        textMuted: changeOpacity(text, 0.64),
        textFaint: changeOpacity(text, 0.56),
        accent: theme.buttonBg,
        danger: theme.dndIndicator,
        success: theme.onlineIndicator,
    };
}

/** OpenSans at the site's weights (each weight is its own font file on Android). */
export const fonts = StyleSheet.create({
    regular: {fontFamily: 'OpenSans', fontWeight: '400'},
    semibold: {fontFamily: 'OpenSans-SemiBold', fontWeight: '600'},
    bold: {fontFamily: 'OpenSans-Bold', fontWeight: '700'},
    extrabold: {fontFamily: 'OpenSans-ExtraBold', fontWeight: '800'},
});

/** The card's width at most, as the site's chat panel draws it. */
export const CARD_MAX_WIDTH = 360;
