const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_EMAIL = process.env.TARGET_EMAIL || 'contact@cashless.africa';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Local leads backup file path
const LEADS_FILE = path.join(__dirname, 'leads.json');

// Ensure leads file exists
if (!fs.existsSync(LEADS_FILE)) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2), 'utf8');
}

const { Resend } = require('resend');

// Resend Configuration
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Nodemailer Transporter configuration (fallback)
let transporter;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

if (resend) {
  console.log('⚡ Envoi e-mail configuré avec Resend API');
} else if (transporter) {
  console.log('📧 Envoi e-mail configuré avec Nodemailer (SMTP)');
} else {
  console.log('⚠️ Note: Ni RESEND_API_KEY ni SMTP_HOST renseignés dans .env. Les leads seront sauvegardés dans leads.json.');
}

// Route API d'envoi du formulaire
app.post('/api/contact', async (req, res) => {
  try {
    const { fullName, email, phone, company, teamSize, message } = req.body;

    if (!fullName || !email || !phone || !company) {
      return res.status(400).json({ 
        success: false, 
        message: 'Champs obligatoires manquants (fullName, email, phone, company sont requis).' 
      });
    }

    const leadEntry = {
      id: Date.now().toString(),
      fullName,
      email,
      phone,
      company,
      teamSize: teamSize || 'Non renseigné',
      message: message || 'Aucun message',
      createdAt: new Date().toISOString()
    };

    // 1. Save lead to local JSON file backup
    try {
      const existingLeads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
      existingLeads.push(leadEntry);
      fs.writeFileSync(LEADS_FILE, JSON.stringify(existingLeads, null, 2), 'utf8');
      console.log(`✅ Nouveau lead sauvegardé dans leads.json : ${company} (${fullName})`);
    } catch (fsErr) {
      console.error('Erreur sauvegarde leads.json:', fsErr);
    }

    const emailSubject = `🎯 [Nouveau Lead Événement] ${company} - ${fullName}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #2a7eff;">
          <h2 style="color: #2a7eff; margin: 0; font-size: 24px;">Cashless<span style="color: #0f172a;">Flo</span></h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Notification de Lead Événement</p>
        </div>
        
        <div style="padding: 20px 0;">
          <h3 style="color: #0f172a; margin-top: 0;">Coordonnées du prospect :</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold; width: 140px;">Nom & Prénom :</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">E-mail :</td>
              <td style="padding: 8px 0; color: #2a7eff;"><a href="mailto:${email}" style="color: #2a7eff; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Téléphone :</td>
              <td style="padding: 8px 0; color: #0f172a;"><a href="tel:${phone}" style="color: #0f172a; text-decoration: none;">${phone}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Entreprise :</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${company}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Taille équipe :</td>
              <td style="padding: 8px 0; color: #0f172a;">${teamSize || 'Non renseigné'}</td>
            </tr>
          </table>

          <div style="margin-top: 16px; padding: 14px; background-color: #f8f9fc; border-radius: 8px; border-left: 4px solid #2a7eff;">
            <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Message / Note :</strong>
            <p style="color: #334155; margin: 0; white-space: pre-wrap;">${message || 'Aucun message particulier'}</p>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
          E-mail généré automatiquement par la landing page Événement Cashless Flo.
        </div>
      </div>
    `;

    // 2. Send email notification (Resend API or Nodemailer SMTP fallback)
    if (resend) {
      try {
        const fromEmail = process.env.RESEND_FROM || 'Cashless Flo <onboarding@resend.dev>';
        await resend.emails.send({
          from: fromEmail,
          to: [TARGET_EMAIL],
          subject: emailSubject,
          html: emailHtml
        });
        console.log(`⚡ E-mail envoyé avec succès via Resend API à ${TARGET_EMAIL}`);
      } catch (resendError) {
        console.error('Erreur lors de l\'envoi Resend:', resendError);
      }
    } else if (transporter) {
      const mailOptions = {
        from: `"Cashless Flo Événement" <${process.env.SMTP_USER || 'no-reply@cashless.africa'}>`,
        to: TARGET_EMAIL,
        subject: emailSubject,
        html: emailHtml
      };
      await transporter.sendMail(mailOptions);
      console.log(`📧 E-mail envoyé avec succès via SMTP à ${TARGET_EMAIL}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Votre message a bien été envoyé et enregistré.',
      data: leadEntry
    });

  } catch (error) {
    console.error('Erreur traitement contact:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue sur le serveur.'
    });
  }
});

// Route de consultation des leads enregistrés
app.get('/api/leads', (req, res) => {
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    res.json({ success: true, count: leads.length, leads });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur lecture des leads.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur Cashless Flo Événement démarré sur http://localhost:${PORT}`);
  console.log(`📧 E-mails configurés pour : ${TARGET_EMAIL}`);
});
