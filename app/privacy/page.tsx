import { PageShell } from '@/components/PageShell';
import { PageIntro } from '@/components/PageIntro';
import { PageContainer } from '@/components/PageContainer';

export default function PrivacyPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Policies"
        title="Privacy Policy"
        description="How we collect, protect, and use your information across The Urban Manual experience."
      />

      <PageContainer width="standard" className="space-y-10">
        <div className="prose dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-bold mb-4">Introduction</h2>
          <span className="text-gray-600 dark:text-gray-400">
            The Urban Manual ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services.
          </span>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
          <span className="text-gray-600 dark:text-gray-400 mb-4">
            We collect information that you provide directly to us, including:
          </span>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
            <li>Account information (email, username, password)</li>
            <li>Destinations you save or visit</li>
            <li>Lists and trips you create</li>
            <li>Usage data and preferences</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
          <span className="text-gray-600 dark:text-gray-400 mb-4">
            We use the information we collect to:
          </span>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
            <li>Provide and improve our services</li>
            <li>Personalize your experience</li>
            <li>Send you updates and notifications</li>
            <li>Analyze usage patterns and trends</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Data Security</h2>
          <span className="text-gray-600 dark:text-gray-400">
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </span>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Cookies</h2>
          <span className="text-gray-600 dark:text-gray-400">
            We use cookies and similar tracking technologies to enhance your experience and collect usage data. You can control cookie settings through your browser preferences.
          </span>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Third-Party Services</h2>
          <span className="text-gray-600 dark:text-gray-400">
            We use third-party services (such as Supabase for database and authentication) that may collect information used to identify you. These services have their own privacy policies.
          </span>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
          <span className="text-gray-600 dark:text-gray-400 mb-4">
            You have the right to:
          </span>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of communications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
          <span className="text-gray-600 dark:text-gray-400">
            If you have questions about this Privacy Policy, please contact us at privacy@theurbanmanual.com
          </span>
        </section>

        <section>
          <span className="text-sm text-gray-500 dark:text-gray-500">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </section>
        </div>
      </PageContainer>
    </PageShell>
  );
}
