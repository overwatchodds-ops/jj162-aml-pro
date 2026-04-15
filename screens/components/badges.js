// Risk rating badge — coloured pill showing High / Medium / Low
export function ratingBadge(rating) {
  if (!rating) return '<span style="font-size:11px;color:var(--color-text-muted);font-style:italic;">Not yet calculated</span>';
  const bg  = rating === 'High' ? '#fef2f2' : rating === 'Medium' ? '#fffbeb' : '#f0fdf4';
  const col = rating === 'High' ? '#991b1b' : rating === 'Medium' ? '#92400e' : '#166534';
  return `<span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px;background:${bg};color:${col};">${rating}</span>`;
}
