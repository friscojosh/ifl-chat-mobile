// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// IFL: new file.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import LockedConnect from './locked_connect';

const theme = Preferences.THEMES.denim;

describe('LockedConnect', () => {
    it('shows connecting, with no server address or form', () => {
        renderWithIntlAndTheme(
            <LockedConnect
                connecting={true}
                onRetry={jest.fn()}
                theme={theme}
            />,
        );
        expect(screen.getByText('IFL Chat')).toBeTruthy();
        expect(screen.getByTestId('ifl.locked_connect.status')).toHaveTextContent('Connecting…');
        expect(screen.queryByTestId('ifl.locked_connect.retry')).toBeNull();
        expect(screen.queryByText(/server/i)).toBeNull();
    });

    it('shows the error and retries when the connection failed', () => {
        const onRetry = jest.fn();
        renderWithIntlAndTheme(
            <LockedConnect
                connecting={false}
                error='Cannot connect to the server.'
                onRetry={onRetry}
                theme={theme}
            />,
        );
        expect(screen.getByTestId('ifl.locked_connect.status')).toHaveTextContent('Cannot connect to the server.');
        fireEvent.press(screen.getByTestId('ifl.locked_connect.retry'));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows connecting while a retry is under way', () => {
        renderWithIntlAndTheme(
            <LockedConnect
                connecting={true}
                error='Cannot connect to the server.'
                onRetry={jest.fn()}
                theme={theme}
            />,
        );
        expect(screen.getByTestId('ifl.locked_connect.status')).toHaveTextContent('Connecting…');
    });
});
