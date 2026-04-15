import { ratingBadge } from './badges.js';

// Rating row — displays an auto-calculated risk rating with optional override UI
export function ratingRow(label, auto, override, overrideKey, justKey, scopeVal) {
  const isOverridden = !!override && override !== auto;
  return `
    <div style="border:0.5px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-4);margin-bottom:var(--space-3);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">
        <span style="font-size:10px;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;">${label}</span>
        <div style="display:flex;align-items:center;gap:var(--space-2);">
          ${auto
            ? `<span style="font-size:11px;color:var(--color-text-muted);">Auto:</span> ${ratingBadge(auto)}`
            : `<span style="font-size:11px;color:var(--color-text-muted);font-style:italic;">Complete selections above</span>`}
          ${auto && !isOverridden
            ? `<button type="button" onclick="startOverride('${overrideKey}','${justKey}')"
                style="font-size:11px;color:var(--color-primary);background:none;border:none;cursor:pointer;text-decoration:underline;margin-left:4px;">Override</button>`
            : ''}
        </div>
      </div>
      ${isOverridden ? `
        <div style="background:#fffbeb;border:0.5px solid #fde68a;border-radius:8px;padding:var(--space-3);margin-top:var(--space-2);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">
            <span style="font-size:11px;font-weight:600;color:#92400e;">Override applied: ${ratingBadge(override)}</span>
            <button type="button" onclick="clearOverride('${overrideKey}','${justKey}')"
              style="font-size:11px;color:var(--color-text-muted);background:none;border:none;cursor:pointer;">Remove override</button>
          </div>
          <label style="font-size:11px;color:#92400e;display:block;margin-bottom:4px;">Justification (required for audit trail)</label>
          <textarea class="inp" rows="2" style="font-size:12px;"
            placeholder="Explain why your professional judgement differs…"
            onchange="scopeField('${justKey}',this.value)">${scopeVal || ''}</textarea>
        </div>` : ''}
      ${auto && !isOverridden
        ? `<p style="font-size:11px;color:var(--color-text-muted);font-style:italic;margin-top:var(--space-2);">System-derived from your selections, aligned with AUSTRAC guidance.</p>`
        : ''}
    </div>`;
}
