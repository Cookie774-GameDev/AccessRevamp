import { accountProjectsPage } from './account-projects.js';

export function dashboardPage() {
  return accountProjectsPage({ pathname: '/dashboard' });
}
