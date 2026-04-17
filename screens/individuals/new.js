import { S } from '../../state/index.js';
import { renderIdentityTab, handleIdentitySave } from './identity.js';

export function screen() {
  const activeTab = S.currentParams?.tab || 'identity';

  return `
    <div class="screen-narrow">
      <h1 class="screen-title">Staff Onboarding</h1>
      <div class="tab-content">
        ${activeTab === 'identity' ? renderIdentityTab() : '<p>Other tabs coming soon...</p>'}
      </div>
      <div class="mt-4">
        <button onclick="handleIdentitySave().then(ok => ok && go('staff'))" class="btn">Save & Exit</button>
      </div>
    </div>`;
}
