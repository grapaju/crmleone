// util de formatação de datas usado pelos componentes
export function formatDateForCard(date) {
  if (!date) return 'Não informado';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    const parts = date.slice(0,10).split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(date);
}
