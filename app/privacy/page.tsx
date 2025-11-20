'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { ChevronUp } from 'lucide-react';
import { openCookieSettings } from '@/components/CookieConsent';

const sections = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'information-we-collect', title: 'Information We Collect' },
  { id: 'how-we-use', title: 'How We Use Your Information' },
  { id: 'how-we-share', title: 'How We Share Information' },
  { id: 'cookies-tracking', title: 'Cookies & Tracking' },
  { id: 'location-data', title: 'Location Data' },
  { id: 'data-retention', title: 'Data Retention' },
  { id: 'data-export-deletion', title: 'Data Export & Deletion Requests' },
  { id: 'your-rights', title: 'Your Rights & Choices' },
  { id: 'security', title: 'Security' },
  { id: 'children', title: 'Children' },
  { id: 'contact', title: 'Contact Us' },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('header');
      let headerBottom = 120; // fallback
      
      if (header) {
        const headerTop = header.offsetTop;
        const headerHeight = header.offsetHeight;
        headerBottom = headerTop + headerHeight;
      }
      
      const scrollPosition = window.scrollY + headerBottom + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = sectionRefs.current[section.id];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      // Calculate header bottom position (including margin-top)
      const header = document.querySelector('header');
      let headerBottom = 120; // fallback
      
      if (header) {
        // Get the header's position from top of document
        const headerTop = header.offsetTop;
        const headerHeight = header.offsetHeight;
        headerBottom = headerTop + headerHeight;
      }
      
      const offset = headerBottom + 24; // Add extra spacing below header
      const elementPosition = element.offsetTop;
      const offsetPosition = Math.max(0, elementPosition - offset);

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Large Centered Title */}
      <div className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-normal text-center text-black dark:text-white mb-16 md:mb-20">
            Privacy Policy
          </h1>

          {/* Two-Column Layout */}
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-20">
            {/* Left Sidebar - Navigation */}
            <aside className="lg:w-56 flex-shrink-0">
              <div className="sticky top-24">
                <nav className="space-y-0.5">
                  {sections.map((section, index) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-0 py-2.5 text-xs tracking-wide transition-colors flex items-center justify-between ${
                        activeSection === section.id
                          ? 'text-black dark:text-white'
                          : 'text-gray-500 dark:text-gray-500 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <span className={activeSection === section.id ? 'font-medium' : ''}>{section.title}</span>
                      {activeSection === section.id && (
                        <ChevronUp className="h-3 w-3 text-black dark:text-white" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 max-w-3xl">
              <div className="space-y-16 md:space-y-20">
                {/* Introduction */}
                <section
                  id="introduction"
                  ref={(el) => { sectionRefs.current['introduction'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Introduction</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      The Urban Manual (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) helps you discover, save, and organize destinations.
                      This Privacy Policy describes the personal information we process when you visit www.urbanmanual.co, use our
                      web and mobile applications, or interact with our communications.
                    </p>
                  </div>
                </section>

                {/* Information We Collect */}
                <section
                  id="information-we-collect"
                  ref={(el) => { sectionRefs.current['information-we-collect'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Information We Collect</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      We collect information you provide directly to us, including:
                    </p>
                    <ul className="space-y-2 ml-4">
                      <li className="list-disc">Account details such as name, email address, password, and profile preferences.</li>
                      <li className="list-disc">Content you create inside the product (saved destinations, collections, lists, trips, notes, and activity history).</li>
                      <li className="list-disc">Communications you send to our team (support inquiries, feedback, or survey responses).</li>
                    </ul>
                    <p>
                      We automatically collect certain technical information such as device type, browser, IP address, referring URL,
                      and usage patterns (pages viewed, actions taken, timestamps). When you enable location-based features like
                      &ldquo;Near Me&rdquo;, we temporarily collect your coarse device location to show relevant places.
                    </p>
                  </div>
                </section>

                {/* How We Use Your Information */}
                <section
                  id="how-we-use"
                  ref={(el) => { sectionRefs.current['how-we-use'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">How We Use Your Information</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>We use personal information to:</p>
                    <ul className="space-y-2 ml-4">
                      <li className="list-disc">Authenticate you, maintain your account, and sync your saved content across devices.</li>
                      <li className="list-disc">Power core product flows such as discovery, saved places, itineraries, trips, and personalized recommendations.</li>
                      <li className="list-disc">Send product updates, transactional messages, and respond to your requests.</li>
                      <li className="list-disc">Monitor performance, detect abuse, and maintain the reliability and safety of our systems.</li>
                      <li className="list-disc">Analyze aggregated usage trends to plan new features and improve the experience.</li>
                    </ul>
                  </div>
                </section>

                {/* How We Share Information */}
                <section
                  id="how-we-share"
                  ref={(el) => { sectionRefs.current['how-we-share'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">How We Share Information</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      We do not sell your personal information. We share it only with:
                    </p>
                    <ul className="space-y-2 ml-4">
                      <li className="list-disc">
                        Trusted service providers who support our infrastructure (Supabase for authentication/database, hosting providers,
                        transactional email vendors, and analytics tools). These partners process data solely on our behalf under strict agreements.
                      </li>
                      <li className="list-disc">
                        Other parties when required by law, to respond to legal process, to protect our rights, or to prevent fraud or abuse.
                      </li>
                      <li className="list-disc">
                        Successors in the event of a merger, acquisition, or asset sale. We will notify you of any change in control that affects your data.
                      </li>
                    </ul>
                    <p>
                      We may share aggregated or anonymized insights that no longer identify you.
                    </p>
                  </div>
                </section>

                {/* Cookies & Tracking */}
                <section
                  id="cookies-tracking"
                  ref={(el) => { sectionRefs.current['cookies-tracking'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Cookies & Tracking</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      We use first-party cookies and local storage to keep you signed in, remember preferences, and understand how the product performs.
                      You can control cookies through your browser settings, though disabling them may limit core functionality.
                    </p>
                    
                    <div>
                      <strong className="font-medium text-black dark:text-white">Google Analytics:</strong> We use Google Analytics (Measurement ID: G-ZLGK6QXD88) to collect information about how visitors use our website. This includes:
                      <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>Page views and navigation patterns</li>
                        <li>Time spent on pages</li>
                        <li>User interactions (clicks, scrolls, etc.)</li>
                        <li>Device and browser information</li>
                        <li>General geographic location (country/city level)</li>
                      </ul>
                      <p className="mt-2">
                        This data is collected anonymously and aggregated to help us understand website usage trends and improve user experience. 
                        Google Analytics uses cookies and may collect information according to Google&apos;s Privacy Policy. 
                        You can manage your cookie preferences at any time by clicking <button onClick={openCookieSettings} className="underline hover:text-black dark:hover:text-white transition-colors">Cookie Settings</button> in the footer, 
                        or by installing the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="underline hover:text-black dark:hover:text-white transition-colors">Google Analytics Opt-out Browser Add-on</a>.
                      </p>
                    </div>

                    <div className="mt-4">
                      <strong className="font-medium text-black dark:text-white">Google Signals Data Collection:</strong> We have enabled Google Signals, which allows Google Analytics to collect additional data about your traffic. When Google Signals is active, Google Analytics may:
                      <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>Associate your visitation information with Google&apos;s information from accounts of signed-in users who have consented to ads personalization</li>
                        <li>Collect data including end-user location, search history, YouTube history, and data from sites that partner with Google</li>
                        <li>Provide additional insights about users and enable audience sharing capabilities</li>
                      </ul>
                      <p className="mt-2">
                        This data collection is used to provide enhanced analytics features and is subject to Google&apos;s Advertising Features Policy. 
                        You can control this data collection through your Google account settings or by disabling analytics cookies in our Cookie Settings.
                      </p>
                    </div>

                    <div className="mt-4">
                      <strong className="font-medium text-black dark:text-white">User-ID and User-Provided Data Collection:</strong> We may use Google Analytics User-ID and user-provided data features to:
                      <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>Connect user behavior across different sessions and devices</li>
                        <li>Provide more accurate user counts and a holistic view of user interactions</li>
                        <li>Improve conversion measurement and audience sharing capabilities</li>
                        <li>Supplement analytics data with consented, hashed customer data in a privacy-safe way</li>
                      </ul>
                      <p className="mt-2">
                        We do not send personally identifiable information as User-ID. Any user-provided data is hashed and processed in accordance with Google Analytics policies. 
                        This feature requires appropriate privacy disclosures, which are provided in this Privacy Policy.
                      </p>
                    </div>

                    <div className="mt-4">
                      <strong className="font-medium text-black dark:text-white">Granular Location and Device Data Collection:</strong> We collect granular location and device metadata to:
                      <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>Collect city-level location information (in addition to country/region data collected by default)</li>
                        <li>Collect detailed device information to provide location and device-based capabilities</li>
                        <li>Support regional privacy policies and region-based Analytics settings</li>
                      </ul>
                      <p className="mt-2">
                        Region and country-level metadata is collected by default for all traffic. City-level and device details are collected when you consent to analytics cookies.
                      </p>
                    </div>

                    <div className="mt-4">
                      <strong className="font-medium text-black dark:text-white">Ads Personalization:</strong> When ads personalization is enabled, we may:
                      <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>Export Google Analytics audiences and key events to linked advertising accounts</li>
                        <li>Use data collected through Google Signals, User ID, and ads integrations for personalized advertising experiences</li>
                        <li>Share data with Google for ads personalization purposes in connection with enabled features</li>
                      </ul>
                      <p className="mt-2">
                        Ads personalization is optional and can be controlled through your cookie preferences. 
                        Disabling ads personalization means that shared audience lists are marked as inactive and no new users will be shared via audience lists.
                      </p>
                    </div>

                    <div className="mt-4">
                      <strong className="font-medium text-black dark:text-white">Consent Signals:</strong> We use Google Analytics consent signals to respect your privacy preferences:
                      <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li><strong>Behavioral Analytics Consent (analytics_storage):</strong> Controls whether cookie data can be collected for behavioral analytics purposes, including audience measurement and behavioral modeling.</li>
                        <li><strong>Ads Cookie Consent (ad_storage):</strong> Controls whether cookie data can be collected for advertising purposes, including ads measurement, demographics & interest insights, and audience remarketing.</li>
                        <li><strong>Ads Measurement Consent (ad_user_data):</strong> Controls whether user data can be collected for advertising and ads measurement purposes, including conversion export, ads measurement, and audience remarketing.</li>
                        <li><strong>Ads Personalization Consent (ad_personalization):</strong> Controls whether the user can be included in audiences exported to linked ads accounts for audience remarketing.</li>
                      </ul>
                      <p className="mt-2">
                        All consent signals default to &ldquo;denied&rdquo; until you explicitly grant consent through our Cookie Settings. 
                        You can manage these preferences at any time by clicking <button onClick={openCookieSettings} className="underline hover:text-black dark:hover:text-white transition-colors">Cookie Settings</button> in the footer.
                      </p>
                    </div>

                    <p>
                      <strong className="font-medium text-black dark:text-white">Google Places Autocomplete:</strong> When you use our trip planning feature to search for and add locations,
                      we use Google Places Autocomplete to provide location suggestions. We track anonymized analytics about which places
                      are selected through this feature (including place ID, place name, place types) to improve our service and understand
                      user preferences. This data is sent to Google Analytics and helps us enhance the trip planning experience.
                      No personally identifiable information is included in this tracking.
                    </p>
                  </div>
                </section>

                {/* Location Data */}
                <section
                  id="location-data"
                  ref={(el) => { sectionRefs.current['location-data'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Location Data</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      If you allow location permissions, we use your approximate device location to show nearby destinations and tailor suggestions.
                      Location data stays on our servers long enough to return relevant results and is not stored with your profile unless you save a place.
                      You can disable sharing by turning off location access in your device or browser settings at any time.
                    </p>
                  </div>
                </section>

                {/* Data Retention */}
                <section
                  id="data-retention"
                  ref={(el) => { sectionRefs.current['data-retention'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Data Retention</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      We retain account data while your profile remains active so that your saved places, trips, and history stay available across devices.
                      If you delete specific content, it is removed from active systems immediately and from encrypted backups within 30 days.
                    </p>
                    <p>
                      If you request full account deletion, we purge your saved data and Supabase authentication record as soon as the queued job finishes.
                      Logs referencing your email are minimized to the extent needed for security and audit obligations.
                    </p>
                  </div>
                </section>

                {/* Data Export & Deletion Requests */}
                <section
                  id="data-export-deletion"
                  ref={(el) => { sectionRefs.current['data-export-deletion'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Data Export & Deletion Requests</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      You can manage your data from <strong className="font-medium text-black dark:text-white">Account → Settings</strong>. Every request is logged in Supabase, processed by our background worker,
                      and confirmed via email.
                    </p>
                    <ul className="space-y-2 ml-4">
                      <li className="list-disc">
                        <strong className="font-medium text-black dark:text-white">Export:</strong> We compile your profile, saved/visited places, collections, trips, and interactions, then email a secure download link—typically within 24 hours.
                      </li>
                      <li className="list-disc">
                        <strong className="font-medium text-black dark:text-white">Deletion:</strong> We permanently remove your account, purge saved content, and delete the associated Supabase auth record. This action cannot be undone.
                      </li>
                      <li className="list-disc">
                        <strong className="font-medium text-black dark:text-white">Support:</strong> If you do not receive confirmation within 72 hours, contact <a className="underline hover:text-black dark:hover:text-white transition-colors" href="mailto:privacy@urbanmanual.co">privacy@urbanmanual.co</a> with your account email.
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Your Rights & Choices */}
                <section
                  id="your-rights"
                  ref={(el) => { sectionRefs.current['your-rights'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Your Rights & Choices</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <ul className="space-y-2 ml-4">
                      <li className="list-disc">Access, correct, or update your profile information directly within your account.</li>
                      <li className="list-disc">Request a copy of your data or deletion of your account as described above.</li>
                      <li className="list-disc">Opt out of marketing emails by using the unsubscribe link or adjusting notification settings.</li>
                      <li className="list-disc">Disable cookies or location services at the device level.</li>
                    </ul>
                  </div>
                </section>

                {/* Security */}
                <section
                  id="security"
                  ref={(el) => { sectionRefs.current['security'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Security</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      We secure your information using HTTPS encryption, encrypted storage provided by Supabase, role-based access controls, and continuous monitoring.
                      While no online service can guarantee absolute security, we regularly review safeguards and limit data access to team members who need it.
                    </p>
                  </div>
                </section>

                {/* Children */}
                <section
                  id="children"
                  ref={(el) => { sectionRefs.current['children'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Children</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      The Urban Manual is not directed to children under 16, and we do not knowingly collect personal information from them.
                      If you believe we have done so, please contact us so we can delete the information.
                    </p>
                  </div>
                </section>

                {/* Contact Us */}
                <section
                  id="contact"
                  ref={(el) => { sectionRefs.current['contact'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Contact Us</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      Questions or concerns about this Privacy Policy can be sent to <a className="underline hover:text-black dark:hover:text-white transition-colors" href="mailto:privacy@urbanmanual.co">privacy@urbanmanual.co</a>.
                    </p>
                  </div>
                </section>

                {/* Last Updated */}
                <div className="pt-12">
                  <p className="text-xs text-gray-400 dark:text-gray-500 tracking-wide">
                    Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
