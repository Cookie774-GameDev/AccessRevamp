import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const inventory = await fs.readFile(path.join(root, "evidence", "text-inventory.txt"), "utf8");

const sourceCopy = `
Home Catalog Shop Collection Shop Now Our Promise
Your beauty ritual starts here
Glow Naturally Feel Beautiful
Curated beauty tools and skincare essentials to elevate your daily self-care Simple Effective Beautiful
Shipping At Checkout Clear Return Policy Support First
Skincare Lip Care Tools Hair Care Curated for you Our Collection
Limited Time Offer Use Code URBEAUTYPROMO15 for off your entire order
Enjoy off your first order with code
Self-Cleaning Hair Brush Microcurrent Device 7-in-1 3pc 1pc
Beauty Essentials Chosen With Care
Curated Selection
We focus on simple beauty tools and self-care essentials that fit naturally into everyday routines
Clear Store Policies
Shipping returns privacy and terms are linked in the footer so shoppers can review the details before ordering
Questions about an order or product Contact us before checkout or after delivery and we will help you find the right next step
Stay Connected Join the UrBeauty Family
Be the first to know about new arrivals exclusive deals and beauty tips No spam ever
Curated beauty essentials for your daily glow ritual
support urbeauty store
All rights reserved
Face Lifting EMS Microcurrent Electric Makeup Brush Cleaner Machine
Invisible Hydrocolloid Pimple Patches Pcs
Facial Neck Skin Care Massage
Octopus Head Massager Scalp
Retractable Silicone Ice Roller Set Bundle Mold
`;
const evaluationCopy = `
Homepage Reveal evaluation Cinematic Scroll evaluation Concept
Ritual Shelf Color Cabinet Quiet Utility Orbit Ribbon
Ur Beauty
`;

const visibleInventory = inventory.replace(/^===== .* =====$/gm, "");
const words = (value) => (value.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) || [])
  .filter((word) => !/^\d+$/.test(word));
const allowed = new Set(words(`${sourceCopy}\n${evaluationCopy}`));
const checkedWords = words(visibleInventory);
const unknown = [...new Set(checkedWords.filter((word) => !allowed.has(word)))].sort();
const exceptions = [
  "7-in-1",
  "EMS",
  "Hydrocolloid",
  "Microcurrent",
  "Pcs",
  "Self-Cleaning",
  "URBEAUTYPROMO15",
  "UrBeauty"
];
const report = {
  method: "DOM/OCR-like visible-text inventory tokenized and compared against exact public-store source vocabulary plus clearly separated evaluation labels.",
  inventory_file: "evidence/text-inventory.txt",
  checked_word_count: checkedWords.length,
  unique_checked_word_count: new Set(checkedWords).size,
  unknown_tokens: unknown,
  accepted_brand_and_catalog_exceptions: exceptions,
  pass: unknown.length === 0,
  limitation: "This validates editable visible text against the approved source vocabulary. It does not OCR lettering already embedded in exact, unaltered product photographs."
};
await fs.writeFile(path.join(root, "evidence", "spellcheck.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
