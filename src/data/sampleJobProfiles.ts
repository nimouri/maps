export interface JobPreset {
  id: string;
  title: string;
  category: 'Healthcare & Care' | 'IT & Software' | 'Technical & Engineering' | 'Commercial & Office' | 'Crafts & Trades';
  defaultJobType: 'ausbildung' | 'fulltime' | 'parttime';
  queryTerms: string[];
  suggestedIndustries: string[];
  description: string;
  germanTranslation: string;
}

export const JOB_PRESETS: JobPreset[] = [
  {
    id: 'pflegefachkraft',
    title: 'Pflegefachkraft (Ausbildung & Jobs)',
    category: 'Healthcare & Care',
    defaultJobType: 'ausbildung',
    queryTerms: ['Pflegefachmann', 'Pflegefachfrau', 'Altenpflege', 'Krankenpflege', 'Pflegedienst', 'Klinikum'],
    suggestedIndustries: ['Krankenhaus', 'Seniorenresidenz', 'Pflegedienst', 'Altenheim', 'Klinik'],
    description: 'Vocational training & certified nursing specialist in clinics, nursing homes, and outpatient services.',
    germanTranslation: 'Generalistische Pflegefachkraft / Pflegeausbildung'
  },
  {
    id: 'it-first-level',
    title: '1st Level IT Support / Helpdesk',
    category: 'IT & Software',
    defaultJobType: 'fulltime',
    queryTerms: ['1st Level Support', 'IT Support Specialist', 'Fachinformatiker Systemintegration', 'Service Desk', 'IT Helpdesk'],
    suggestedIndustries: ['Systemhaus', 'IT-Dienstleister', 'Softwareunternehmen', 'Corporate IT'],
    description: 'First response technical IT customer & internal support, hardware/software troubleshooting and ticketing.',
    germanTranslation: 'IT-First-Level-Support & Technischer Helpdesk'
  },
  {
    id: 'fachinformatiker',
    title: 'Ausbildung Fachinformatiker (Systemintegration / Anwendungsentwicklung)',
    category: 'IT & Software',
    defaultJobType: 'ausbildung',
    queryTerms: ['Fachinformatiker Systemintegration', 'Fachinformatiker Anwendungsentwicklung', 'IT Ausbildung', 'Junior IT Administrator'],
    suggestedIndustries: ['IT Systemhaus', 'Cloud Provider', 'Software Agency', 'Telekommunikation'],
    description: 'Recognized 3-year dual IT vocational training in networks, systems, infrastructure, or code.',
    germanTranslation: 'Ausbildung zum Fachinformatiker'
  },
  {
    id: 'mechatroniker',
    title: 'Mechatroniker / Industriemechaniker',
    category: 'Technical & Engineering',
    defaultJobType: 'ausbildung',
    queryTerms: ['Mechatroniker', 'Industriemechaniker', 'Instandhalter', 'Servicetechniker'],
    suggestedIndustries: ['Maschinenbau', 'Automobilzulieferer', 'Elektrotechnik', 'Fertigung'],
    description: 'Maintenance, installation, and mechanics of automated industrial and electronic machinery.',
    germanTranslation: 'Mechatroniker / Industriemechaniker'
  },
  {
    id: 'bueromanagement',
    title: 'Kaufmann/-frau für Büromanagement',
    category: 'Commercial & Office',
    defaultJobType: 'ausbildung',
    queryTerms: ['Kaufmann Büromanagement', 'Bürokraft', 'Office Manager', 'Sachbearbeiter'],
    suggestedIndustries: ['Verwaltung', 'Kanzlei', 'Dienstleistungsunternehmen', 'Großhandel'],
    description: 'Office administration, scheduling, business communications, and financial administration.',
    germanTranslation: 'Kaufmann / Kauffrau für Büromanagement'
  },
  {
    id: 'elektroniker',
    title: 'Elektroniker für Betriebstechnik / Gebäude',
    category: 'Crafts & Trades',
    defaultJobType: 'ausbildung',
    queryTerms: ['Elektroniker Energie- und Gebäudetechnik', 'Elektroinstallateur', 'Betriebstechnik'],
    suggestedIndustries: ['Elektrohandwerk', 'Industriebetriebe', 'Facility Management'],
    description: 'Electrical installations, smart building automation, and high-voltage grid wiring.',
    germanTranslation: 'Elektroniker für Energie- und Gebäudetechnik'
  }
];

export const COLD_EMAIL_TEMPLATES = {
  ausbildung_de: (companyName: string, roleTitle: string, city: string) => `Sehr geehrte Damen und Herren des HR-Teams von ${companyName},

mit großem Interesse verfolge ich das Engagement und die Entwicklung Ihres Unternehmens in ${city}. 

Hiermit bewerbe ich mich bei Ihnen initiativ um einen Ausbildungsplatz im Bereich „${roleTitle}“. Durch meine hohe Lernbereitschaft, Zuverlässigkeit und Begeisterung für diesen Berufsbereich bin ich überzeugt, Ihr Team optimal zu ergänzen.

Im Anhang finden Sie mein vollständiges Bewerbungsprofil, mein Anschreiben sowie meine Zeugnisse. Ich freue mich sehr über die Möglichkeit eines persönlichen Vorstellungsgesprächs oder Probearbeitstages.

Mit freundlichen Grüßen,
[Ihr Vorname Nachname]
[Ihre Telefonnummer]
[Ihre E-Mail-Adresse]`,

  job_de: (companyName: string, roleTitle: string, city: string) => `Sehr geehrte Damen und Herren,
liebes Recruiting-Team von ${companyName},

auf der Suche nach neuen beruflichen Herausforderungen in ${city} ist mir ${companyName} durch Ihre exzellente Reputation aufgefallen.

Ich möchte mich Ihnen gerne als motivierter Kandidat für eine Position als „${roleTitle}“ vorstellen. Ich bringe fundierte praktische Kenntnisse, eine ausgeprägte Kunden- und Lösungsorientierung sowie Teamgeist mit.

Sehr gerne stehe ich Ihnen für ein persönliches Kennenlernen oder ein kurzes Telefonat zur Verfügung. Meine vollständigen Bewerbungsunterlagen habe ich dieser Nachricht beigefügt.

Beste Grüße,
[Ihr Vorname Nachname]
[Ihre Telefonnummer]
[Ihre E-Mail-Adresse]`,

  job_en: (companyName: string, roleTitle: string, city: string) => `Dear Hiring & Career Team at ${companyName},

I am writing to express my strong enthusiasm and interest in joining ${companyName} in ${city} as a ${roleTitle}.

With dedicated hands-on experience, problem-solving skills, and a proactive mindset, I am confident I would be a great addition to your department. 

Attached please find my resume, references, and credentials for your review. I would welcome the opportunity to discuss how my background can support your goals.

Best regards,
[Your Name]
[Your Phone Number]
[Your Email]`
};
