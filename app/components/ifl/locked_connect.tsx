// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file. What the locked app shows while it connects to
// chat.iflgm.com, in place of upstream's "Connect to your server" form: the
// address is fixed, so members see the app's logo and a status, and a retry
// button if the connection failed.

import React from 'react';
import {useIntl} from 'react-intl';
import {ActivityIndicator, Image, Text, View} from 'react-native';

import Button from '@components/button';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const logo = require('@assets/images/logo.png');

type Props = {
    connecting: boolean;
    error?: string;
    onRetry: () => void;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    logo: {
        width: 96,
        height: 96,
        marginBottom: 24,
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 800, 'SemiBold'),
        marginBottom: 12,
    },
    status: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        textAlign: 'center',
        ...typography('Body', 200, 'Regular'),
        marginBottom: 24,
    },
}));

const LockedConnect = ({connecting, error, onRetry, theme}: Props) => {
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const failed = Boolean(error) && !connecting;

    return (
        <View
            style={styles.container}
            testID='ifl.locked_connect'
        >
            <Image
                source={logo}
                style={styles.logo}
                resizeMode='contain'
            />
            <Text style={styles.title}>{'IFL Chat'}</Text>
            <Text
                style={styles.status}
                testID='ifl.locked_connect.status'
            >
                {failed ? error : intl.formatMessage({id: 'ifl.locked_connect.connecting', defaultMessage: 'Connecting…'})}
            </Text>
            {failed ? (
                <Button
                    theme={theme}
                    text={intl.formatMessage({id: 'ifl.locked_connect.retry', defaultMessage: 'Try again'})}
                    onPress={onRetry}
                    testID='ifl.locked_connect.retry'
                />
            ) : (
                <ActivityIndicator color={theme.buttonBg}/>
            )}
        </View>
    );
};

export default LockedConnect;
