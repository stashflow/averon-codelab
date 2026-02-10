import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TermsOfService() {
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
            <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
            <p className="text-white/60">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Acceptance of Terms</h2>
              <p className="text-white/70 leading-relaxed">
                By accessing or using Averon CodeLab, you agree to be bound by these Terms of Service and our Privacy Policy. If you are under 18 or the age of majority in your jurisdiction, you must have your parent, guardian, or school's permission to use this service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Description of Service</h2>
              <p className="text-white/70 leading-relaxed">
                Averon CodeLab provides an online educational platform for teaching and learning computer programming. The service includes interactive coding exercises, automated grading, progress tracking, classroom management tools, and curriculum materials.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Account Types and Roles</h2>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-white/90">Students</h3>
                <p className="text-white/70 leading-relaxed">
                  Students can enroll in classes, complete assignments, track progress, and access course materials assigned by their teachers.
                </p>
                
                <h3 className="text-xl font-semibold text-white/90">Teachers</h3>
                <p className="text-white/70 leading-relaxed">
                  Teachers can create classes, assign coding exercises, grade submissions, track student progress, and manage classroom settings. Teachers must be assigned to a school.
                </p>

                <h3 className="text-xl font-semibold text-white/90">District Admins</h3>
                <p className="text-white/70 leading-relaxed">
                  District administrators can manage multiple schools, approve class creation, manage teacher accounts, and access district-wide analytics.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Permitted Use</h2>
              <p className="text-white/70 leading-relaxed">You agree to use Averon CodeLab solely for educational purposes. You must:</p>
              <ul className="space-y-2 text-white/70">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>Provide accurate information when creating an account</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>Maintain the confidentiality of your account credentials</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>Use the platform in compliance with all applicable laws</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>Respect intellectual property rights</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                  <span>Not share your account with others</span>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Student Data Ownership</h2>
              <p className="text-white/70 leading-relaxed">
                Student educational records and data belong to the student and their educational institution. We act as a service provider and do not claim ownership of student work or data. Schools and districts retain the right to export or delete student data at any time.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Intellectual Property</h2>
              <p className="text-white/70 leading-relaxed">
                The Averon CodeLab platform, including its design, functionality, and content, is owned by Averon CodeLab and protected by intellectual property laws. Course materials and assignments created by teachers remain the property of the teacher or their employing institution. Student code submissions remain the property of the student.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Acceptable Use</h2>
              <p className="text-white/70 leading-relaxed">You agree NOT to:</p>
              <ul className="space-y-2 text-white/70">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                  <span>Harass, threaten, or harm other users</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                  <span>Submit malicious code or attempt to compromise platform security</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                  <span>Share or distribute inappropriate content</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                  <span>Attempt to access accounts or data you are not authorized to view</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                  <span>Use the platform for commercial purposes without authorization</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                  <span>Plagiarize or submit another student's work as your own</span>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Fees and Billing</h2>
              <p className="text-white/70 leading-relaxed">
                Full platform access requires a school or district subscription. Pricing is based on per-teacher licensing or district-wide agreements. Schools and districts are billed according to their selected plan. Payment terms are specified in separate agreements with educational institutions.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Termination</h2>
              <p className="text-white/70 leading-relaxed">
                We reserve the right to suspend or terminate accounts that violate these Terms of Service. You may terminate your account at any time by contacting support. Upon termination, you lose access to the platform and your data may be deleted according to our retention policies.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Disclaimers</h2>
              <p className="text-white/70 leading-relaxed">
                Averon CodeLab is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service or error-free operation. While we strive for accuracy in automated grading, teachers should review all grades. We are not responsible for content created by users.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Limitation of Liability</h2>
              <p className="text-white/70 leading-relaxed">
                To the maximum extent permitted by law, Averon CodeLab shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Governing Law</h2>
              <p className="text-white/70 leading-relaxed">
                These Terms shall be governed by the laws of the jurisdiction in which Averon CodeLab operates, without regard to conflict of law provisions.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Changes to Terms</h2>
              <p className="text-white/70 leading-relaxed">
                We reserve the right to modify these Terms of Service at any time. Users will be notified of significant changes via email or platform notification. Continued use after changes constitutes acceptance of the updated terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Contact Information</h2>
              <p className="text-white/70 leading-relaxed">
                For questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-2">
                <p className="text-white/90">
                  <strong>Email:</strong> legal@averoncodelab.com
                </p>
                <p className="text-white/90">
                  <strong>Support:</strong> support@averoncodelab.com
                </p>
                <p className="text-white/90">
                  <strong>Address:</strong> Averon CodeLab Legal Team
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
