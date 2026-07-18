import sample from '../../tests/fixtures/sample-report.json' with { type: 'json' };
import { shell } from '../components/shell.js';
import { reportPage } from '../report/report-page.js';
export function sampleReportPage(){return shell(`<section class="section report-route"><div class="container-wide">${reportPage(sample)}<p><a class="button" href="/pricing" data-nav>Get the $50 Homepage Reveal</a></p></div></section>`,{pathname:'/sample-report'});}
