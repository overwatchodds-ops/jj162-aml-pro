// Info button — small indigo (i) button that toggles a tooltip by id
export function infoBtn(id) {
  return `<button type="button" onclick="var t=document.getElementById('${id}');t.style.display=t.style.display==='block'?'none':'block'"
    style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:var(--color-primary);color:#fff;font-size:9px;font-weight:700;cursor:pointer;flex-shrink:0;border:none;">i</button>`;
}

// Info popover — dark tooltip panel hidden by default, toggled by infoBtn
export function infoPop(id, content) {
  return `<div id="${id}" style="display:none;background:#1e293b;color:#e2e8f0;border-radius:10px;padding:14px 16px;font-size:11px;line-height:1.6;margin-top:6px;">${content}</div>`;
}
