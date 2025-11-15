import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-10 py-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-12 text-black dark:text-white">Privacy Policy</h1>

          <div className="space-y-6">
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Introduction</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                The Urban Manual (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) helps you discover, save, and organize destinations.
                This Privacy Policy describes the personal information we process when you visit theurbanmanual.com, use our
                web and mobile applications, or interact with our communications.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Information We Collect</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                We collect information you provide directly to us, including:
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Account details such as name, email address, password, and profile preferences.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Content you create inside the product (saved destinations, collections, lists, trips, notes, and activity history).</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Communications you send to our team (support inquiries, feedback, or survey responses).</span>
                </li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                We automatically collect certain technical information such as device type, browser, IP address, referring URL,
                and usage patterns (pages viewed, actions taken, timestamps). When you enable location-based features like
                &ldquo;Near Me&rdquo;, we temporarily collect your coarse device location to show relevant places.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">How We Use Your Information</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">We use personal information to:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Authenticate you, maintain your account, and sync your saved content across devices.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Power core product flows such as discovery, saved places, itineraries, trips, and personalized recommendations.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Send product updates, transactional messages, and respond to your requests.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Monitor performance, detect abuse, and maintain the reliability and safety of our systems.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Analyze aggregated usage trends to plan new features and improve the experience.</span>
                </li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">How We Share Information</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                We do not sell your personal information. We share it only with:
              </p>
              <ul className="space-y-2 mb-3">
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Trusted service providers who support our infrastructure (Supabase for authentication/database, hosting providers,
                  transactional email vendors, and analytics tools). These partners process data solely on our behalf under strict agreements.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Other parties when required by law, to respond to legal process, to protect our rights, or to prevent fraud or abuse.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Successors in the event of a merger, acquisition, or asset sale. We will notify you of any change in control that affects your data.</span>
                </li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                We may share aggregated or anonymized insights that no longer identify you.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Cookies & Tracking</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                We use first-party cookies and local storage to keep you signed in, remember preferences, and understand how the product performs.
                You can control cookies through your browser settings, though disabling them may limit core functionality.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Location Data</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                If you allow location permissions, we use your approximate device location to show nearby destinations and tailor suggestions.
                Location data stays on our servers long enough to return relevant results and is not stored with your profile unless you save a place.
                You can disable sharing by turning off location access in your device or browser settings at any time.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Data Retention</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                We retain account data while your profile remains active so that your saved places, trips, and history stay available across devices.
                If you delete specific content, it is removed from active systems immediately and from encrypted backups within 30 days.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                If you request full account deletion, we purge your saved data and Supabase authentication record as soon as the queued job finishes.
                Logs referencing your email are minimized to the extent needed for security and audit obligations.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Data Export & Deletion Requests</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                You can manage your data from <strong className="font-semibold text-black dark:text-white">Account → Settings</strong>. Every request is logged in Supabase, processed by our background worker,
                and confirmed via email.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span><strong className="font-semibold text-black dark:text-white">Export:</strong> We compile your profile, saved/visited places, collections, trips, and interactions, then email a secure download link—typically within 24 hours.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span><strong className="font-semibold text-black dark:text-white">Deletion:</strong> We permanently remove your account, purge saved content, and delete the associated Supabase auth record. This action cannot be undone.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span><strong className="font-semibold text-black dark:text-white">Support:</strong> If you do not receive confirmation within 72 hours, contact <a className="underline hover:text-black dark:hover:text-white transition-colors" href="mailto:privacy@theurbanmanual.com">privacy@theurbanmanual.com</a> with your account email.</span>
                </li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Your Rights & Choices</h2>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Access, correct, or update your profile information directly within your account.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Request a copy of your data or deletion of your account as described above.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Opt out of marketing emails by using the unsubscribe link or adjusting notification settings.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>Disable cookies or location services at the device level.</span>
                </li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Security</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                We secure your information using HTTPS encryption, encrypted storage provided by Supabase, role-based access controls, and continuous monitoring.
                While no online service can guarantee absolute security, we regularly review safeguards and limit data access to team members who need it.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Children</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                The Urban Manual is not directed to children under 16, and we do not knowingly collect personal information from them.
                If you believe we have done so, please contact us so we can delete the information.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">Contact Us</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Questions or concerns about this Privacy Policy can be sent to <a className="underline hover:text-black dark:hover:text-white transition-colors" href="mailto:privacy@theurbanmanual.com">privacy@theurbanmanual.com</a>.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link 
              href="/"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
