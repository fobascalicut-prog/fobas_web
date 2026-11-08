'use strict';
const KEY = () => process.env.RESEND_API_KEY || '';
const FROM = () => process.env.MAIL_FROM || 'Fobas Website <onboarding@resend.dev>';
const mailConfigured = () => Boolean(KEY());

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));

async function sendMail({ to, subject, text, html, replyTo }) {
  if (!mailConfigured()) return { ok: false, error: 'RESEND_API_KEY is not set' };
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) return { ok: false, error: 'No recipient email configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM(), to: recipients, subject, text, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      console.error('Resend error', res.status, body);
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (e) {
    console.error('Resend request failed:', e.message);
    return { ok: false, error: e.message };
  }
}

function enquiryEmail(row) {
  const line = (k, v) => `<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top">${k}</td><td style="padding:6px 0;color:#111"><b>${esc(v) || '-'}</b></td></tr>`;
  return {
    subject: `New enquiry from ${row.name}${row.course ? ' - ' + row.course : ''}`,
    text: `New website enquiry\n\nName: ${row.name}\nPhone: ${row.phone}\nEmail: ${row.email}\nCourse: ${row.course || '-'}\n\nMessage:\n${row.message || '-'}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
      <div style="background:#ff5b14;color:#0a0c14;padding:16px 22px;font-size:18px"><b>New website enquiry</b></div>
      <div style="padding:20px 22px"><table style="font-size:15px;border-collapse:collapse">
        ${line('Name', row.name)}${line('Phone', row.phone)}${line('Email', row.email)}${line('Course', row.course)}
      </table>
      <p style="margin:18px 0 6px;color:#666">Message</p>
      <div style="background:#f6f6f6;border-radius:8px;padding:12px 14px;white-space:pre-wrap;color:#111">${esc(row.message) || '-'}</div>
      <p style="margin:20px 0 0"><a href="tel:${esc(row.phone)}" style="color:#ff5b14">Call</a> &nbsp;|&nbsp; <a href="mailto:${esc(row.email)}" style="color:#ff5b14">Reply by email</a></p></div></div>`,
  };
}

module.exports = { sendMail, mailConfigured, enquiryEmail, esc };
