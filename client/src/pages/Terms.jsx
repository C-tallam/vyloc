import LegalPage, { contact, operator } from './LegalPage.jsx';
import useTitle from '../hooks/useTitle.js';

export default function Terms() {
  useTitle('Terms');
  return (
    <LegalPage title="Terms of Service">
      <p>These terms govern your use of VYLOC, operated by {operator()} ("we"). By creating an account or using VYLOC you agree to them. If you do not agree, do not use the service. Questions can be sent to {contact()}.</p>

      <h2>The service</h2>
      <p>VYLOC runs scheduled checks (HTTP or HTTPS requests, TCP connections and DNS lookups) against addresses you provide, records the results, and can email you when a monitor goes down or recovers. Checks run on a best effort schedule and can be delayed or missed. Results and alerts can be wrong or late, for example because of problems on our side, on the network, or at the target.</p>

      <h2>Your account</h2>
      <p>You must give accurate information, keep your password secret, and are responsible for what happens under your account. You must use a real email address that you control.</p>

      <h2>Acceptable use</h2>
      <p>You may only add addresses that you own or have clear permission to check. You must not use VYLOC to:</p>
      <ul>
        <li>scan, probe or attack systems you do not have permission to test;</li>
        <li>try to reach private, internal or local networks, or get around the limits we put in place to prevent that;</li>
        <li>send excessive traffic to any target, or work around the limits on monitors and check frequency;</li>
        <li>break the law, or interfere with the service or other users.</li>
      </ul>
      <p>We may remove monitors, suspend or delete accounts, or block access if we believe these rules are broken, and we may do so without notice if needed to protect the service or others.</p>

      <h2>Not for critical use</h2>
      <p>VYLOC is a monitoring aid. Do not rely on it as your only way of detecting problems in systems where an outage could harm people or cause serious loss.</p>

      <h2>Availability and changes</h2>
      <p>The service is provided as it is. It may be unavailable at times, and we may change, limit or stop features, or end the service, with or without notice. We may change these terms; the date at the top shows the latest version, and continuing to use VYLOC means you accept the updated terms.</p>

      <h2>Your data</h2>
      <p>You keep your rights to the data you add. You give us permission to process it only as needed to run the service, as described in the <a href="/privacy">Privacy Policy</a>.</p>

      <h2>Limits on our responsibility</h2>
      <p>To the extent the law allows, we give no warranty that the service will be accurate, uninterrupted or error free, and we are not liable for losses that result from using it or being unable to use it, including missed or late alerts. Nothing in these terms limits any right you have under law that cannot be limited.</p>

      <h2>Ending your use</h2>
      <p>You can stop using VYLOC at any time. To have your account deleted, email {contact()}. We may end your access as described under acceptable use.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of Kenya.</p>
    </LegalPage>
  );
}
