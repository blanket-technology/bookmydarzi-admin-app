import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { lightColors } from '@/theme/colors';
import { captureException } from '@/services/sentryService';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/** Top-level crash net wrapping RootLayout (see src/app/_layout.tsx) -
 * without this, an uncaught render error anywhere in the tree produces a
 * blank screen in a production build with no way to recover and no
 * visibility into why it happened. Uses light theme colors directly rather
 * than useTheme() since a crashed React tree can't reliably call hooks. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    captureException(error, { componentStack: info.componentStack });
  }

  private handleRestart = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <View
        className="flex-1 items-center justify-center px-6 gap-3"
        style={{ backgroundColor: lightColors.background }}
      >
        <Ionicons name="warning-outline" size={48} color={lightColors.error} />
        <Text className="text-lg font-bold text-center" style={{ color: lightColors.text }}>
          Something went wrong
        </Text>
        <Text className="text-sm text-center" style={{ color: lightColors.textMuted }}>
          The app hit an unexpected error. Please try again - if this keeps happening, restart the app.
        </Text>
        <Button title="Try Again" onPress={this.handleRestart} className="mt-2" />
      </View>
    );
  }
}
