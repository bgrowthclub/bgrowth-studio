// The PDFs found in the Wix site's Media (read 11/10/2026) — imported once
// into the library with "Import from Wix". Exact duplicates are skipped by
// the server (same checksum), so repeated names are fine here. The folder
// follows the file's code (CHK = checklist, GUD = guide, ...).
export interface WixFile {
  name: string;
  url: string;
  folder: string;
}

const BASE = 'https://e44f0c6e-72b6-484b-b8bd-f780655d51a8.usrfiles.com/ugd/90d649_';

const RAW: [string, string][] = [
  ['CERTIFICATE OF ACKNOWLEDGMENT - LEGAL B&W.pdf', 'c974639a70aa49b0870d4f043bfa61be'],
  ['JURAT CERTIFICATE (B&W).pdf', '92b7d4abf82a46f38d5abd1244afe66d'],
  ['GENERAL POA_GREEN_PDF.pdf', '87f75fe1547040298635694390d35779'],
  ['CHK-NOT-001 BGrowthClub Starting Your Notary Journey RoadMap.pdf', '001b0a004a60478c82d586ab3596ccd8'],
  ['CHK-DRV-001 BGrowthClub Driver Equipment Checklist.pdf', '3a7d79a415cc403ab9d8c99236459f43'],
  ['BGrowth Club - NOTARY CHECKLISTS.pdf', '6c3f5fb14dd24743a19756762eab7516'],
  ['BGrowth Club - NOTARY CHECKLISTS (2).pdf', '97d409f77b4d45879d2cf7ce9927ff30'],
  ['PLN-DRV-001.pdf', 'f7c2ebb2995d4d459650ad02e34f1e98'],
  ['BGrowth Club - NOTARY CHECKLISTS (3).pdf', 'beea163c35ad479696f2cda7e4c6e02e'],
  ['CHK-NOT-007 BGrowthClub Attention to Detail Sucess Checklist.pdf', '056609df73154f6aae0be440c038cec3'],
  ['PLN-NOT-001 BGrowthClub Beginner Notary Roadmap Planner.pdf', 'ee515622b85f40018a3b9496212e7c98'],
  ['CHK-NOT-010 BGrowthClub Notary Self-Assessment Checklist.pdf', '29ffde7971f64b53b1090b42e310e62c'],
  ['CHK-NOT-009 BGrowthClub Fraud Awareness Quick Checklist.pdf', '82e5c32f9275433ab8d1ba3d9736a015'],
  ['GUD-NOT-003 BGrowthClub Notary Basic Glossary Terms Guide.pdf', '48f70bd797f2458ab0c49768e5a56fb9'],
  ['GUD-NOT-002 BGrowthClub Sacm Red Flags Quick Guide.pdf', '80f6e4f61cc4404c88e0385c5c55a87a'],
  ['GUD-NOT-001 BGrowthClub Professional Ethics & Boundaries Quick Guide.pdf', 'e93711c9efdd4522a1d7bea0cd49a1cc'],
  ['CHK-NOT-006 BGrowthClub Proffesional Client Experience Checklist.pdf', '0be98af5ed7b4a3f9884070d88b4488c'],
  ['CHK-NOT-007 BGrowthClub Attention to Detail Sucess Checklist (2).pdf', '524f23af24f847f3a4b52213257f4cf2'],
  ['CHK-NOT-005 BGrowthClub Proffesional Client Experience Checklist.pdf', 'b052e6b7a8fe4733a9b3f0cd0013e22e'],
  ['WST-NOT-001 - BGrowthClub Lifestyle Compatibility Self-Assessment Worksheet.pdf', '3912dfcd36204d6a983fd12cd6deb1d5'],
  ['CHK-NOT-001 BGrowthClub Starting Your Notary Journey RoadMap (2).pdf', '0f3d75973d534a5c99084a3ea38c61cc'],
  ['PROVIDER - AYA.pdf', 'c62137969fe6465592f1cdc14c712c11'],
];

function folderFor(name: string) {
  const n = name.toUpperCase();
  if (n.includes('CERTIFICATE') || n.includes('POA')) return 'Certificates';
  if (n.startsWith('CHK-') || n.includes('CHECKLISTS')) return 'Checklists';
  if (n.startsWith('GUD-')) return 'Guides';
  if (n.startsWith('PLN-')) return 'Planners';
  if (n.startsWith('WST-')) return 'Worksheets';
  return 'Wix – to review';
}

export const WIX_FILES: WixFile[] = RAW.map(([name, id]) => ({ name, url: `${BASE}${id}.pdf`, folder: folderFor(name) }));
