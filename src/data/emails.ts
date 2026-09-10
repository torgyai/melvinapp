import type { Email, Note } from '@/lib/types';

export const SEED_EMAILS: Email[] = [
  {
    id: 'e1', from: 'Bouke Terpstra', fromEmail: 'bouke.terpstra@gmail.com',
    subject: 'Vraag over indicatie Fonteinstraat', date: '09-09-2026 09:14',
    category: 'aanvraag', assignedTo: 'sanne', answered: false, read: false,
    body: 'Goedemiddag,\n\nIk heb via de website een indicatie aangevraagd voor mijn woning aan de Fonteinstraat. Kunt u aangeven wanneer een adviseur langs kan komen voor de officiële meting?\n\nMet vriendelijke groet,\nBouke Terpstra',
  },
  {
    id: 'e2', from: 'Ilse Bakker', fromEmail: 'ilse.bakker@outlook.com',
    subject: 'Vraag over zonnepanelen en het energielabel', date: '08-09-2026 16:47',
    category: 'aanvraag', assignedTo: 'bram', answered: false, read: false,
    body: 'Hallo,\n\nWij overwegen zonnepanelen te laten plaatsen en zijn benieuwd wat dit doet met ons energielabel. Kunnen jullie dit meenemen in de opname die al gepland staat?\n\nGroet,\nIlse Bakker',
  },
  {
    id: 'e3', from: 'Melvin Krikke', fromEmail: 'melvin@krikjeenergielabelop.nl',
    subject: 'Planning volgende week', date: '08-09-2026 11:02',
    category: 'intern', assignedTo: 'femke', answered: true, read: true,
    body: 'Hoi Femke,\n\nKun je even checken of je planning voor volgende week klopt met de opnames die al klaarstaan? Er komen nog twee panden bij vanuit de website.\n\nGroet,\nMelvin',
  },
  {
    id: 'e4', from: 'Vabi Support', fromEmail: 'support@vabi.nl',
    subject: 'Onderhoud NTA 8800-rekenmodule, zondag 13 sep', date: '07-09-2026 08:30',
    category: 'systeem', assignedTo: null, answered: true, read: true,
    body: 'Beste gebruiker,\n\nOp zondag 13 september voeren wij tussen 02:00 en 06:00 onderhoud uit aan de rekenmodule. In deze periode kan de labelberekening tijdelijk niet beschikbaar zijn.\n\nMet vriendelijke groet,\nVabi Support',
  },
  {
    id: 'e5', from: 'Ruben Postma', fromEmail: 'ruben@krikjeenergielabelop.nl',
    subject: 'Foto voorgevel niet scherp, Skoallestrjitte', date: '09-09-2026 08:05',
    category: 'intern', assignedTo: 'ruben', answered: false, read: false,
    body: 'Hoi team,\n\nDe foto van de voorgevel bij Skoallestrjitte is wat onscherp geworden. Ik plan een nieuwe opname in, maar wilde het even gemeld hebben voor het dossier.\n\nGroet,\nRuben',
  },
  {
    id: 'e6', from: 'Sietske de Boer', fromEmail: 'sietske.deboer@gmail.com',
    subject: 'Offerte aanvraag na indicatie label D', date: '09-09-2026 07:41',
    category: 'aanvraag', assignedTo: 'ruben', answered: false, read: false,
    body: 'Beste Krik je energielabel op,\n\nVia uw website kreeg ik een indicatief label D voor onze woning. Graag ontvang ik een offerte voor een officiële meting.\n\nMet vriendelijke groet,\nSietske de Boer',
  },
];

export const SEED_NOTES: Note[] = [
  { id: 'n1', propertyId: 'fonteinstraat', authorId: 'bram', author: 'Bram de Vries', text: 'Bewoner was aanwezig bij de opname, alles verliep vlot. NTA 8800-berekening kan gestart worden.', ts: '14-03-2026 · 10:12' },
  { id: 'n2', propertyId: 'dekamp', authorId: 'femke', author: 'Femke Dijkstra', text: 'Label berekend, wacht nog op akkoord klant voor verzending.', ts: '25-08-2026 · 15:40' },
  { id: 'n3', propertyId: 'hoofdstraat', authorId: 'bram', author: 'Bram de Vries', text: 'Plattegrond in verwerking. Dakisolatie nog navragen bij de bewoner voor de berekening.', ts: '02-09-2026 · 09:05' },
  { id: 'n4', propertyId: 'monsmastate', authorId: 'sanne', author: 'Sanne Visser', text: "Mooie serie foto's binnen, meteen door naar verwerking.", ts: '09-06-2026 · 14:22' },
];
