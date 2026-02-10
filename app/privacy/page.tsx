import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/">
          <Button variant="ghost" className="gap-2 text-white/60 hover:text-white mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
            <p className="text-white/60">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Overview</h2>
              <p className="text-white/70 leading-relaxed">
                Averon CodeLab ("we", "our", or "us") is committed to protecting the privacy of students, teachers, and educational institutions. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our educational coding platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Information We Collect</h2>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-white/90">Account Information</h3>
                <p className="text-white/70 leading-relaxed">
                  When you create an account, we collect your name, email address, role (student/teacher), and school or district affiliation.
                </p>
                
                <h3 className="text-xl font-semibold text-white/90">Educational Data</h3>
                <p className="text-white/70 leading-relaxed">
                  We collect information related to your use of the platform, including assignments submitted, code written, grades received, progress tracking, lesson completion, and performance analytics.
                </p>

                <h3 className="text-xl font-semibold text-white/90">Technical Information</h3>
                <p className="text-white/70 leading-relaxed">
                  We automatically collect certain information about your device, including IP address, browser type, and usage patterns to improve our service.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">How We Use Information</h2>
              <ul className="space-y-2 text-white/70">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>To provide and improve our educational services</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>To track student progress and generate performance reports</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>To enable teachers to manage classrooms and assignments</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>To communicate important updates and support</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>To ensure platform security and prevent misuse</span>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Student Data & FERPA Compliance</h2>
              <p className="text-white/70 leading-relaxed">
                We comply with the Family Educational Rights and Privacy Act (FERPA) and act as a "school official" with legitimate educational interests when providing services to educational institutions. Student educational records are only shared with authorized school personnel and are not disclosed to third parties without consent or legal authorization.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">COPPA Compliance</h2>
              <p className="text-white/70 leading-relaxed">
                For students under 13 years of age, we require schools or parents to provide verifiable consent before collecting personal information. We do not knowingly collect personal information from children under 13 without appropriate consent.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Data Sharing</h2>
              <p className="text-white/70 leading-relaxed">
                We do not sell, rent, or share student personal information with third parties for marketing purposes. We may share information with:
              </p>
              <ul className="space-y-2 text-white/70">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>Authorized school and district personnel</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>Service providers who assist in platform operations (under strict confidentiality agreements)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>Law enforcement when required by law</span>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Data Security</h2>
              <p className="text-white/70 leading-relaxed">
                We implement industry-standard security measures to protect your information, including encryption, secure authentication, regular security audits, access controls and monitoring, and secure data storage infrastructure.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Data Retention</h2>
              <p className="text-white/70 leading-relaxed">
                We retain student data only as long as necessary to provide services or as required by law. Schools and districts can request deletion of student data at any time. Upon account deletion, personal information is removed within 30 days.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Rights of Schools and Districts</h2>
              <p className="text-white/70 leading-relaxed">
                Educational institutions have the right to review student data, request corrections or deletions, export data for their records, control student privacy settings, and terminate services and request data removal.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Changes to This Policy</h2>
              <p className="text-white/70 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify users of significant changes via email or platform notification. Continued use after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Contact Information</h2>
              <p className="text-white/70 leading-relaxed">
                For questions about this Privacy Policy or to exercise your privacy rights, please contact us at:
              </p>
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-2">
                <p className="text-white/90">
                  <strong>Email:</strong> privacy@averoncodelab.com
                </p>
                <p className="text-white/90">
                  <strong>Address:</strong> Averon CodeLab Privacy Team
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
