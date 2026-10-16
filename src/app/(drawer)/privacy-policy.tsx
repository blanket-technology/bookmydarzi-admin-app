import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Card, Header, Pressable, ScreenContent } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

interface Section {
  heading: string;
  body: string;
}

// Content adapted from react_app's privacy.tsx for this app's actual data
// handling: staff/tailor/employee PII, plus customer delivery
// addresses/photos that staff can see while fulfilling orders. No self-
// service account creation exists here (accounts are provisioned by an
// admin), so account removal is framed as an admin action, not a self-
// service in-app flow.
const SECTIONS: Section[] = [
  {
    heading: 'Information we collect',
    body: 'This app uses your name, mobile number, email, and role to identify you when you sign in. Depending on your role, you may also see customer delivery addresses, order details, progress photos you or a customer upload, and chat messages, so you can fulfil and manage orders.',
  },
  {
    heading: 'How we use your information',
    body: "Your account details are used to sign you in, apply the correct permissions for your role, and attribute the actions you take (accepting orders, assigning tailors, updating order status) for support and audit purposes. Customer data you see while working is used only to fulfil that customer's order.",
  },
  {
    heading: 'Who we share it with',
    body: 'Customer information visible in this app is shared only as needed within BookMyDarzi to fulfil orders - it is never sold or shared with third parties outside what is required to run the platform (e.g. Razorpay for payment processing on the customer side).',
  },
  {
    heading: 'Data retention',
    body: 'Order records, chat messages, and audit logs are retained for as long as needed for operational and legal record-keeping. Progress photos are retained as part of the order history.',
  },
  {
    heading: 'Accounts',
    body: 'Staff, tailor and employee accounts on this app are created and removed by a BookMyDarzi administrator - there is no self-service sign-up. To have your account deactivated or removed, contact your administrator.',
  },
  {
    heading: 'Contact us',
    body: 'If you have questions about this policy or how data is handled in this app, contact your BookMyDarzi administrator.',
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Privacy Policy"
        showMenu={false}
        rightAction={
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />
      <ScreenContent showsVerticalScrollIndicator={false}>
        {SECTIONS.map((s) => (
          <Card className="mb-4" key={s.heading}>
            <Text className="font-bold mb-2" style={{ color: colors.text }}>
              {s.heading}
            </Text>
            <Text className="text-sm leading-5" style={{ color: colors.textSecondary }}>
              {s.body}
            </Text>
          </Card>
        ))}
      </ScreenContent>
    </View>
  );
}
