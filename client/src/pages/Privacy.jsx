import LegalPage, { contact, operator } from './LegalPage.jsx';
import useTitle from '../hooks/useTitle.js';

export default function Privacy() {
  useTitle('Privacy Policy');
  return (
    <LegalPage title="Privacy Policy">
      <p>VYLOC is operated by {operator()} ("we"). This policy explains what personal data VYLOC collects, why, who else handles it, and what choices you have. You can contact us at {contact()}.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your name, your email address and your password. The password is stored only as a salted hash and cannot be read by us.</li>
        <li><strong>Monitoring data you add:</strong> monitor names, the addresses, hostnames and ports you ask us to check, and your settings.</li>
        <li><strong>Check results:</strong> for each check, the time, whether it passed, the response time, the HTTP status code and any error message. These are kept for 30 days.</li>
        <li><strong>Incident records:</strong> when a monitor went down and recovered, and the reason. These are kept for 90 days.</li>
        <li><strong>Sign-up confirmation:</strong> a one-time confirmation code, stored only as a hash. Accounts that are not confirmed within 7 days are deleted automatically.</li>
        <li><strong>Technical data:</strong> our hosting providers may record IP addresses and request details in server logs, and we use IP addresses to limit abuse.</li>
      </ul>
      <p>VYLOC does not use advertising trackers or analytics services. After you sign in, your browser keeps a sign-in token in local storage so you stay signed in. VYLOC does not set tracking cookies.</p>

      <h2>How we use it</h2>
      <p>We use your data to run the service: to perform the checks you ask for, show you the results, and send you emails (account confirmation, a welcome message, and alerts when your monitors go down or recover). We also use it to keep the service secure and to prevent abuse. We do not sell your data.</p>

      <h2>Who else handles your data</h2>
      <p>To run VYLOC we use these providers, who process data on our behalf: MongoDB Atlas (database), Render (API hosting), Vercel (website hosting), Brevo (sending email) and GitHub (the scheduled job that runs checks). Some of these providers store or process data outside Kenya.</p>

      <h2>Public status pages</h2>
      <p>If you turn on a public status page and mark monitors as public, anyone with the link can see each of those monitors' name, type, current status, 30 day uptime and the time of the last check. Addresses, error messages and incident details are never shown on the public page.</p>

      <h2>How long we keep data</h2>
      <p>Check results are deleted after 30 days and incident records after 90 days. When you delete a monitor, its check results and incidents are deleted straight away. Account data is kept until you ask us to delete your account.</p>

      <h2>Your rights</h2>
      <p>Under the Data Protection Act, 2019 of Kenya you have rights that include being told how your data is used, accessing your data, asking us to correct it, asking us to delete it, and objecting to how it is processed. To use any of these rights, or to have your account deleted, email {contact()}. You can also complain to the Office of the Data Protection Commissioner in Kenya.</p>

      <h2>Security</h2>
      <p>Passwords are hashed, traffic between your browser and VYLOC is encrypted with HTTPS, and requests to the service are rate limited. No online service can promise perfect security, so please use a strong password that you do not use anywhere else.</p>

      <h2>Children</h2>
      <p>VYLOC is not intended for anyone under 18.</p>

      <h2>Changes to this policy</h2>
      <p>If we change this policy in a way that matters, we will update the date at the top of this page and, where the change is significant, tell account holders by email.</p>
    </LegalPage>
  );
}
